import "server-only";

import { getDb, type MinimalD1Database } from "../db/client";
import { getAuthPermissions } from "./permissions";
import { getSessionCookieName, hashSessionToken } from "./session";
import type { AuthContext } from "../types";
import type { Organization, OrganizationMembership, User } from "../db/types";

export class AuthError extends Error {
  readonly status = 401;

  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthError";
  }
}

export class PermissionError extends Error {
  readonly status = 403;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "PermissionError";
  }
}

export class SubscriptionReadOnlyError extends Error {
  readonly status = 403;

  constructor(
    message = "Your subscription is not current. Editing and automations are disabled until billing is updated.",
  ) {
    super(message);
    this.name = "SubscriptionReadOnlyError";
  }
}

export function makeAuthErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthError || error instanceof PermissionError || error instanceof SubscriptionReadOnlyError) {
    return Response.json({ ok: false, message: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    return Response.json({ ok: false, message: error.message || fallbackMessage }, { status: 500 });
  }

  return Response.json({ ok: false, message: fallbackMessage }, { status: 500 });
}

interface AuthRow {
  session_id: string;
  session_user_id: string;
  session_token_hash: string;
  session_expires_at: string;
  session_revoked_at: string | null;
  session_created_at: string;
  session_last_seen_at: string | null;
  session_user_agent: string | null;
  session_ip_hash: string | null;
  user_id: string;
  user_email: string;
  user_email_normalized: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_display_name: string | null;
  user_password_hash: string | null;
  user_password_salt: string | null;
  user_password_iters: number | null;
  user_password_algo: string | null;
  user_email_verified_at: string | null;
  user_status: User["status"];
  user_created_at: string;
  user_updated_at: string;
  user_last_login_at: string | null;
  membership_id: string;
  membership_organization_id: string;
  membership_user_id: string;
  membership_role: OrganizationMembership["role"];
  membership_status: OrganizationMembership["status"];
  membership_invited_by_user_id: string | null;
  membership_joined_at: string | null;
  membership_removed_at: string | null;
  membership_removed_by_user_id: string | null;
  membership_created_at: string;
  membership_updated_at: string;
  organization_id: string;
  organization_name: string | null;
  organization_slug: string | null;
  organization_stripe_customer_id: string | null;
  organization_stripe_subscription_id: string | null;
  organization_stripe_checkout_session_id: string | null;
  organization_subscription_status: Organization["subscription_status"];
  organization_plan_key: string | null;
  organization_readonly_reason: string | null;
  organization_created_at: string;
  organization_updated_at: string;
}

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

function mapAuthRow(row: AuthRow): AuthContext {
  const user: User = {
    id: row.user_id,
    email: row.user_email,
    email_normalized: row.user_email_normalized,
    first_name: row.user_first_name,
    last_name: row.user_last_name,
    display_name: row.user_display_name,
    password_hash: row.user_password_hash,
    password_salt: row.user_password_salt,
    password_iters: row.user_password_iters,
    password_algo: row.user_password_algo,
    email_verified_at: row.user_email_verified_at,
    status: row.user_status,
    created_at: row.user_created_at,
    updated_at: row.user_updated_at,
    last_login_at: row.user_last_login_at,
  };

  const organization: Organization = {
    id: row.organization_id,
    name: row.organization_name,
    slug: row.organization_slug,
    stripe_customer_id: row.organization_stripe_customer_id,
    stripe_subscription_id: row.organization_stripe_subscription_id,
    stripe_checkout_session_id: row.organization_stripe_checkout_session_id,
    subscription_status: row.organization_subscription_status,
    plan_key: row.organization_plan_key,
    readonly_reason: row.organization_readonly_reason,
    created_at: row.organization_created_at,
    updated_at: row.organization_updated_at,
  };

  const membership: OrganizationMembership = {
    id: row.membership_id,
    organization_id: row.membership_organization_id,
    user_id: row.membership_user_id,
    role: row.membership_role,
    status: row.membership_status,
    invited_by_user_id: row.membership_invited_by_user_id,
    joined_at: row.membership_joined_at,
    removed_at: row.membership_removed_at,
    removed_by_user_id: row.membership_removed_by_user_id,
    created_at: row.membership_created_at,
    updated_at: row.membership_updated_at,
  };

  const permissions = getAuthPermissions(organization.subscription_status);

  return {
    user,
    organization,
    membership,
    isOwner: membership.role === "owner",
    ...permissions,
  };
}

async function touchSession(db: MinimalD1Database, sessionId: string) {
  await db
    .prepare("UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(sessionId)
    .run();
}

export async function getAuthContextFromRequest(
  request: Request,
  env: { DB?: MinimalD1Database | null },
): Promise<AuthContext | null> {
  const rawToken = parseCookieValue(request.headers.get("cookie"), getSessionCookieName());
  if (!rawToken) {
    return null;
  }

  const tokenHash = await hashSessionToken(rawToken);
  const db = getDb(env);
  const row = await db
    .prepare<AuthRow>(
      `
        SELECT
          s.id AS session_id,
          s.user_id AS session_user_id,
          s.session_token_hash,
          s.expires_at AS session_expires_at,
          s.revoked_at AS session_revoked_at,
          s.created_at AS session_created_at,
          s.last_seen_at AS session_last_seen_at,
          s.user_agent AS session_user_agent,
          s.ip_hash AS session_ip_hash,
          u.id AS user_id,
          u.email AS user_email,
          u.email_normalized AS user_email_normalized,
          u.first_name AS user_first_name,
          u.last_name AS user_last_name,
          u.display_name AS user_display_name,
          u.password_hash AS user_password_hash,
          u.password_salt AS user_password_salt,
          u.password_iters AS user_password_iters,
          u.password_algo AS user_password_algo,
          u.email_verified_at AS user_email_verified_at,
          u.status AS user_status,
          u.created_at AS user_created_at,
          u.updated_at AS user_updated_at,
          u.last_login_at AS user_last_login_at,
          m.id AS membership_id,
          m.organization_id AS membership_organization_id,
          m.user_id AS membership_user_id,
          m.role AS membership_role,
          m.status AS membership_status,
          m.invited_by_user_id AS membership_invited_by_user_id,
          m.joined_at AS membership_joined_at,
          m.removed_at AS membership_removed_at,
          m.removed_by_user_id AS membership_removed_by_user_id,
          m.created_at AS membership_created_at,
          m.updated_at AS membership_updated_at,
          o.id AS organization_id,
          o.name AS organization_name,
          o.slug AS organization_slug,
          o.stripe_customer_id AS organization_stripe_customer_id,
          o.stripe_subscription_id AS organization_stripe_subscription_id,
          o.stripe_checkout_session_id AS organization_stripe_checkout_session_id,
          o.subscription_status AS organization_subscription_status,
          o.plan_key AS organization_plan_key,
          o.readonly_reason AS organization_readonly_reason,
          o.created_at AS organization_created_at,
          o.updated_at AS organization_updated_at
        FROM sessions s
        INNER JOIN users u ON u.id = s.user_id
        INNER JOIN organization_memberships m ON m.user_id = u.id
        INNER JOIN organizations o ON o.id = m.organization_id
        WHERE s.session_token_hash = ?
          AND s.revoked_at IS NULL
          AND s.expires_at > CURRENT_TIMESTAMP
          AND u.status = 'active'
          AND m.status = 'active'
        ORDER BY COALESCE(m.joined_at, m.created_at) DESC
        LIMIT 1
      `,
    )
    .bind(tokenHash)
    .first();

  if (!row) {
    return null;
  }

  await touchSession(db, row.session_id);
  return mapAuthRow(row);
}

export async function requireAuth(
  request: Request,
  env: { DB?: MinimalD1Database | null },
): Promise<AuthContext> {
  const auth = await getAuthContextFromRequest(request, env);
  if (!auth) {
    throw new AuthError();
  }

  return auth;
}

export async function requireOwner(
  request: Request,
  env: { DB?: MinimalD1Database | null },
  message = "Only owners can perform this action.",
): Promise<AuthContext> {
  const auth = await requireAuth(request, env);
  if (!auth.isOwner) {
    throw new PermissionError(message);
  }

  return auth;
}

export async function requireWritableSubscription(
  request: Request,
  env: { DB?: MinimalD1Database | null },
): Promise<AuthContext> {
  const auth = await requireAuth(request, env);
  if (!auth.canWrite) {
    throw new SubscriptionReadOnlyError();
  }

  return auth;
}

import "server-only";

import type { MinimalD1Database } from "../client";
import type { AuthContext } from "../../types";
import type {
  MembershipRole,
  Organization,
  OrganizationInvite,
  OrganizationMembership,
  User,
} from "../../db/types";
import { createPrefixedId } from "../../auth/tokens";

export interface OrganizationUserRow {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  role: MembershipRole;
  status: OrganizationMembership["status"];
  joinedAt: string | null;
  createdAt: string;
  removedAt: string | null;
  removedByUserId: string | null;
}

export interface PendingInviteRow {
  inviteId: string;
  email: string;
  role: MembershipRole;
  expiresAt: string;
  createdAt: string;
  invitedByUserId: string;
}

function mapUserRow(row: Record<string, unknown>): OrganizationUserRow {
  return {
    membershipId: String(row.membershipId),
    userId: String(row.userId),
    email: String(row.email),
    firstName: (row.firstName as string | null) ?? null,
    lastName: (row.lastName as string | null) ?? null,
    displayName: (row.displayName as string | null) ?? null,
    role: row.role as MembershipRole,
    status: row.status as OrganizationMembership["status"],
    joinedAt: (row.joinedAt as string | null) ?? null,
    createdAt: String(row.createdAt),
    removedAt: (row.removedAt as string | null) ?? null,
    removedByUserId: (row.removedByUserId as string | null) ?? null,
  };
}

function mapInviteRow(row: Record<string, unknown>): PendingInviteRow {
  return {
    inviteId: String(row.inviteId),
    email: String(row.email),
    role: row.role as MembershipRole,
    expiresAt: String(row.expiresAt),
    createdAt: String(row.createdAt),
    invitedByUserId: String(row.invitedByUserId),
  };
}

export async function getCompanySettingsContext(db: MinimalD1Database, authContext: AuthContext) {
  const organization = await getOrganizationById(db, authContext.organization.id);
  return {
    organization,
    membership: authContext.membership,
    permissions: {
      canRead: authContext.canRead,
      canWrite: authContext.canWrite,
      canUseAutomations: authContext.canUseAutomations,
      isOwner: authContext.isOwner,
    },
  };
}

export async function listOrganizationUsers(db: MinimalD1Database, organizationId: string) {
  const result = await db
    .prepare(
      `
        SELECT
          m.id AS membershipId,
          u.id AS userId,
          u.email AS email,
          u.first_name AS firstName,
          u.last_name AS lastName,
          u.display_name AS displayName,
          m.role AS role,
          m.status AS status,
          m.joined_at AS joinedAt,
          m.created_at AS createdAt,
          m.removed_at AS removedAt,
          m.removed_by_user_id AS removedByUserId
        FROM organization_memberships m
        INNER JOIN users u ON u.id = m.user_id
        WHERE m.organization_id = ?
        ORDER BY u.email ASC
      `,
    )
    .bind(organizationId)
    .all<Record<string, unknown>>();

  return (result.results ?? []).map(mapUserRow);
}

export async function listActiveMemberships(db: MinimalD1Database, organizationId: string) {
  return (await listOrganizationUsers(db, organizationId)).filter((user) => user.status === "active");
}

export async function listInactiveMemberships(db: MinimalD1Database, organizationId: string) {
  return (await listOrganizationUsers(db, organizationId)).filter((user) => user.status === "removed");
}

export async function listPendingInvites(db: MinimalD1Database, organizationId: string) {
  const result = await db
    .prepare(
      `
        SELECT
          id AS inviteId,
          email AS email,
          role AS role,
          expires_at AS expiresAt,
          created_at AS createdAt,
          invited_by_user_id AS invitedByUserId
        FROM organization_invites
        WHERE organization_id = ?
          AND accepted_at IS NULL
          AND revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
      `,
    )
    .bind(organizationId)
    .all<Record<string, unknown>>();

  return (result.results ?? []).map(mapInviteRow);
}

export async function findMembershipById(db: MinimalD1Database, membershipId: string) {
  return db
    .prepare<OrganizationMembership>("SELECT * FROM organization_memberships WHERE id = ? LIMIT 1")
    .bind(membershipId)
    .first();
}

export async function findMembershipByOrganizationAndUser(
  db: MinimalD1Database,
  organizationId: string,
  userId: string,
) {
  return db
    .prepare<OrganizationMembership>(
      "SELECT * FROM organization_memberships WHERE organization_id = ? AND user_id = ? LIMIT 1",
    )
    .bind(organizationId, userId)
    .first();
}

export async function findUserByNormalizedEmail(db: MinimalD1Database, emailNormalized: string) {
  return db
    .prepare<User>("SELECT * FROM users WHERE email_normalized = ? LIMIT 1")
    .bind(emailNormalized)
    .first();
}

export async function createInvite(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    email: string;
    emailNormalized: string;
    role: MembershipRole;
    tokenHash: string;
    expiresAt: string;
    invitedByUserId: string;
  },
) {
  const id = createPrefixedId("inv_");
  await db
    .prepare(
      `
        INSERT INTO organization_invites (
          id, organization_id, email, email_normalized, role, token_hash,
          expires_at, invited_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      id,
      input.organizationId,
      input.email,
      input.emailNormalized,
      input.role,
      input.tokenHash,
      input.expiresAt,
      input.invitedByUserId,
    )
    .run();

  return id;
}

export async function findInviteByTokenHash(db: MinimalD1Database, tokenHash: string) {
  return db
    .prepare<OrganizationInvite>("SELECT * FROM organization_invites WHERE token_hash = ? LIMIT 1")
    .bind(tokenHash)
    .first();
}

export async function findInviteById(db: MinimalD1Database, inviteId: string) {
  return db
    .prepare<OrganizationInvite>("SELECT * FROM organization_invites WHERE id = ? LIMIT 1")
    .bind(inviteId)
    .first();
}

export async function revokeInvite(db: MinimalD1Database, inviteId: string) {
  await db
    .prepare(
      `
        UPDATE organization_invites
        SET revoked_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(inviteId)
    .run();
}

export async function markInviteAccepted(
  db: MinimalD1Database,
  inviteId: string,
  acceptedByUserId: string,
) {
  await db
    .prepare(
      `
        UPDATE organization_invites
        SET accepted_at = CURRENT_TIMESTAMP,
            accepted_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(acceptedByUserId, inviteId)
    .run();
}

export async function createUserForInvite(
  db: MinimalD1Database,
  input: {
    email: string;
    emailNormalized: string;
    firstName: string;
    lastName: string;
    displayName: string;
    passwordHash: string;
    passwordSalt: string;
    passwordIters: number;
    passwordAlgo: string;
  },
) {
  const id = createPrefixedId("user_");
  await db
    .prepare(
      `
        INSERT INTO users (
          id, email, email_normalized, first_name, last_name, display_name,
          password_hash, password_salt, password_iters, password_algo, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      id,
      input.email,
      input.emailNormalized,
      input.firstName,
      input.lastName,
      input.displayName,
      input.passwordHash,
      input.passwordSalt,
      input.passwordIters,
      input.passwordAlgo,
    )
    .run();

  return id;
}

export async function createOrReactivateMembership(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    userId: string;
    role: MembershipRole;
    invitedByUserId?: string | null;
  },
) {
  const existing = await findMembershipByOrganizationAndUser(db, input.organizationId, input.userId);
  if (existing) {
    await db
      .prepare(
        `
          UPDATE organization_memberships
          SET role = ?,
              status = 'active',
              removed_at = NULL,
              removed_by_user_id = NULL,
              joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .bind(input.role, existing.id)
      .run();

    return existing.id;
  }

  const id = createPrefixedId("mem_");
  await db
    .prepare(
      `
        INSERT INTO organization_memberships (
          id, organization_id, user_id, role, status, invited_by_user_id, joined_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    )
    .bind(id, input.organizationId, input.userId, input.role, input.invitedByUserId ?? null)
    .run();

  return id;
}

export async function removeMembership(
  db: MinimalD1Database,
  membershipId: string,
  removedByUserId: string,
) {
  await db
    .prepare(
      `
        UPDATE organization_memberships
        SET status = 'removed',
            removed_at = CURRENT_TIMESTAMP,
            removed_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(removedByUserId, membershipId)
    .run();
}

export async function reactivateMembership(db: MinimalD1Database, membershipId: string) {
  await db
    .prepare(
      `
        UPDATE organization_memberships
        SET status = 'active',
            removed_at = NULL,
            removed_by_user_id = NULL,
            joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(membershipId)
    .run();
}

export async function updateMembershipRole(
  db: MinimalD1Database,
  membershipId: string,
  role: MembershipRole,
) {
  await db
    .prepare(
      `
        UPDATE organization_memberships
        SET role = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(role, membershipId)
    .run();
}

export async function countActiveOwners(db: MinimalD1Database, organizationId: string) {
  const row = await db
    .prepare<{ ownerCount: number }>(
      `
        SELECT COUNT(*) AS ownerCount
        FROM organization_memberships
        WHERE organization_id = ?
          AND status = 'active'
          AND role = 'owner'
      `,
    )
    .bind(organizationId)
    .first();

  return Number(row?.ownerCount ?? 0);
}

export async function getOrganizationById(db: MinimalD1Database, organizationId: string) {
  return db
    .prepare<Organization>("SELECT * FROM organizations WHERE id = ? LIMIT 1")
    .bind(organizationId)
    .first();
}

export async function updateOrganizationName(db: MinimalD1Database, organizationId: string, name: string, slug: string | null) {
  await db
    .prepare(
      `
        UPDATE organizations
        SET name = ?,
            slug = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(name, slug, organizationId)
    .run();
}

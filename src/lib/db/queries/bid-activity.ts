import "server-only";

import type { MinimalD1Database } from "../client";
import type { BidActivityLog, BidStatus } from "../../db/types";
import { createPrefixedId } from "../../auth/tokens";

export interface BidActivityListRow extends BidActivityLog {
  user_display_name: string | null;
  user_email: string | null;
}

function mapBidActivityListRow(row: Record<string, unknown>): BidActivityListRow {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    bid_id: String(row.bid_id),
    user_id: (row.user_id as string | null) ?? null,
    action: String(row.action),
    field_name: (row.field_name as string | null) ?? null,
    old_value: (row.old_value as string | null) ?? null,
    new_value: (row.new_value as string | null) ?? null,
    message: (row.message as string | null) ?? null,
    metadata_json: (row.metadata_json as string | null) ?? null,
    created_at: String(row.created_at),
    user_display_name: (row.user_display_name as string | null) ?? null,
    user_email: (row.user_email as string | null) ?? null,
  };
}

function stringifyMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata) {
    return null;
  }

  return JSON.stringify(metadata);
}

export async function listBidActivity(
  db: MinimalD1Database,
  organizationId: string,
  bidId: string,
) {
  const result = await db
    .prepare(
      `
        SELECT
          a.id,
          a.organization_id,
          a.bid_id,
          a.user_id,
          a.action,
          a.field_name,
          a.old_value,
          a.new_value,
          a.message,
          a.metadata_json,
          a.created_at,
          u.display_name AS user_display_name,
          u.email AS user_email
        FROM bid_activity_log a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE a.organization_id = ?
          AND a.bid_id = ?
        ORDER BY a.created_at DESC, a.id DESC
      `,
    )
    .bind(organizationId, bidId)
    .all<Record<string, unknown>>();

  return (result.results ?? []).map(mapBidActivityListRow);
}

export async function createBidActivity(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    bidId: string;
    userId?: string | null;
    action: string;
    fieldName?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const id = createPrefixedId("bidact_");

  await db
    .prepare(
      `
        INSERT INTO bid_activity_log (
          id,
          organization_id,
          bid_id,
          user_id,
          action,
          field_name,
          old_value,
          new_value,
          message,
          metadata_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      id,
      input.organizationId,
      input.bidId,
      input.userId ?? null,
      input.action,
      input.fieldName ?? null,
      input.oldValue ?? null,
      input.newValue ?? null,
      input.message ?? null,
      stringifyMetadata(input.metadata),
    )
    .run();

  return db
    .prepare<BidActivityLog>(
      `
        SELECT *
        FROM bid_activity_log
        WHERE organization_id = ?
          AND id = ?
        LIMIT 1
      `,
    )
    .bind(input.organizationId, id)
    .first();
}

export async function logBidCreated(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    bidId: string;
    userId: string;
    message?: string | null;
  },
) {
  return createBidActivity(db, {
    organizationId: input.organizationId,
    bidId: input.bidId,
    userId: input.userId,
    action: "bid_created",
    message: input.message ?? "Bid created",
  });
}

export async function logBidFieldChange(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    bidId: string;
    userId: string;
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    message?: string | null;
  },
) {
  return createBidActivity(db, {
    organizationId: input.organizationId,
    bidId: input.bidId,
    userId: input.userId,
    action: "field_changed",
    fieldName: input.fieldName,
    oldValue: input.oldValue,
    newValue: input.newValue,
    message: input.message ?? `${input.fieldName} updated`,
  });
}

export async function logBidStatusChange(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    bidId: string;
    userId: string;
    oldStatus: BidStatus;
    newStatus: BidStatus;
  },
) {
  return createBidActivity(db, {
    organizationId: input.organizationId,
    bidId: input.bidId,
    userId: input.userId,
    action: "status_changed",
    fieldName: "status",
    oldValue: input.oldStatus,
    newValue: input.newStatus,
    message: `Status changed from ${input.oldStatus} to ${input.newStatus}`,
  });
}

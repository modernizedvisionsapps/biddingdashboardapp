import "server-only";

import type { MinimalD1Database } from "../client";
import type {
  Bid,
  BidContractor,
  BidContractorContact,
  BidListRow,
  BidStatus,
} from "../../db/types";
import { createPrefixedId } from "../../auth/tokens";
import { createBidActivity, logBidCreated, logBidFieldChange, logBidStatusChange } from "./bid-activity";

const BID_STATUS_VALUES = ["active", "pending_award", "awarded", "lost", "on_hold"] as const;

type BidSortBy =
  | "project_name"
  | "bid_amount_cents"
  | "contractor_name"
  | "date_submitted"
  | "last_followed_up_date"
  | "next_follow_up_date"
  | "status"
  | "updated_at"
  | "created_at";

type BidSortDirection = "asc" | "desc";

const BID_SORT_EXPRESSIONS: Record<BidSortBy, string> = {
  project_name: "b.project_name",
  bid_amount_cents: "b.bid_amount_cents",
  contractor_name: "c.name",
  date_submitted: "b.date_submitted",
  last_followed_up_date: "b.last_followed_up_date",
  next_follow_up_date: "b.next_follow_up_date",
  status: "b.status",
  updated_at: "b.updated_at",
  created_at: "b.created_at",
};

const BID_ACTIVITY_FIELD_LABELS: Record<string, string> = {
  project_name: "Project name",
  bid_amount_cents: "Bid amount",
  contractor_id: "Contractor",
  contact_id: "Contact",
  manual_contractor_name: "Manual contractor name",
  manual_contact_name: "Manual contact name",
  manual_contact_phone: "Manual contact phone",
  manual_contact_email: "Manual contact email",
  date_submitted: "Date submitted",
  last_followed_up_date: "Last followed up date",
  next_follow_up_date: "Next follow up date",
  notes: "Notes",
  responsible_user_id: "Responsible user",
};

function normalizeRequiredString(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function normalizeOptionalString(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalDateString(value: string | null | undefined) {
  return normalizeOptionalString(value);
}

function normalizeOptionalInteger(value: number | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (!Number.isFinite(value)) {
    throw new Error("bidAmountCents must be a finite number");
  }

  return Math.trunc(value);
}

function isBidStatus(value: string): value is BidStatus {
  return (BID_STATUS_VALUES as readonly string[]).includes(value);
}

function normalizeBidStatus(value: BidStatus | null | undefined, defaultStatus: BidStatus = "active") {
  if (value === undefined) {
    return defaultStatus;
  }

  if (value === null || !isBidStatus(value)) {
    throw new Error("Invalid bid status");
  }

  return value;
}

function mapBidListRow(row: Record<string, unknown>): BidListRow {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    project_name: String(row.project_name),
    bid_amount_cents: (row.bid_amount_cents as number | null) ?? null,
    contractor_id: (row.contractor_id as string | null) ?? null,
    contact_id: (row.contact_id as string | null) ?? null,
    manual_contractor_name: (row.manual_contractor_name as string | null) ?? null,
    manual_contact_name: (row.manual_contact_name as string | null) ?? null,
    manual_contact_phone: (row.manual_contact_phone as string | null) ?? null,
    manual_contact_email: (row.manual_contact_email as string | null) ?? null,
    date_submitted: (row.date_submitted as string | null) ?? null,
    last_followed_up_date: (row.last_followed_up_date as string | null) ?? null,
    next_follow_up_date: (row.next_follow_up_date as string | null) ?? null,
    status: row.status as BidStatus,
    notes: (row.notes as string | null) ?? null,
    responsible_user_id: (row.responsible_user_id as string | null) ?? null,
    created_by_user_id: (row.created_by_user_id as string | null) ?? null,
    updated_by_user_id: (row.updated_by_user_id as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    contractor_name: (row.contractor_name as string | null) ?? null,
    contact_first_name: (row.contact_first_name as string | null) ?? null,
    contact_last_name: (row.contact_last_name as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    contact_phone: (row.contact_phone as string | null) ?? null,
    responsible_user_display_name: (row.responsible_user_display_name as string | null) ?? null,
    created_by_display_name: (row.created_by_display_name as string | null) ?? null,
    updated_by_display_name: (row.updated_by_display_name as string | null) ?? null,
  };
}

function buildBidListOrderClause(sortBy?: string, sortDirection?: string) {
  if (!sortBy) {
    return `
      ORDER BY
        b.next_follow_up_date IS NULL ASC,
        b.next_follow_up_date ASC,
        b.date_submitted DESC,
        b.created_at DESC
    `;
  }

  if (!(sortBy in BID_SORT_EXPRESSIONS)) {
    throw new Error("Invalid bid sort field");
  }

  const direction = sortDirection?.toLowerCase() === "desc" ? "DESC" : "ASC";
  const expression = BID_SORT_EXPRESSIONS[sortBy as BidSortBy];

  return `
    ORDER BY
      ${expression} IS NULL ASC,
      ${expression} ${direction},
      b.created_at DESC
  `;
}

async function getBidRow(db: MinimalD1Database, organizationId: string, bidId: string) {
  return db
    .prepare<Bid>(
      `
        SELECT *
        FROM bids
        WHERE organization_id = ?
          AND id = ?
        LIMIT 1
      `,
    )
    .bind(organizationId, bidId)
    .first();
}

async function getBidContractorRow(
  db: MinimalD1Database,
  organizationId: string,
  contractorId: string,
) {
  return db
    .prepare<BidContractor>(
      `
        SELECT *
        FROM bid_contractors
        WHERE organization_id = ?
          AND id = ?
        LIMIT 1
      `,
    )
    .bind(organizationId, contractorId)
    .first();
}

async function getBidContactRow(
  db: MinimalD1Database,
  organizationId: string,
  contactId: string,
) {
  return db
    .prepare<BidContractorContact>(
      `
        SELECT *
        FROM bid_contractor_contacts
        WHERE organization_id = ?
          AND id = ?
        LIMIT 1
      `,
    )
    .bind(organizationId, contactId)
    .first();
}

async function requireActiveMembership(
  db: MinimalD1Database,
  organizationId: string,
  userId: string,
) {
  const membership = await db
    .prepare<{ id: string }>(
      `
        SELECT id
        FROM organization_memberships
        WHERE organization_id = ?
          AND user_id = ?
          AND status = 'active'
        LIMIT 1
      `,
    )
    .bind(organizationId, userId)
    .first();

  if (!membership) {
    throw new Error("Responsible user must have an active membership in the organization");
  }
}

async function requireBidContractor(
  db: MinimalD1Database,
  organizationId: string,
  contractorId: string,
) {
  const contractor = await getBidContractorRow(db, organizationId, contractorId);
  if (!contractor) {
    throw new Error("Contractor not found for organization");
  }

  return contractor;
}

async function requireBidContact(
  db: MinimalD1Database,
  organizationId: string,
  contactId: string,
) {
  const contact = await getBidContactRow(db, organizationId, contactId);
  if (!contact) {
    throw new Error("Contact not found for organization");
  }

  return contact;
}

async function validateBidRelations(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    contractorId?: string | null;
    contactId?: string | null;
    responsibleUserId?: string | null;
  },
) {
  let contractor: BidContractor | null = null;
  let contact: BidContractorContact | null = null;

  if (input.contractorId) {
    contractor = await requireBidContractor(db, input.organizationId, input.contractorId);
  }

  if (input.contactId) {
    contact = await requireBidContact(db, input.organizationId, input.contactId);
  }

  if (contractor && contact && contact.contractor_id !== contractor.id) {
    throw new Error("Contact does not belong to the selected contractor");
  }

  if (input.responsibleUserId) {
    await requireActiveMembership(db, input.organizationId, input.responsibleUserId);
  }

  return { contractor, contact };
}

async function logBidChanges(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    bidId: string;
    actorUserId: string;
    previous: Bid;
    next: Bid;
    changedColumns: string[];
  },
) {
  for (const column of input.changedColumns) {
    if (column === "status") {
      if (input.previous.status !== input.next.status) {
        await logBidStatusChange(db, {
          organizationId: input.organizationId,
          bidId: input.bidId,
          userId: input.actorUserId,
          oldStatus: input.previous.status,
          newStatus: input.next.status,
        });
      }
      continue;
    }

    const previousValue = input.previous[column as keyof Bid];
    const nextValue = input.next[column as keyof Bid];
    if (previousValue === nextValue) {
      continue;
    }

    await logBidFieldChange(db, {
      organizationId: input.organizationId,
      bidId: input.bidId,
      userId: input.actorUserId,
      fieldName: column,
      oldValue: previousValue === null ? null : String(previousValue),
      newValue: nextValue === null ? null : String(nextValue),
      message: `${BID_ACTIVITY_FIELD_LABELS[column] ?? column} updated`,
    });
  }
}

export async function listBids(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    status?: BidStatus | null;
    search?: string | null;
    contractorId?: string | null;
    responsibleUserId?: string | null;
    sortBy?: BidSortBy | null;
    sortDirection?: BidSortDirection | null;
  },
) {
  const where: string[] = ["b.organization_id = ?"];
  const values: unknown[] = [input.organizationId];

  if (input.status) {
    if (!isBidStatus(input.status)) {
      throw new Error("Invalid bid status");
    }

    where.push("b.status = ?");
    values.push(input.status);
  }

  if (input.contractorId) {
    where.push("b.contractor_id = ?");
    values.push(input.contractorId);
  }

  if (input.responsibleUserId) {
    where.push("b.responsible_user_id = ?");
    values.push(input.responsibleUserId);
  }

  const search = normalizeOptionalString(input.search);
  if (search) {
    const likeValue = `%${search}%`;
    where.push(`
      (
        b.project_name LIKE ?
        OR b.manual_contractor_name LIKE ?
        OR b.manual_contact_name LIKE ?
        OR b.notes LIKE ?
        OR c.name LIKE ?
      )
    `);
    values.push(likeValue, likeValue, likeValue, likeValue, likeValue);
  }

  const orderClause = buildBidListOrderClause(input.sortBy ?? undefined, input.sortDirection ?? undefined);

  const result = await db
    .prepare(
      `
        SELECT
          b.*,
          c.name AS contractor_name,
          ct.first_name AS contact_first_name,
          ct.last_name AS contact_last_name,
          ct.email AS contact_email,
          ct.phone AS contact_phone,
          ru.display_name AS responsible_user_display_name,
          cu.display_name AS created_by_display_name,
          uu.display_name AS updated_by_display_name
        FROM bids b
        LEFT JOIN bid_contractors c ON c.id = b.contractor_id
        LEFT JOIN bid_contractor_contacts ct ON ct.id = b.contact_id
        LEFT JOIN users ru ON ru.id = b.responsible_user_id
        LEFT JOIN users cu ON cu.id = b.created_by_user_id
        LEFT JOIN users uu ON uu.id = b.updated_by_user_id
        WHERE ${where.join(" AND ")}
        ${orderClause}
      `,
    )
    .bind(...values)
    .all<Record<string, unknown>>();

  return (result.results ?? []).map(mapBidListRow);
}

export async function getBidById(db: MinimalD1Database, organizationId: string, bidId: string) {
  const result = await db
    .prepare(
      `
        SELECT
          b.*,
          c.name AS contractor_name,
          ct.first_name AS contact_first_name,
          ct.last_name AS contact_last_name,
          ct.email AS contact_email,
          ct.phone AS contact_phone,
          ru.display_name AS responsible_user_display_name,
          cu.display_name AS created_by_display_name,
          uu.display_name AS updated_by_display_name
        FROM bids b
        LEFT JOIN bid_contractors c ON c.id = b.contractor_id
        LEFT JOIN bid_contractor_contacts ct ON ct.id = b.contact_id
        LEFT JOIN users ru ON ru.id = b.responsible_user_id
        LEFT JOIN users cu ON cu.id = b.created_by_user_id
        LEFT JOIN users uu ON uu.id = b.updated_by_user_id
        WHERE b.organization_id = ?
          AND b.id = ?
        LIMIT 1
      `,
    )
    .bind(organizationId, bidId)
    .first<Record<string, unknown>>();

  return result ? mapBidListRow(result) : null;
}

export async function createBid(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    projectName: string;
    bidAmountCents?: number | null;
    contractorId?: string | null;
    contactId?: string | null;
    manualContractorName?: string | null;
    manualContactName?: string | null;
    manualContactPhone?: string | null;
    manualContactEmail?: string | null;
    dateSubmitted?: string | null;
    lastFollowedUpDate?: string | null;
    nextFollowUpDate?: string | null;
    status?: BidStatus | null;
    notes?: string | null;
    responsibleUserId?: string | null;
    actorUserId: string;
  },
) {
  const id = createPrefixedId("bid_");
  const projectName = normalizeRequiredString(input.projectName, "projectName");
  const bidAmountCents = normalizeOptionalInteger(input.bidAmountCents);
  const contractorId = normalizeOptionalString(input.contractorId);
  const contactId = normalizeOptionalString(input.contactId);
  const manualContractorName = normalizeOptionalString(input.manualContractorName);
  const manualContactName = normalizeOptionalString(input.manualContactName);
  const manualContactPhone = normalizeOptionalString(input.manualContactPhone);
  const manualContactEmail = normalizeOptionalString(input.manualContactEmail);
  const dateSubmitted = normalizeOptionalDateString(input.dateSubmitted);
  const lastFollowedUpDate = normalizeOptionalDateString(input.lastFollowedUpDate);
  const nextFollowUpDate = normalizeOptionalDateString(input.nextFollowUpDate);
  const status = normalizeBidStatus(input.status);
  const notes = normalizeOptionalString(input.notes);
  const responsibleUserId = normalizeOptionalString(input.responsibleUserId);

  await validateBidRelations(db, {
    organizationId: input.organizationId,
    contractorId,
    contactId,
    responsibleUserId,
  });

  await db
    .prepare(
      `
        INSERT INTO bids (
          id,
          organization_id,
          project_name,
          bid_amount_cents,
          contractor_id,
          contact_id,
          manual_contractor_name,
          manual_contact_name,
          manual_contact_phone,
          manual_contact_email,
          date_submitted,
          last_followed_up_date,
          next_follow_up_date,
          status,
          notes,
          responsible_user_id,
          created_by_user_id,
          updated_by_user_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      id,
      input.organizationId,
      projectName,
      bidAmountCents ?? null,
      contractorId ?? null,
      contactId ?? null,
      manualContractorName ?? null,
      manualContactName ?? null,
      manualContactPhone ?? null,
      manualContactEmail ?? null,
      dateSubmitted ?? null,
      lastFollowedUpDate ?? null,
      nextFollowUpDate ?? null,
      status,
      notes ?? null,
      responsibleUserId ?? null,
      input.actorUserId,
      input.actorUserId,
    )
    .run();

  await logBidCreated(db, {
    organizationId: input.organizationId,
    bidId: id,
    userId: input.actorUserId,
  });

  return getBidById(db, input.organizationId, id);
}

export async function updateBid(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    bidId: string;
    projectName?: string | null;
    bidAmountCents?: number | null;
    contractorId?: string | null;
    contactId?: string | null;
    manualContractorName?: string | null;
    manualContactName?: string | null;
    manualContactPhone?: string | null;
    manualContactEmail?: string | null;
    dateSubmitted?: string | null;
    lastFollowedUpDate?: string | null;
    nextFollowUpDate?: string | null;
    status?: BidStatus | null;
    notes?: string | null;
    responsibleUserId?: string | null;
    actorUserId: string;
  },
) {
  const existing = await getBidRow(db, input.organizationId, input.bidId);
  if (!existing) {
    return null;
  }

  const assignments: string[] = [];
  const values: unknown[] = [];
  const changedColumns: string[] = [];

  if (input.projectName !== undefined) {
    assignments.push("project_name = ?");
    values.push(
      input.projectName === null
        ? normalizeRequiredString("", "projectName")
        : normalizeRequiredString(input.projectName, "projectName"),
    );
    changedColumns.push("project_name");
  }

  if (input.bidAmountCents !== undefined) {
    assignments.push("bid_amount_cents = ?");
    values.push(normalizeOptionalInteger(input.bidAmountCents));
    changedColumns.push("bid_amount_cents");
  }

  const contractorId = normalizeOptionalString(input.contractorId);
  if (input.contractorId !== undefined) {
    assignments.push("contractor_id = ?");
    values.push(contractorId);
    changedColumns.push("contractor_id");
  }

  const contactId = normalizeOptionalString(input.contactId);
  if (input.contactId !== undefined) {
    assignments.push("contact_id = ?");
    values.push(contactId);
    changedColumns.push("contact_id");
  }

  if (input.manualContractorName !== undefined) {
    assignments.push("manual_contractor_name = ?");
    values.push(normalizeOptionalString(input.manualContractorName));
    changedColumns.push("manual_contractor_name");
  }

  if (input.manualContactName !== undefined) {
    assignments.push("manual_contact_name = ?");
    values.push(normalizeOptionalString(input.manualContactName));
    changedColumns.push("manual_contact_name");
  }

  if (input.manualContactPhone !== undefined) {
    assignments.push("manual_contact_phone = ?");
    values.push(normalizeOptionalString(input.manualContactPhone));
    changedColumns.push("manual_contact_phone");
  }

  if (input.manualContactEmail !== undefined) {
    assignments.push("manual_contact_email = ?");
    values.push(normalizeOptionalString(input.manualContactEmail));
    changedColumns.push("manual_contact_email");
  }

  if (input.dateSubmitted !== undefined) {
    assignments.push("date_submitted = ?");
    values.push(normalizeOptionalDateString(input.dateSubmitted));
    changedColumns.push("date_submitted");
  }

  if (input.lastFollowedUpDate !== undefined) {
    assignments.push("last_followed_up_date = ?");
    values.push(normalizeOptionalDateString(input.lastFollowedUpDate));
    changedColumns.push("last_followed_up_date");
  }

  if (input.nextFollowUpDate !== undefined) {
    assignments.push("next_follow_up_date = ?");
    values.push(normalizeOptionalDateString(input.nextFollowUpDate));
    changedColumns.push("next_follow_up_date");
  }

  if (input.status !== undefined) {
    assignments.push("status = ?");
    values.push(normalizeBidStatus(input.status));
    changedColumns.push("status");
  }

  if (input.notes !== undefined) {
    assignments.push("notes = ?");
    values.push(normalizeOptionalString(input.notes));
    changedColumns.push("notes");
  }

  const responsibleUserId = normalizeOptionalString(input.responsibleUserId);
  if (input.responsibleUserId !== undefined) {
    assignments.push("responsible_user_id = ?");
    values.push(responsibleUserId);
    changedColumns.push("responsible_user_id");
  }

  const nextContractorId = input.contractorId !== undefined ? contractorId : existing.contractor_id;
  const nextContactId = input.contactId !== undefined ? contactId : existing.contact_id;
  const nextResponsibleUserId =
    input.responsibleUserId !== undefined ? responsibleUserId : existing.responsible_user_id;

  await validateBidRelations(db, {
    organizationId: input.organizationId,
    contractorId: nextContractorId,
    contactId: nextContactId,
    responsibleUserId: nextResponsibleUserId,
  });

  assignments.push("updated_by_user_id = ?");
  values.push(input.actorUserId);
  assignments.push("updated_at = CURRENT_TIMESTAMP");

  await db
    .prepare(
      `
        UPDATE bids
        SET ${assignments.join(", ")}
        WHERE organization_id = ?
          AND id = ?
      `,
    )
    .bind(...values, input.organizationId, input.bidId)
    .run();

  const updated = await getBidRow(db, input.organizationId, input.bidId);
  if (!updated) {
    return null;
  }

  await logBidChanges(db, {
    organizationId: input.organizationId,
    bidId: input.bidId,
    actorUserId: input.actorUserId,
    previous: existing,
    next: updated,
    changedColumns,
  });

  return getBidById(db, input.organizationId, input.bidId);
}

export async function updateBidStatus(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    bidId: string;
    status: BidStatus;
    actorUserId: string;
  },
) {
  const existing = await getBidRow(db, input.organizationId, input.bidId);
  if (!existing) {
    return null;
  }

  const status = normalizeBidStatus(input.status);

  await db
    .prepare(
      `
        UPDATE bids
        SET status = ?,
            updated_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE organization_id = ?
          AND id = ?
      `,
    )
    .bind(status, input.actorUserId, input.organizationId, input.bidId)
    .run();

  if (existing.status !== status) {
    await logBidStatusChange(db, {
      organizationId: input.organizationId,
      bidId: input.bidId,
      userId: input.actorUserId,
      oldStatus: existing.status,
      newStatus: status,
    });
  } else {
    await createBidActivity(db, {
      organizationId: input.organizationId,
      bidId: input.bidId,
      userId: input.actorUserId,
      action: "status_touched",
      fieldName: "status",
      oldValue: status,
      newValue: status,
      message: "Status update requested with no value change",
    });
  }

  return getBidById(db, input.organizationId, input.bidId);
}

export async function deleteBid(
  db: MinimalD1Database,
  organizationId: string,
  bidId: string,
) {
  const existing = await getBidRow(db, organizationId, bidId);
  if (!existing) {
    return false;
  }

  // The current schema has no archived_at column, so deletion is a hard delete for now.
  await db
    .prepare(
      `
        DELETE FROM bids
        WHERE organization_id = ?
          AND id = ?
      `,
    )
    .bind(organizationId, bidId)
    .run();

  return true;
}

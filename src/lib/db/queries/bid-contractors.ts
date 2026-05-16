import "server-only";

import type { MinimalD1Database } from "../client";
import type { BidContractor, BidContractorContact } from "../../db/types";
import { createPrefixedId } from "../../auth/tokens";

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

export async function listBidContractors(db: MinimalD1Database, organizationId: string) {
  const result = await db
    .prepare<BidContractor>(
      `
        SELECT *
        FROM bid_contractors
        WHERE organization_id = ?
        ORDER BY name COLLATE NOCASE ASC, created_at ASC
      `,
    )
    .bind(organizationId)
    .all();

  return result.results ?? [];
}

export async function getBidContractorById(
  db: MinimalD1Database,
  organizationId: string,
  contractorId: string,
) {
  return getBidContractorRow(db, organizationId, contractorId);
}

export async function createBidContractor(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    name: string;
    website?: string | null;
    mainPhone?: string | null;
    mainEmail?: string | null;
    notes?: string | null;
    actorUserId: string;
  },
) {
  const id = createPrefixedId("bidcon_");
  const name = normalizeRequiredString(input.name, "name");
  const website = normalizeOptionalString(input.website);
  const mainPhone = normalizeOptionalString(input.mainPhone);
  const mainEmail = normalizeOptionalString(input.mainEmail);
  const notes = normalizeOptionalString(input.notes);

  await db
    .prepare(
      `
        INSERT INTO bid_contractors (
          id,
          organization_id,
          name,
          website,
          main_phone,
          main_email,
          notes,
          created_by_user_id,
          updated_by_user_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      id,
      input.organizationId,
      name,
      website ?? null,
      mainPhone ?? null,
      mainEmail ?? null,
      notes ?? null,
      input.actorUserId,
      input.actorUserId,
    )
    .run();

  return getBidContractorRow(db, input.organizationId, id);
}

export async function updateBidContractor(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    contractorId: string;
    name?: string | null;
    website?: string | null;
    mainPhone?: string | null;
    mainEmail?: string | null;
    notes?: string | null;
    actorUserId: string;
  },
) {
  const existing = await getBidContractorRow(db, input.organizationId, input.contractorId);
  if (!existing) {
    return null;
  }

  const assignments: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    assignments.push("name = ?");
    values.push(
      input.name === null ? normalizeRequiredString("", "name") : normalizeRequiredString(input.name, "name"),
    );
  }

  if (input.website !== undefined) {
    assignments.push("website = ?");
    values.push(normalizeOptionalString(input.website));
  }

  if (input.mainPhone !== undefined) {
    assignments.push("main_phone = ?");
    values.push(normalizeOptionalString(input.mainPhone));
  }

  if (input.mainEmail !== undefined) {
    assignments.push("main_email = ?");
    values.push(normalizeOptionalString(input.mainEmail));
  }

  if (input.notes !== undefined) {
    assignments.push("notes = ?");
    values.push(normalizeOptionalString(input.notes));
  }

  assignments.push("updated_by_user_id = ?");
  values.push(input.actorUserId);
  assignments.push("updated_at = CURRENT_TIMESTAMP");

  await db
    .prepare(
      `
        UPDATE bid_contractors
        SET ${assignments.join(", ")}
        WHERE organization_id = ?
          AND id = ?
      `,
    )
    .bind(...values, input.organizationId, input.contractorId)
    .run();

  return getBidContractorRow(db, input.organizationId, input.contractorId);
}

export async function deleteBidContractor(
  db: MinimalD1Database,
  organizationId: string,
  contractorId: string,
) {
  const existing = await getBidContractorRow(db, organizationId, contractorId);
  if (!existing) {
    return false;
  }

  await db
    .prepare(
      `
        DELETE FROM bid_contractors
        WHERE organization_id = ?
          AND id = ?
      `,
    )
    .bind(organizationId, contractorId)
    .run();

  return true;
}

export async function listBidContactsForContractor(
  db: MinimalD1Database,
  organizationId: string,
  contractorId: string,
) {
  const result = await db
    .prepare<BidContractorContact>(
      `
        SELECT *
        FROM bid_contractor_contacts
        WHERE organization_id = ?
          AND contractor_id = ?
        ORDER BY
          last_name COLLATE NOCASE ASC,
          first_name COLLATE NOCASE ASC,
          created_at ASC
      `,
    )
    .bind(organizationId, contractorId)
    .all();

  return result.results ?? [];
}

export async function listBidContacts(db: MinimalD1Database, organizationId: string) {
  const result = await db
    .prepare<BidContractorContact>(
      `
        SELECT *
        FROM bid_contractor_contacts
        WHERE organization_id = ?
        ORDER BY
          last_name COLLATE NOCASE ASC,
          first_name COLLATE NOCASE ASC,
          created_at ASC
      `,
    )
    .bind(organizationId)
    .all();

  return result.results ?? [];
}

export async function getBidContactById(
  db: MinimalD1Database,
  organizationId: string,
  contactId: string,
) {
  return getBidContactRow(db, organizationId, contactId);
}

export async function createBidContact(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    contractorId: string;
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    actorUserId: string;
  },
) {
  await requireBidContractor(db, input.organizationId, input.contractorId);

  const id = createPrefixedId("bidctc_");
  const firstName = normalizeOptionalString(input.firstName);
  const lastName = normalizeOptionalString(input.lastName);
  const title = normalizeOptionalString(input.title);
  const phone = normalizeOptionalString(input.phone);
  const email = normalizeOptionalString(input.email);
  const notes = normalizeOptionalString(input.notes);

  await db
    .prepare(
      `
        INSERT INTO bid_contractor_contacts (
          id,
          organization_id,
          contractor_id,
          first_name,
          last_name,
          title,
          phone,
          email,
          notes,
          created_by_user_id,
          updated_by_user_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      id,
      input.organizationId,
      input.contractorId,
      firstName ?? null,
      lastName ?? null,
      title ?? null,
      phone ?? null,
      email ?? null,
      notes ?? null,
      input.actorUserId,
      input.actorUserId,
    )
    .run();

  return getBidContactRow(db, input.organizationId, id);
}

export async function updateBidContact(
  db: MinimalD1Database,
  input: {
    organizationId: string;
    contactId: string;
    contractorId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    actorUserId: string;
  },
) {
  const existing = await getBidContactRow(db, input.organizationId, input.contactId);
  if (!existing) {
    return null;
  }

  const assignments: string[] = [];
  const values: unknown[] = [];

  if (input.contractorId !== undefined) {
    if (input.contractorId === null) {
      throw new Error("contractorId cannot be null");
    }

    await requireBidContractor(db, input.organizationId, input.contractorId);
    assignments.push("contractor_id = ?");
    values.push(input.contractorId);
  }

  if (input.firstName !== undefined) {
    assignments.push("first_name = ?");
    values.push(normalizeOptionalString(input.firstName));
  }

  if (input.lastName !== undefined) {
    assignments.push("last_name = ?");
    values.push(normalizeOptionalString(input.lastName));
  }

  if (input.title !== undefined) {
    assignments.push("title = ?");
    values.push(normalizeOptionalString(input.title));
  }

  if (input.phone !== undefined) {
    assignments.push("phone = ?");
    values.push(normalizeOptionalString(input.phone));
  }

  if (input.email !== undefined) {
    assignments.push("email = ?");
    values.push(normalizeOptionalString(input.email));
  }

  if (input.notes !== undefined) {
    assignments.push("notes = ?");
    values.push(normalizeOptionalString(input.notes));
  }

  assignments.push("updated_by_user_id = ?");
  values.push(input.actorUserId);
  assignments.push("updated_at = CURRENT_TIMESTAMP");

  await db
    .prepare(
      `
        UPDATE bid_contractor_contacts
        SET ${assignments.join(", ")}
        WHERE organization_id = ?
          AND id = ?
      `,
    )
    .bind(...values, input.organizationId, input.contactId)
    .run();

  return getBidContactRow(db, input.organizationId, input.contactId);
}

export async function deleteBidContact(
  db: MinimalD1Database,
  organizationId: string,
  contactId: string,
) {
  const existing = await getBidContactRow(db, organizationId, contactId);
  if (!existing) {
    return false;
  }

  await db
    .prepare(
      `
        DELETE FROM bid_contractor_contacts
        WHERE organization_id = ?
          AND id = ?
      `,
    )
    .bind(organizationId, contactId)
    .run();

  return true;
}

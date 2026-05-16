import { NextResponse } from "next/server";

import { makeAuthErrorResponse, requireAuth, requireWritableSubscription } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import { createBid, listBids } from "@/lib/db/queries/bids";
import type { BidStatus } from "@/lib/db/types";

const BID_STATUSES: BidStatus[] = ["active", "pending_award", "awarded", "lost", "on_hold"];
const BID_SORT_FIELDS = new Set([
  "project_name",
  "bid_amount_cents",
  "contractor_name",
  "date_submitted",
  "last_followed_up_date",
  "next_follow_up_date",
  "status",
  "updated_at",
  "created_at",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalBidStatus(value: unknown): value is BidStatus | null | undefined {
  return value === undefined || value === null || (typeof value === "string" && BID_STATUSES.includes(value as BidStatus));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function getTrimmedQueryParam(url: URL, key: string) {
  const value = url.searchParams.get(key)?.trim();
  return value ? value : undefined;
}

function mapBidRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    switch (error.message) {
      case "Invalid request body.":
      case "Unsupported bid fields were provided.":
      case "Project name is required.":
      case "bidAmountCents must be an integer greater than or equal to 0.":
      case "Status must be one of: active, pending_award, awarded, lost, on_hold.":
      case "Optional bid text/date fields must be strings or null.":
      case "contractorId, contactId, and responsibleUserId must be strings or null.":
      case "Invalid bid status.":
      case "Invalid bid sort field.":
      case "sortDirection must be 'asc' or 'desc'.":
      case "Contact does not belong to the selected contractor":
        return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
      case "Contractor not found for organization":
        return NextResponse.json({ ok: false, message: "Contractor not found." }, { status: 404 });
      case "Contact not found for organization":
        return NextResponse.json({ ok: false, message: "Contact not found." }, { status: 404 });
      case "Responsible user must have an active membership in the organization":
        return NextResponse.json({ ok: false, message: "Responsible user not found." }, { status: 404 });
    }
  }

  const authResponse = makeAuthErrorResponse(error, fallbackMessage);
  if (authResponse.status !== 500) {
    return authResponse;
  }

  return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
}

async function parseCreateBidBody(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid request body.");
  }

  if (!isPlainObject(body)) {
    throw new Error("Invalid request body.");
  }

  if (
    "organizationId" in body
    || "createdByUserId" in body
    || "updatedByUserId" in body
    || "created_at" in body
    || "updated_at" in body
  ) {
    throw new Error("Unsupported bid fields were provided.");
  }

  if (typeof body.projectName !== "string" || !body.projectName.trim()) {
    throw new Error("Project name is required.");
  }

  if (body.bidAmountCents !== undefined && body.bidAmountCents !== null && !isNonNegativeInteger(body.bidAmountCents)) {
    throw new Error("bidAmountCents must be an integer greater than or equal to 0.");
  }

  if (!isOptionalBidStatus(body.status)) {
    throw new Error("Status must be one of: active, pending_award, awarded, lost, on_hold.");
  }

  if (
    !isOptionalString(body.manualContractorName)
    || !isOptionalString(body.manualContactName)
    || !isOptionalString(body.manualContactPhone)
    || !isOptionalString(body.manualContactEmail)
    || !isOptionalString(body.dateSubmitted)
    || !isOptionalString(body.lastFollowedUpDate)
    || !isOptionalString(body.nextFollowUpDate)
    || !isOptionalString(body.notes)
  ) {
    throw new Error("Optional bid text/date fields must be strings or null.");
  }

  if (
    !isOptionalString(body.contractorId)
    || !isOptionalString(body.contactId)
    || !isOptionalString(body.responsibleUserId)
  ) {
    throw new Error("contractorId, contactId, and responsibleUserId must be strings or null.");
  }

  return {
    projectName: body.projectName,
    bidAmountCents: (body.bidAmountCents as number | null | undefined) ?? undefined,
    contractorId: body.contractorId as string | null | undefined,
    contactId: body.contactId as string | null | undefined,
    manualContractorName: body.manualContractorName as string | null | undefined,
    manualContactName: body.manualContactName as string | null | undefined,
    manualContactPhone: body.manualContactPhone as string | null | undefined,
    manualContactEmail: body.manualContactEmail as string | null | undefined,
    dateSubmitted: body.dateSubmitted as string | null | undefined,
    lastFollowedUpDate: body.lastFollowedUpDate as string | null | undefined,
    nextFollowUpDate: body.nextFollowUpDate as string | null | undefined,
    status: body.status as BidStatus | null | undefined,
    notes: body.notes as string | null | undefined,
    responsibleUserId: body.responsibleUserId as string | null | undefined,
  };
}

export async function GET(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireAuth(request, { DB: db });
    const url = new URL(request.url);
    const status = getTrimmedQueryParam(url, "status");
    const search = getTrimmedQueryParam(url, "search");
    const contractorId = getTrimmedQueryParam(url, "contractorId");
    const responsibleUserId = getTrimmedQueryParam(url, "responsibleUserId");
    const sortBy = getTrimmedQueryParam(url, "sortBy");
    const sortDirection = getTrimmedQueryParam(url, "sortDirection")?.toLowerCase();

    if (status && !BID_STATUSES.includes(status as BidStatus)) {
      throw new Error("Invalid bid status.");
    }

    if (sortBy && !BID_SORT_FIELDS.has(sortBy)) {
      throw new Error("Invalid bid sort field.");
    }

    if (sortDirection && sortDirection !== "asc" && sortDirection !== "desc") {
      throw new Error("sortDirection must be 'asc' or 'desc'.");
    }

    const bids = await listBids(db, {
      organizationId: auth.organization.id,
      status: (status as BidStatus | undefined) ?? undefined,
      search,
      contractorId,
      responsibleUserId,
      sortBy: (sortBy as
        | "project_name"
        | "bid_amount_cents"
        | "contractor_name"
        | "date_submitted"
        | "last_followed_up_date"
        | "next_follow_up_date"
        | "status"
        | "updated_at"
        | "created_at"
        | undefined) ?? undefined,
      sortDirection: (sortDirection as "asc" | "desc" | undefined) ?? undefined,
    });

    return NextResponse.json({ ok: true, bids });
  } catch (error) {
    return mapBidRouteError(error, "Failed to load bids.");
  }
}

export async function POST(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireWritableSubscription(request, { DB: db });
    const body = await parseCreateBidBody(request);
    const bid = await createBid(db, {
      organizationId: auth.organization.id,
      projectName: body.projectName,
      bidAmountCents: body.bidAmountCents,
      contractorId: body.contractorId,
      contactId: body.contactId,
      manualContractorName: body.manualContractorName,
      manualContactName: body.manualContactName,
      manualContactPhone: body.manualContactPhone,
      manualContactEmail: body.manualContactEmail,
      dateSubmitted: body.dateSubmitted,
      lastFollowedUpDate: body.lastFollowedUpDate,
      nextFollowUpDate: body.nextFollowUpDate,
      status: body.status,
      notes: body.notes,
      responsibleUserId: body.responsibleUserId,
      actorUserId: auth.user.id,
    });

    return NextResponse.json({ ok: true, bid });
  } catch (error) {
    return mapBidRouteError(error, "Failed to create bid.");
  }
}

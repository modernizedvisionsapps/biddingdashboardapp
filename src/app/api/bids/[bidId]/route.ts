import { NextResponse } from "next/server";

import { makeAuthErrorResponse, requireAuth, requireWritableSubscription } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import { deleteBid, getBidById, updateBid } from "@/lib/db/queries/bids";
import type { BidStatus } from "@/lib/db/types";

const BID_STATUSES: BidStatus[] = ["active", "pending_award", "awarded", "lost", "on_hold"];

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

function hasEditableField(body: Record<string, unknown>) {
  return (
    body.projectName !== undefined
    || body.bidAmountCents !== undefined
    || body.contractorId !== undefined
    || body.contactId !== undefined
    || body.manualContractorName !== undefined
    || body.manualContactName !== undefined
    || body.manualContactPhone !== undefined
    || body.manualContactEmail !== undefined
    || body.dateSubmitted !== undefined
    || body.lastFollowedUpDate !== undefined
    || body.nextFollowUpDate !== undefined
    || body.status !== undefined
    || body.notes !== undefined
    || body.responsibleUserId !== undefined
  );
}

function mapBidRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    switch (error.message) {
      case "Invalid request body.":
      case "Unsupported bid fields were provided.":
      case "At least one editable bid field is required.":
      case "Project name must be a non-empty string.":
      case "bidAmountCents must be an integer greater than or equal to 0.":
      case "Status must be one of: active, pending_award, awarded, lost, on_hold.":
      case "Optional bid text/date fields must be strings or null.":
      case "contractorId, contactId, and responsibleUserId must be strings or null.":
      case "Invalid bid status":
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

async function parseUpdateBidBody(request: Request) {
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

  if (!hasEditableField(body)) {
    throw new Error("At least one editable bid field is required.");
  }

  if (body.projectName !== undefined && (typeof body.projectName !== "string" || !body.projectName.trim())) {
    throw new Error("Project name must be a non-empty string.");
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
    projectName: body.projectName as string | undefined,
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

export async function GET(
  request: Request,
  context: { params: Promise<{ bidId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireAuth(request, { DB: db });
    const { bidId } = await context.params;
    const bid = await getBidById(db, auth.organization.id, bidId);

    if (!bid) {
      return NextResponse.json({ ok: false, message: "Bid not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, bid });
  } catch (error) {
    return makeAuthErrorResponse(error, "Failed to load bid.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ bidId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireWritableSubscription(request, { DB: db });
    const { bidId } = await context.params;
    const body = await parseUpdateBidBody(request);
    const bid = await updateBid(db, {
      organizationId: auth.organization.id,
      bidId,
      projectName: body.projectName,
      bidAmountCents: body.bidAmountCents,
      contractorId: body.contractorId,
      contactId: body.contactId,
      manualContractorName: body.manualContractorName,
      manualContactPhone: body.manualContactPhone,
      manualContactEmail: body.manualContactEmail,
      manualContactName: body.manualContactName,
      dateSubmitted: body.dateSubmitted,
      lastFollowedUpDate: body.lastFollowedUpDate,
      nextFollowUpDate: body.nextFollowUpDate,
      status: body.status,
      notes: body.notes,
      responsibleUserId: body.responsibleUserId,
      actorUserId: auth.user.id,
    });

    if (!bid) {
      return NextResponse.json({ ok: false, message: "Bid not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, bid });
  } catch (error) {
    return mapBidRouteError(error, "Failed to update bid.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ bidId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireWritableSubscription(request, { DB: db });
    const { bidId } = await context.params;
    const deleted = await deleteBid(db, auth.organization.id, bidId);

    if (!deleted) {
      return NextResponse.json({ ok: false, message: "Bid not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = makeAuthErrorResponse(error, "Failed to delete bid.");
    if (authResponse.status !== 500) {
      return authResponse;
    }

    return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
  }
}

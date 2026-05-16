import { NextResponse } from "next/server";

import {
  deleteBidContact,
  getBidContactById,
  updateBidContact,
} from "@/lib/db/queries/bid-contractors";
import { getRuntimeDb } from "@/lib/db/client";
import {
  makeAuthErrorResponse,
  requireAuth,
  requireWritableSubscription,
} from "@/lib/auth/require-auth";

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasEditableContactField(body: Record<string, unknown>) {
  return (
    body.contractorId !== undefined
    || body.firstName !== undefined
    || body.lastName !== undefined
    || body.title !== undefined
    || body.phone !== undefined
    || body.email !== undefined
    || body.notes !== undefined
  );
}

async function parseUpdateContactBody(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid JSON body.");
  }

  if (!isPlainObject(body)) {
    throw new Error("Invalid request body.");
  }

  if ("organizationId" in body || "createdByUserId" in body || "updatedByUserId" in body || "created_at" in body || "updated_at" in body) {
    throw new Error("Unsupported contact fields were provided.");
  }

  if (!hasEditableContactField(body)) {
    throw new Error("At least one editable contact field is required.");
  }

  if (body.contractorId !== undefined && (typeof body.contractorId !== "string" || !body.contractorId.trim())) {
    throw new Error("contractorId must be a non-empty string.");
  }

  if (
    !isOptionalString(body.firstName)
    || !isOptionalString(body.lastName)
    || !isOptionalString(body.title)
    || !isOptionalString(body.phone)
    || !isOptionalString(body.email)
    || !isOptionalString(body.notes)
  ) {
    throw new Error("Contact fields must be strings or null.");
  }

  return {
    contractorId: body.contractorId as string | undefined,
    firstName: body.firstName as string | null | undefined,
    lastName: body.lastName as string | null | undefined,
    title: body.title as string | null | undefined,
    phone: body.phone as string | null | undefined,
    email: body.email as string | null | undefined,
    notes: body.notes as string | null | undefined,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ contactId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireAuth(request, { DB: db });
    const { contactId } = await context.params;
    const contact = await getBidContactById(db, auth.organization.id, contactId);

    if (!contact) {
      return NextResponse.json({ ok: false, message: "Contact not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, contact });
  } catch (error) {
    return makeAuthErrorResponse(error, "Failed to load contact.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ contactId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireWritableSubscription(request, { DB: db });
    const { contactId } = await context.params;
    const body = await parseUpdateContactBody(request);
    const contact = await updateBidContact(db, {
      organizationId: auth.organization.id,
      contactId,
      contractorId: body.contractorId,
      firstName: body.firstName,
      lastName: body.lastName,
      title: body.title,
      phone: body.phone,
      email: body.email,
      notes: body.notes,
      actorUserId: auth.user.id,
    });

    if (!contact) {
      return NextResponse.json({ ok: false, message: "Contact not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, contact });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Invalid JSON body."
        || error.message === "Invalid request body."
        || error.message === "Unsupported contact fields were provided."
        || error.message === "At least one editable contact field is required."
        || error.message === "contractorId must be a non-empty string."
        || error.message === "Contact fields must be strings or null."
      ) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
      }

      if (error.message === "Contractor not found for organization") {
        return NextResponse.json({ ok: false, message: "Contractor not found." }, { status: 404 });
      }
    }

    const authResponse = makeAuthErrorResponse(error, "Failed to update contact.");
    if (authResponse.status !== 500) {
      return authResponse;
    }

    return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ contactId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireWritableSubscription(request, { DB: db });
    const { contactId } = await context.params;
    const deleted = await deleteBidContact(db, auth.organization.id, contactId);

    if (!deleted) {
      return NextResponse.json({ ok: false, message: "Contact not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = makeAuthErrorResponse(error, "Failed to delete contact.");
    if (authResponse.status !== 500) {
      return authResponse;
    }

    return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
  }
}

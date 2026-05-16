import { NextResponse } from "next/server";

import {
  createBidContact,
  getBidContractorById,
  listBidContactsForContractor,
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

function hasContactIdentityField(input: {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  return Boolean(
    input.firstName?.trim()
      || input.lastName?.trim()
      || input.phone?.trim()
      || input.email?.trim(),
  );
}

async function parseCreateContactBody(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid JSON body.");
  }

  if (!isPlainObject(body)) {
    throw new Error("Invalid request body.");
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

  const parsed = {
    firstName: body.firstName as string | null | undefined,
    lastName: body.lastName as string | null | undefined,
    title: body.title as string | null | undefined,
    phone: body.phone as string | null | undefined,
    email: body.email as string | null | undefined,
    notes: body.notes as string | null | undefined,
  };

  if (!hasContactIdentityField(parsed)) {
    throw new Error("At least one of firstName, lastName, phone, or email is required.");
  }

  return parsed;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ contractorId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireAuth(request, { DB: db });
    const { contractorId } = await context.params;
    const contractor = await getBidContractorById(db, auth.organization.id, contractorId);

    if (!contractor) {
      return NextResponse.json({ ok: false, message: "Contractor not found." }, { status: 404 });
    }

    const contacts = await listBidContactsForContractor(db, auth.organization.id, contractorId);
    return NextResponse.json({ ok: true, contacts });
  } catch (error) {
    return makeAuthErrorResponse(error, "Failed to load contractor contacts.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ contractorId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireWritableSubscription(request, { DB: db });
    const { contractorId } = await context.params;
    const contractor = await getBidContractorById(db, auth.organization.id, contractorId);

    if (!contractor) {
      return NextResponse.json({ ok: false, message: "Contractor not found." }, { status: 404 });
    }

    const body = await parseCreateContactBody(request);
    const contact = await createBidContact(db, {
      organizationId: auth.organization.id,
      contractorId,
      firstName: body.firstName,
      lastName: body.lastName,
      title: body.title,
      phone: body.phone,
      email: body.email,
      notes: body.notes,
      actorUserId: auth.user.id,
    });

    return NextResponse.json({ ok: true, contact });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Invalid JSON body."
        || error.message === "Invalid request body."
        || error.message === "Contact fields must be strings or null."
        || error.message === "At least one of firstName, lastName, phone, or email is required."
      ) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
      }

      if (error.message === "Contractor not found for organization") {
        return NextResponse.json({ ok: false, message: "Contractor not found." }, { status: 404 });
      }
    }

    const authResponse = makeAuthErrorResponse(error, "Failed to create contractor contact.");
    if (authResponse.status !== 500) {
      return authResponse;
    }

    return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
  }
}

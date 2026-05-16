import { NextResponse } from "next/server";

import {
  createBidContractor,
  listBidContractors,
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

function isDuplicateContractorNameError(error: unknown) {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseCreateContractorBody(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid JSON body.");
  }

  if (!isPlainObject(body)) {
    throw new Error("Invalid request body.");
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    throw new Error("Contractor name is required.");
  }

  if (
    !isOptionalString(body.website)
    || !isOptionalString(body.mainPhone)
    || !isOptionalString(body.mainEmail)
    || !isOptionalString(body.notes)
  ) {
    throw new Error("Optional contractor fields must be strings or null.");
  }

  return {
    name: body.name,
    website: body.website,
    mainPhone: body.mainPhone,
    mainEmail: body.mainEmail,
    notes: body.notes,
  };
}

export async function GET(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireAuth(request, { DB: db });
    const contractors = await listBidContractors(db, auth.organization.id);
    return NextResponse.json({ ok: true, contractors });
  } catch (error) {
    return makeAuthErrorResponse(error, "Failed to load contractors.");
  }
}

export async function POST(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireWritableSubscription(request, { DB: db });
    const body = await parseCreateContractorBody(request);
    const contractor = await createBidContractor(db, {
      organizationId: auth.organization.id,
      name: body.name,
      website: body.website,
      mainPhone: body.mainPhone,
      mainEmail: body.mainEmail,
      notes: body.notes,
      actorUserId: auth.user.id,
    });

    return NextResponse.json({ ok: true, contractor });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Invalid JSON body."
        || error.message === "Invalid request body."
        || error.message === "Contractor name is required."
        || error.message === "Optional contractor fields must be strings or null."
      ) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
      }

      if (isDuplicateContractorNameError(error)) {
        return NextResponse.json(
          { ok: false, message: "A contractor with that name already exists." },
          { status: 409 },
        );
      }
    }

    const authResponse = makeAuthErrorResponse(error, "Failed to create contractor.");
    if (authResponse.status !== 500) {
      return authResponse;
    }

    return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
  }
}

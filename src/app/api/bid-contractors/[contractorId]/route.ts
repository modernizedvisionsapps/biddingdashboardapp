import { NextResponse } from "next/server";

import {
  deleteBidContractor,
  getBidContractorById,
  updateBidContractor,
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

async function parseUpdateContractorBody(request: Request) {
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
    throw new Error("Unsupported contractor fields were provided.");
  }

  if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
    throw new Error("Contractor name must be a non-empty string.");
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
    name: body.name as string | undefined,
    website: body.website as string | null | undefined,
    mainPhone: body.mainPhone as string | null | undefined,
    mainEmail: body.mainEmail as string | null | undefined,
    notes: body.notes as string | null | undefined,
  };
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

    return NextResponse.json({ ok: true, contractor });
  } catch (error) {
    return makeAuthErrorResponse(error, "Failed to load contractor.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ contractorId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireWritableSubscription(request, { DB: db });
    const { contractorId } = await context.params;
    const body = await parseUpdateContractorBody(request);
    const contractor = await updateBidContractor(db, {
      organizationId: auth.organization.id,
      contractorId,
      name: body.name,
      website: body.website,
      mainPhone: body.mainPhone,
      mainEmail: body.mainEmail,
      notes: body.notes,
      actorUserId: auth.user.id,
    });

    if (!contractor) {
      return NextResponse.json({ ok: false, message: "Contractor not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, contractor });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Invalid JSON body."
        || error.message === "Invalid request body."
        || error.message === "Contractor name must be a non-empty string."
        || error.message === "Optional contractor fields must be strings or null."
        || error.message === "Unsupported contractor fields were provided."
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

    const authResponse = makeAuthErrorResponse(error, "Failed to update contractor.");
    if (authResponse.status !== 500) {
      return authResponse;
    }

    return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ contractorId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireWritableSubscription(request, { DB: db });
    const { contractorId } = await context.params;
    const deleted = await deleteBidContractor(db, auth.organization.id, contractorId);

    if (!deleted) {
      return NextResponse.json({ ok: false, message: "Contractor not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = makeAuthErrorResponse(error, "Failed to delete contractor.");
    if (authResponse.status !== 500) {
      return authResponse;
    }

    return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
  }
}

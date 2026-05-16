import { NextResponse } from "next/server";

import { makeAuthErrorResponse, requireWritableSubscription } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import { updateBidStatus } from "@/lib/db/queries/bids";
import type { BidStatus } from "@/lib/db/types";

const BID_STATUSES: BidStatus[] = ["active", "pending_award", "awarded", "lost", "on_hold"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseStatusBody(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid request body.");
  }

  if (!isPlainObject(body)) {
    throw new Error("Invalid request body.");
  }

  if ("organizationId" in body) {
    throw new Error("Unsupported bid fields were provided.");
  }

  if (typeof body.status !== "string" || !BID_STATUSES.includes(body.status as BidStatus)) {
    throw new Error("Status must be one of: active, pending_award, awarded, lost, on_hold.");
  }

  return { status: body.status as BidStatus };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ bidId: string }> },
) {
  try {
    const db = getRuntimeDb();
    const auth = await requireWritableSubscription(request, { DB: db });
    const { bidId } = await context.params;
    const body = await parseStatusBody(request);
    const bid = await updateBidStatus(db, {
      organizationId: auth.organization.id,
      bidId,
      status: body.status,
      actorUserId: auth.user.id,
    });

    if (!bid) {
      return NextResponse.json({ ok: false, message: "Bid not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, bid });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Invalid request body."
        || error.message === "Unsupported bid fields were provided."
        || error.message === "Status must be one of: active, pending_award, awarded, lost, on_hold."
      ) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
      }
    }

    const authResponse = makeAuthErrorResponse(error, "Failed to update bid status.");
    if (authResponse.status !== 500) {
      return authResponse;
    }

    return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
  }
}

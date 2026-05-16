import { NextResponse } from "next/server";

import { makeAuthErrorResponse, requireAuth } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import { listBidActivity } from "@/lib/db/queries/bid-activity";
import { getBidById } from "@/lib/db/queries/bids";

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

    const activity = await listBidActivity(db, auth.organization.id, bidId);
    return NextResponse.json({ ok: true, activity });
  } catch (error) {
    return makeAuthErrorResponse(error, "Failed to load bid activity.");
  }
}

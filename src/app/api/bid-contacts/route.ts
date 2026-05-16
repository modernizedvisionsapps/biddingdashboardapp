import { NextResponse } from "next/server";

import { requireAuth, makeAuthErrorResponse } from "@/lib/auth/require-auth";
import { getRuntimeDb } from "@/lib/db/client";
import { listBidContacts } from "@/lib/db/queries/bid-contractors";

export async function GET(request: Request) {
  try {
    const db = getRuntimeDb();
    const auth = await requireAuth(request, { DB: db });
    const contacts = await listBidContacts(db, auth.organization.id);
    return NextResponse.json({ ok: true, contacts });
  } catch (error) {
    return makeAuthErrorResponse(error, "Failed to load contacts.");
  }
}

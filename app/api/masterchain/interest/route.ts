// C2 — POST /api/masterchain/interest : pre-launch "notify me at launch" capture for the paid
// MUEDsp masterchain, kept separate from the free-module download gate. Thin wrapper around the
// shared handler (staged behind MASTERCHAIN_INTEREST_LIVE). Public (no Clerk), like the plugin routes.
import { NextRequest } from "next/server";
import { handleMasterchainInterest } from "@/lib/masterchain/interest-handler";

export async function POST(request: NextRequest) {
  return handleMasterchainInterest(request);
}

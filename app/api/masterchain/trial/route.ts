import { NextRequest } from "next/server";
import { handleMasterchainTrial } from "@/lib/masterchain/trial-handler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleMasterchainTrial(request);
}

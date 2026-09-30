import { NextRequest } from "next/server";
import { handleMasterchainDemo } from "@/lib/masterchain/demo-handler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleMasterchainDemo(request);
}

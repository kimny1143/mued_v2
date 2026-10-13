import { NextRequest } from "next/server";
import { handlePaidDemo } from "@/lib/masterchain/demo-handler";
import { MUEDVOX_DEMO } from "@/lib/muedvox/demo";

export const runtime = "nodejs";

// ★404 until MUEDVOX_DEMO_LIVE (lib/muedvox/config.ts): the handler checks the product's own flag first.
export async function POST(request: NextRequest) {
  return handlePaidDemo(request, MUEDVOX_DEMO);
}

import { NextRequest, NextResponse } from "next/server";
import { parseLeadMessage } from "@/lib/openai";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/parse
 * Standalone GPT lead parsing endpoint (for testing / admin use).
 * Accepts { message: string } and returns parsed lead data.
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'message' field" },
        { status: 400 }
      );
    }

    const parsed = await parseLeadMessage(message);

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error("[Lead Parse] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

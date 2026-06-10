import { NextRequest, NextResponse } from "next/server";
import { getMockLogs, clearMockLogs } from "@/lib/whatsapp";

/**
 * GET /api/mock/whatsapp/logs
 * Fetches the in-memory mock logs of outgoing messages sent by the bot.
 * Also supports a ?clear=true query param to reset the logs.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  if (searchParams.get("clear") === "true") {
    clearMockLogs();
    return NextResponse.json({ success: true, logs: [] });
  }

  const logs = getMockLogs();
  
  return NextResponse.json({
    success: true,
    logs: [...logs].reverse(), // Newest first
  });
}

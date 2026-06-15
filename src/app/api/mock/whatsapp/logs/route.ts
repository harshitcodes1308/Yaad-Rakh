import { NextRequest, NextResponse } from "next/server";
import { getMockLogs, getMockIncomingLogs, clearMockLogs } from "@/lib/whatsapp";

/**
 * GET /api/mock/whatsapp/logs
 * Fetches the in-memory mock logs of outgoing messages sent by the bot.
 * Also supports a ?clear=true query param to reset the logs.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  if (searchParams.get("clear") === "true") {
    clearMockLogs();
    return NextResponse.json({ success: true, logs: [], incomingLogs: [], combinedLogs: [] });
  }

  const logs = getMockLogs();
  const incomingLogs = getMockIncomingLogs();
  
  // Combine both and sort by timestamp, newest first
  const combinedLogs = [
    ...logs.map(l => ({ ...l, direction: "outgoing" })),
    ...incomingLogs.map(l => ({ ...l, direction: "incoming" }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    success: true,
    logs: [...logs].reverse(), // Newest first
    incomingLogs: [...incomingLogs].reverse(),
    combinedLogs
  });
}

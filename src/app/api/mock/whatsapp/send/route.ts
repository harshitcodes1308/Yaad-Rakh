import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/mock/whatsapp/send
 * Simulates an incoming message from a customer to the bot.
 * It wraps the text in the 360dialog webhook format and passes it
 * to our main /api/whatsapp/incoming endpoint internally via fetch.
 */
export async function POST(request: NextRequest) {
  try {
    const { from, text } = await request.json();

    if (!from || !text) {
      return NextResponse.json(
        { error: "Missing required fields: from, text" },
        { status: 400 }
      );
    }

    // Mock 360dialog webhook payload
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "mock_entry_id",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "919999999999",
                  phone_number_id: "mock_phone_id",
                },
                contacts: [
                  {
                    profile: { name: "Simulator User" },
                    wa_id: from.replace("+", ""),
                  },
                ],
                messages: [
                  {
                    from: from.replace("+", ""),
                    id: `wamid.mock.${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body: text },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    // Note: We use the absolute URL to hit our own API because
    // Next.js Route Handlers cannot be directly invoked as functions
    // when they depend on Request/Response objects easily
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const apiUrl = `${protocol}://${host}/api/whatsapp/incoming`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to process mock webhook");
    }

    return NextResponse.json({
      success: true,
      message: "Webhook simulated successfully",
      result: data,
    });
  } catch (error) {
    console.error("[Mock Send] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

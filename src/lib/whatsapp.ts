const WHATSAPP_API_URL = "https://waba.360dialog.io/v1/messages";

interface SendMessageResponse {
  messages: Array<{ id: string }>;
}

export interface MockLogEntry {
  id: string;
  to: string;
  type: "text" | "interactive";
  content: string;
  timestamp: string;
}

// In-memory store for local testing (Simulator)
const mockLogs: MockLogEntry[] = [];

export function getMockLogs() {
  return mockLogs;
}

export function clearMockLogs() {
  mockLogs.length = 0;
}

function isMockMode() {
  const key = process.env.WHATSAPP_API_KEY;
  return !key || key === "your-360dialog-api-key";
}

/**
 * Send a plain text WhatsApp message via 360dialog API
 */
export async function sendTextMessage(
  to: string,
  body: string
): Promise<SendMessageResponse | null> {
  if (isMockMode()) {
    console.log("[WhatsApp Mock] Message to", to, ":", body);
    mockLogs.push({
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      to,
      type: "text",
      content: body,
      timestamp: new Date().toISOString(),
    });
    return { messages: [{ id: `mock_${Date.now()}` }] };
  }

  const response = await fetch(WHATSAPP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": process.env.WHATSAPP_API_KEY!,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[WhatsApp] Send failed:", error);
    throw new Error(`WhatsApp send failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Send an interactive button message (for Kaisa Gaya? flow)
 */
export async function sendInteractiveMessage(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>
): Promise<SendMessageResponse | null> {
  if (isMockMode()) {
    console.log("[WhatsApp Mock] Interactive to", to, ":", body, buttons);
    mockLogs.push({
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      to,
      type: "interactive",
      content: `[Interactive]\n${body}\nButtons: [${buttons.map((b) => b.title).join(" | ")}]`,
      timestamp: new Date().toISOString(),
    });
    return { messages: [{ id: `mock_${Date.now()}` }] };
  }

  const response = await fetch(WHATSAPP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": process.env.WHATSAPP_API_KEY!,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: buttons.map((btn) => ({
            type: "reply",
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[WhatsApp] Interactive send failed:", error);
    throw new Error(`WhatsApp interactive send failed: ${response.status}`);
  }

  return response.json();
}

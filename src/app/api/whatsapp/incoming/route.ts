import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseLeadMessage } from "@/lib/openai";
import { sendTextMessage } from "@/lib/whatsapp";
import { WhatsAppWebhookPayload } from "@/types/types";

/**
 * GET /api/whatsapp/incoming
 * Webhook verification (Meta / 360dialog challenge-response)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[Webhook] Verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/whatsapp/incoming
 * Receives incoming WhatsApp messages from 360dialog webhook.
 * This is the core orchestrator for Flow A:
 *   incoming message → GPT parse → save to DB → confirmation reply
 */
export async function POST(request: NextRequest) {
  try {
    const payload: WhatsAppWebhookPayload = await request.json();

    // Extract message from webhook payload
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const messageData = change?.value?.messages?.[0];

    if (!messageData || messageData.type !== "text") {
      // Not a text message — acknowledge but don't process
      return NextResponse.json({ status: "ignored" });
    }

    const senderPhone = messageData.from;
    const messageBody = messageData.text?.body;

    if (!messageBody) {
      return NextResponse.json({ status: "no_body" });
    }

    console.log(`[Webhook] Message from ${senderPhone}: ${messageBody}`);

    // 1. Look up the business by sender's WhatsApp number
    // Webhooks send numbers without '+', but our DB stores them with '+'
    const business = await prisma.business.findFirst({
      where: {
        OR: [
          { whatsappNumber: senderPhone },
          { whatsappNumber: `+${senderPhone}` },
        ],
      },
    });

    if (!business) {
      console.log(`[Webhook] Unknown sender: ${senderPhone}`);
      await sendTextMessage(
        senderPhone,
        "Yaad Rakh mein aapka account nahi mila. Pehle onboarding karwayein apne Devnddez team se! 🙏"
      );
      return NextResponse.json({ status: "unknown_sender" });
    }

    // 2. Parse the lead message using GPT-4o-mini
    const parsed = await parseLeadMessage(messageBody);
    console.log("[Webhook] Parsed lead:", parsed);

    // 3. Save customer to DB
    const customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        name: parsed.name,
        phone: parsed.phone,
        need: parsed.need,
        budget: parsed.budget,
        stage: "new",
      },
    });

    // 4. Create initial interaction
    await prisma.interaction.create({
      data: {
        customerId: customer.id,
        notes: messageBody,
        outcome: "lead_saved",
      },
    });

    // 5. Create reminder if follow-up timing was mentioned
    let reminderText = "";
    if (parsed.followUpDays) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + parsed.followUpDays);

      await prisma.reminder.create({
        data: {
          customerId: customer.id,
          dueDate,
          status: "pending",
          message: `Follow up with ${parsed.name}${parsed.need ? ` about ${parsed.need}` : ""}${parsed.budget ? ` (Budget: ₹${parsed.budget.toLocaleString("en-IN")})` : ""}`,
        },
      });

      reminderText = `\n📅 Follow-up set for ${parsed.followUpDays} din baad!`;
    }

    // 6. Send confirmation reply
    const budgetStr = parsed.budget
      ? `💰 Budget: ₹${parsed.budget.toLocaleString("en-IN")}`
      : "";
    const needStr = parsed.need ? `📋 Need: ${parsed.need}` : "";
    const phoneStr = parsed.phone ? `📞 Phone: ${parsed.phone}` : "";

    const confirmationParts = [
      `✅ ${parsed.name} save ho gaya!`,
      phoneStr,
      needStr,
      budgetStr,
      reminderText,
    ].filter(Boolean);

    const confirmation = confirmationParts.join("\n");

    // If no follow-up was set, ask for it
    if (!parsed.followUpDays) {
      const askFollowUp =
        confirmation +
        "\n\n⏰ Follow-up kab karein? (e.g. 2 din, 1 hafta)";
      await sendTextMessage(senderPhone, askFollowUp);
    } else {
      await sendTextMessage(senderPhone, confirmation);
    }

    return NextResponse.json({
      status: "processed",
      customerId: customer.id,
    });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

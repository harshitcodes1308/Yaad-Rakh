import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTextMessage } from "@/lib/whatsapp";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build",
});

async function generateReminderMessage(customerName: string, amount: number, notes: string | null): Promise<string> {
  const prompt = `Write a polite, friendly WhatsApp reminder message in Hinglish (Hindi written in English alphabets) to remind the customer that they have a pending payment balance.
Details:
- Customer Name: ${customerName}
- Pending Amount: ₹${amount}
- Notes/Context: ${notes || "None"}

Keep it natural, polite, respectful, and short (max 2 sentences). Use friendly Indian terms of respect like "ji" or "bhai" if appropriate. Always include the pending amount in the message. Do not use any markdown formatting other than bold (e.g. *bold*) for emphasis. Return ONLY the text of the message, no quotes, no explanations.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 150,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

async function processUdhariReminders() {
  const now = new Date();

  // Fetch all pending payments where dueDate is past or today
  const duePayments = await prisma.payment.findMany({
    where: {
      status: "pending",
      dueDate: {
        lte: now,
      },
    },
    include: {
      customer: {
        include: {
          business: true,
        },
      },
    },
  });

  console.log(`[Udhari Reminders Cron] Found ${duePayments.length} due payments.`);
  let sentCount = 0;

  for (const payment of duePayments) {
    const { customer } = payment;
    const { business } = customer;

    if (!business.whatsappNumber) {
      console.warn(`[Udhari Reminders Cron] Business ${business.id} has no WhatsApp number. Skipping.`);
      continue;
    }

    // 1. Generate polite reminder text via GPT
    const politeMessage = await generateReminderMessage(
      customer.name,
      payment.amount,
      payment.notes
    );

    // 2. Prepare WhatsApp link for forward
    const rawPhone = customer.phone || "";
    const cleanPhone = rawPhone.replace(/\s+/g, "").replace(/^\+/, "");
    const waLink = cleanPhone ? `wa.me/${cleanPhone}` : "";
    const forwardLink = waLink ? `\nSend on WhatsApp: wa.me/${cleanPhone}?text=${encodeURIComponent(politeMessage)}` : "";

    // 3. Format the message for the business owner
    const ownerMessageBody = `🚨 *Udhari Reminder (Due Today/Overdue)* 🚨\n\n*Customer*: ${customer.name}\n*Amount*: ₹${Number(payment.amount).toLocaleString("en-IN")}\n\n*Suggested Message*:\n"${politeMessage}"\n${forwardLink}`;

    // 4. Send message to the business owner
    await sendTextMessage(business.whatsappNumber, ownerMessageBody);

    // 5. Update interaction log
    await prisma.interaction.create({
      data: {
        customerId: customer.id,
        notes: `Udhari reminder generated: "${politeMessage}"`,
        outcome: "udhari_reminder_sent",
      },
    });

    // 6. Snooze the due date by 3 days so the reminder doesn't fire again immediately
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 3);

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        dueDate: snoozeDate,
      },
    });

    sentCount++;
  }

  return sentCount;
}

export async function GET(request: NextRequest) {
  try {
    const sentCount = await processUdhariReminders();
    return NextResponse.json({
      success: true,
      message: `Processed udhari reminders. Sent ${sentCount} messages.`,
    });
  } catch (error) {
    console.error("[Udhari Reminders GET] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sentCount = await processUdhariReminders();
    return NextResponse.json({
      success: true,
      message: `Processed udhari reminders. Sent ${sentCount} messages.`,
    });
  } catch (error) {
    console.error("[Udhari Reminders POST] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

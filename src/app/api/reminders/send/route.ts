import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTextMessage, sendInteractiveMessage } from "@/lib/whatsapp";

/**
 * POST /api/reminders/send
 * Cron job endpoint. Finds all pending due reminders, sends WhatsApp alerts
 * to the business owner (with text context and interactive status buttons),
 * and marks reminders as 'sent'.
 */
export async function POST(request: NextRequest) {
  try {
    const now = new Date();

    // Fetch all pending reminders due now or earlier
    const dueReminders = await prisma.reminder.findMany({
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

    console.log(`[Reminder Send Cron] Found ${dueReminders.length} due reminders.`);

    let sentCount = 0;

    for (const reminder of dueReminders) {
      const { customer } = reminder;
      const { business } = customer;

      if (!business.whatsappNumber) {
        console.warn(`[Reminder Send Cron] Business ${business.id} has no WhatsApp number. Skipping.`);
        continue;
      }

      // 1. Build the follow-up reminder text message
      const needStr = customer.need ? `Need: ${customer.need}. ` : "";
      const budgetStr = customer.budget
        ? `Budget: ₹${Number(customer.budget).toLocaleString("en-IN")}. `
        : "";
      const rawPhone = customer.phone || "";
      const cleanPhone = rawPhone.replace(/\s+/g, "").replace(/^\+/, "");
      const waLink = cleanPhone ? `wa.me/${cleanPhone}` : "";
      const tapLinkStr = waLink ? `\nTap karo: ${waLink}` : "";

      const alertBody = `Yaad hai? *${customer.name}* ka follow-up aaj karna tha. ${needStr}${budgetStr}${tapLinkStr}`;

      // Send plain text reminder message
      await sendTextMessage(business.whatsappNumber, alertBody);

      // 2. Send the interactive "Kaisa gaya?" deal pipeline buttons
      const interactiveBody = `${customer.name} se baat hui? Kaisa gaya?`;
      const buttons = [
        { id: `deal_${customer.id}_1`, title: "Deal pakka" },
        { id: `deal_${customer.id}_2`, title: "Soch raha hai" },
        { id: `deal_${customer.id}_3`, title: "Nahi chahiye" },
        { id: `deal_${customer.id}_4`, title: "Baad mein" },
      ];

      await sendInteractiveMessage(business.whatsappNumber, interactiveBody, buttons);

      // 3. Mark the reminder as 'sent'
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "sent" },
      });

      sentCount++;
    }

    return NextResponse.json({
      success: true,
      sentCount,
    });
  } catch (error) {
    console.error("[Reminders Send POST] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

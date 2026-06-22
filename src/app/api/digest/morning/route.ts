import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTextMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * POST /api/digest/morning
 * Daily cron job (runs at 9 AM).
 * Compiles a summary of pending reminders and overdue payments for each business,
 * and sends a Hinglish digest message to the owner.
 */
export async function POST(request: NextRequest) {
  try {
    const now = new Date();

    // Fetch all businesses
    const businesses = await prisma.business.findMany({
      include: {
        customers: {
          include: {
            reminders: {
              where: {
                status: "pending",
                dueDate: {
                  lte: now,
                },
              },
            },
            payments: {
              where: {
                status: "pending",
              },
            },
          },
        },
      },
    });

    console.log(`[Morning Digest] Processing for ${businesses.length} businesses.`);
    let processedCount = 0;

    for (const business of businesses) {
      if (!business.whatsappNumber) continue;

      const lines: string[] = [];
      
      // Gather reminders
      const dueReminders = business.customers.flatMap((c) =>
        c.reminders.map((r) => ({
          customerName: c.name,
          need: c.need,
          message: r.message,
        }))
      );

      // Gather pending payments
      const pendingPayments = business.customers.flatMap((c) =>
        c.payments.map((p) => {
          const daysPending = Math.max(
            0,
            Math.floor((now.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          );
          return {
            customerName: c.name,
            amount: p.amount,
            daysPending,
          };
        })
      );

      if (dueReminders.length === 0 && pendingPayments.length === 0) {
        // No pending tasks, skip sending digest to not spam them,
        // or send a positive start-of-day message. Let's send a friendly "no work" message.
        const ownerGreeting = business.ownerName ? `${business.ownerName} ji` : business.name;
        const greetMsg = `Good morning ${ownerGreeting}! Aaj ka koi pending kaam nahi hai. Have a productive day! 👍`;
        await sendTextMessage(business.whatsappNumber, greetMsg);
        processedCount++;
        continue;
      }

      const ownerGreeting = business.ownerName ? `${business.ownerName} ji!` : `${business.name}!`;
      lines.push(`Good morning ${ownerGreeting} Aaj ka kaam:`);

      dueReminders.forEach((r) => {
        const taskText = r.need ? `${r.need} follow-up` : "follow-up";
        lines.push(`⬜ ${r.customerName} — ${taskText}`);
      });

      pendingPayments.forEach((p) => {
        const pendingDaysStr = p.daysPending > 0 ? ` (${p.daysPending} din se)` : "";
        lines.push(`⬜ ${p.customerName} — ₹${p.amount.toLocaleString("en-IN")} pending${pendingDaysStr}`);
      });

      const digestMessage = lines.join("\n");
      await sendTextMessage(business.whatsappNumber, digestMessage);
      processedCount++;
    }

    return NextResponse.json({
      success: true,
      processedCount,
    });
  } catch (error) {
    console.error("[Morning Digest POST] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

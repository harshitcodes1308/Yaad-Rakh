import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/reminders/due
 * Fetches all reminders that are 'pending' and whose due date has passed.
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();

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
      orderBy: {
        dueDate: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      count: dueReminders.length,
      data: dueReminders,
    });
  } catch (error) {
    console.error("[Reminders Due GET] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/leads/save
 * Saves a parsed lead to the database and optionally creates a reminder.
 * Accepts { businessId, name, phone, need, budget, followUpDays }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, phone, need, budget, followUpDays } = body;

    if (!businessId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: businessId, name" },
        { status: 400 }
      );
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        businessId,
        name,
        phone: phone || null,
        need: need || null,
        budget: budget ? Number(budget) : null,
        stage: "new",
      },
    });

    // Create reminder if followUpDays is provided
    let reminder = null;
    if (followUpDays && Number(followUpDays) > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Number(followUpDays));

      reminder = await prisma.reminder.create({
        data: {
          customerId: customer.id,
          dueDate,
          status: "pending",
          message: `Follow up with ${name}${need ? ` about ${need}` : ""}${budget ? ` (Budget: ₹${Number(budget).toLocaleString("en-IN")})` : ""}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        customer,
        reminder,
      },
    });
  } catch (error) {
    console.error("[Lead Save] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

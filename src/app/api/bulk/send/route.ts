import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTextMessage } from "@/lib/whatsapp";

/**
 * POST /api/bulk/send
 * Broadcasts a custom festival/promotional greeting to all customers of a business.
 * Accepts { businessId, festival: string }
 * Restricted to paid "pro" plan.
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId, festival } = await request.json();

    if (!businessId || !festival) {
      return NextResponse.json(
        { error: "Missing required fields: businessId, festival" },
        { status: 400 }
      );
    }

    // Look up the business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Enforce Pro plan check
    if (business.plan !== "pro") {
      return NextResponse.json(
        {
          error: "Bulk message broadcast is a Pro tier feature. Please upgrade your business plan.",
        },
        { status: 403 }
      );
    }

    // Fetch all customers for this business
    const customers = await prisma.customer.findMany({
      where: { businessId },
    });

    if (customers.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: "No customers found to broadcast messages to.",
      });
    }

    let sentCount = 0;

    for (const customer of customers) {
      // Build personalized Hinglish greeting
      const greeting = `Happy ${festival} ${customer.name} ji! ${business.name} ki taraf se shubhkamnayein! Naya collection aa gaya hai — zaroor aayein!`;
      
      const phoneNum = customer.phone || "919999999999";
      await sendTextMessage(phoneNum, greeting);
      sentCount++;
    }

    return NextResponse.json({
      success: true,
      sentCount,
    });
  } catch (error) {
    console.error("[Bulk Send POST] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyAndParseMessage } from "@/lib/openai";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/update
 * Standalone endpoint to parse and record a payment transaction.
 * Accepts { businessId, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId, message } = await request.json();

    if (!businessId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: businessId, message" },
        { status: 400 }
      );
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Call GPT to parse the payment message
    const parsed = await classifyAndParseMessage(message);

    if (parsed.intent !== "RECORD_PAYMENT") {
      return NextResponse.json(
        { error: "Message does not contain a valid payment instruction" },
        { status: 400 }
      );
    }

    const { customerName, amount, type } = parsed.data;

    if (!customerName || !amount) {
      return NextResponse.json(
        { error: "Could not extract customerName or amount from payment message" },
        { status: 400 }
      );
    }

    // Look up customer by name
    let customer = await prisma.customer.findFirst({
      where: {
        businessId,
        name: { contains: customerName },
      },
    });

    // Create a new customer if they don't exist
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId,
          name: customerName,
          stage: "interested",
        },
      });
    }

    // Record the payment
    const payment = await prisma.payment.create({
      data: {
        customerId: customer.id,
        amount: Number(amount),
        status: type === "paid" ? "paid" : "pending",
        notes: message,
      },
    });

    // Record the interaction
    await prisma.interaction.create({
      data: {
        customerId: customer.id,
        notes: message,
        outcome: "payment_recorded",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        customerName: customer.name,
        amount: payment.amount,
        status: payment.status,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    console.error("[Payments Update POST] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

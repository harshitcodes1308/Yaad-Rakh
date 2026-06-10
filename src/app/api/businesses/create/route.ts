import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/businesses/create
 * Creates a new Business record for client onboarding.
 * Accepts { name, ownerName, whatsappNumber, category, plan }
 * Returns { success: true, business: { id, name, botNumber } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ownerName, whatsappNumber, category, plan } = body;

    // Validate required fields
    if (!name || !whatsappNumber) {
      return NextResponse.json(
        { error: "Missing required fields: name, whatsappNumber" },
        { status: 400 }
      );
    }

    // Clean up WhatsApp number — ensure it starts with country code
    const cleanNumber = whatsappNumber.replace(/\s/g, "").replace(/^0+/, "");
    const formattedNumber = cleanNumber.startsWith("+91")
      ? cleanNumber
      : cleanNumber.startsWith("91")
        ? `+${cleanNumber}`
        : `+91${cleanNumber}`;

    // Check if business with this number already exists
    const existing = await prisma.business.findUnique({
      where: { whatsappNumber: formattedNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Business with this WhatsApp number already exists" },
        { status: 409 }
      );
    }

    // Get bot number from env (single static number for MVP)
    const botNumber = process.env.WHATSAPP_BOT_NUMBER || "+91XXXXXXXXXX";

    // Create business record
    const business = await prisma.business.create({
      data: {
        name,
        ownerName: ownerName || null,
        whatsappNumber: formattedNumber,
        category: category || null,
        botNumber,
        plan: plan || "free",
      },
    });

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        botNumber: business.botNumber,
      },
    });
  } catch (error) {
    console.error("[Business Create] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

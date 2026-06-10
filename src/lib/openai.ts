import OpenAI from "openai";
import { ParsedLead } from "@/types/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build",
});

const SYSTEM_PROMPT = `You are a lead data extractor for an Indian CRM called "Yaad Rakh". Extract structured data from informal business messages (often in Hinglish — a mix of Hindi and English).

Return JSON with these fields:
- name (string, required) — the customer's name
- phone (string or null) — phone number if mentioned
- need (string or null) — what the customer wants, in English
- budget (number or null) — in INR, as a plain number
- followUpDays (number or null) — when to follow up, converted to days

Parsing rules:
- "15k" or "15 hazar" = 15000
- "1 lakh" = 100000
- "1 hafta" = 7 days
- "kal" = 1 day
- "parso" = 2 days
- "2 din" or "2 din baad" = 2 days
- "1 mahina" = 30 days
- Phone numbers: extract any 10-digit Indian number, with or without +91/0 prefix
- If a field is not mentioned, set it to null
- Always respond with valid JSON only. No markdown, no explanation, no code fences.`;

/**
 * Parse a natural language lead message using GPT-4o-mini
 */
export async function parseLeadMessage(
  message: string
): Promise<ParsedLead> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message },
    ],
    temperature: 0.1,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("GPT returned empty response");
  }

  const parsed = JSON.parse(content) as ParsedLead;

  // Validate required field
  if (!parsed.name || parsed.name.trim() === "") {
    throw new Error("Could not extract customer name from message");
  }

  return {
    name: parsed.name.trim(),
    phone: parsed.phone?.trim() || null,
    need: parsed.need?.trim() || null,
    budget: parsed.budget ? Number(parsed.budget) : null,
    followUpDays: parsed.followUpDays ? Number(parsed.followUpDays) : null,
  };
}

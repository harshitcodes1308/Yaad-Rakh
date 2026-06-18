import OpenAI from "openai";
import { ParsedLead } from "@/types/types";
import fs from "fs";
import path from "path";

function getOpenAIApiKey() {
  let key = process.env.OPENAI_API_KEY;
  if (!key || key.startsWith("sk-ijklm") || key === "dummy-key-for-build") {
    try {
      const envPath = path.join(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const lines = envContent.split("\n");
        for (const line of lines) {
          const match = line.match(/^\s*OPENAI_API_KEY\s*=\s*(.*)?\s*$/);
          if (match) {
            let val = match[1] || "";
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1);
            }
            if (val && !val.startsWith("sk-ijklm")) {
              return val;
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to read key from .env:", e);
    }
  }
  return key || "dummy-key-for-build";
}

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
- Phone numbers: Extract ONLY when it is clearly an explicit 10-digit mobile number (e.g. 9876543210, +919876543210).
- CRITICAL: Under no circumstances should transaction/credit amounts (e.g. 200, 500, 1000, 15000), single/double/triple digits, or date/time numbers be extracted as the phone number. If there is no clear 10-digit mobile number, set the phone field to null.
- If a field is not mentioned, set it to null.
- Always respond with valid JSON only. No markdown, no explanation, no code fences.`;

const CLASSIFY_SYSTEM_PROMPT = `You are an AI assistant for "Yaad Rakh", a WhatsApp-First CRM for Indian small business owners.
The user (a business owner) sends Hinglish/English messages to manage their leads, reminders, and payments.
Analyze the message and classify it into one of these intents:

1. NEW_LEAD: If the message introduces a new customer/lead, mentioning their name (and optionally details like phone, need, budget, follow-up days).
   - Example: "Raj, 9876543210, website design budget 15k"
   - Example: "Sharma ji new inquiry for clothing store"
2. SET_REMINDER: If the message sets or updates a follow-up timing, specifying days/weeks, without introducing a new customer name.
   - Example: "2 din baad", "1 hafta", "kal", "parso", "3 din aur"
3. RECORD_PAYMENT: If the message tracks payments (either money pending/owed or paid/received) with standard formats.
   - Example: "Meena payment of 5000 is pending"
4. RECORD_UDHARI: If the message tracks informal credit (udhari) or repayments in Hinglish.
   - Example: "Anushree ne 200 udhari li" -> type: "udhari", customerName: "Anushree", amount: 200
   - Example: "Rohit ne 500 wapas kar diye" -> type: "repayment", customerName: "Rohit", amount: 500
   - Example: "Saare paise wapas kar diye" -> type: "full_repayment", customerName: null
   - Example: "Anushree ne saare paise wapas kar diye" -> type: "full_repayment", customerName: "Anushree"
   - Example: "Aadhe paise wapas kare" -> type: "partial_repayment", customerName: null
   - Example: "Amit ne aadhe paise wapas kare" -> type: "partial_repayment", customerName: "Amit"
5. LIST_UDHARI: If the owner wants to list or view outstanding balances.
   - Example: "Sari udhari list karo" -> customerName: null
   - Example: "Aryan ka kitna baaki hai" -> customerName: "Aryan"
6. DEAL_PIPELINE_REPLY: If the message is a deal pipeline status option (often a number 1-4 or terms like "Deal pakka", "Soch raha hai", "Nahi chahiye", "Baad mein").
   - Example: "1", "2", "Deal pakka", "Baad mein"
7. BULK_MESSAGE: If the owner wants to broadcast festival greetings, new item/shop updates, or custom personalized messages.
   - Example: "Diwali wish bhejo sabko" -> messageType: "festival", messageText: "Diwali", targetStage: "all"
   - Example: "won leads ko Happy Diwali greeting send karo" -> messageType: "festival", messageText: "Diwali", targetStage: "won"
   - Example: "shop new item launch message to interested leads" -> messageType: "announcement", messageText: "new item launch", targetStage: "interested"
   - Example: "custom message: hey [name] happy diwali to all" -> messageType: "custom", messageText: "hey [name] happy diwali", targetStage: "all"
8. REMINDER_ACTION: If the owner replies to a reminder notification (e.g. "Done", "Baad mein", "3 din aur" in direct response).
   - Example: "Done"
9. CREATE_INVOICE: If the owner wants to generate a digital bill/invoice for a customer.
   - Example: "Rahul digital bill of 1500 for tshirts" -> customerName: "Rahul", amount: 1500, item: "tshirts"
   - Example: "invoice of 12000 for Amit for website design" -> customerName: "Amit", amount: 12000, item: "website design"
10. LOG_ATTENDANCE: If the owner wants to log daily staff logins or logouts.
    - Example: "Ramesh staff login" -> staffName: "Ramesh", type: "login"
    - Example: "punch out Ramesh" -> staffName: "Ramesh", type: "logout"
    - Example: "staff punch in" -> staffName: null, type: "login"
11. BUSINESS_STATS: If the owner wants to view business stats/dashboard reports.
    - Example: "business stats show karo" -> range: null
    - Example: "weekly report dikhao" -> range: "weekly"

Return valid JSON with these fields:
- intent (string: "NEW_LEAD" | "SET_REMINDER" | "RECORD_PAYMENT" | "RECORD_UDHARI" | "LIST_UDHARI" | "DEAL_PIPELINE_REPLY" | "BULK_MESSAGE" | "REMINDER_ACTION" | "CREATE_INVOICE" | "LOG_ATTENDANCE" | "BUSINESS_STATS")
- data (object):
  - For NEW_LEAD: { name: string, phone: string | null, need: string | null, budget: number | null, followUpDays: number | null }
  - For SET_REMINDER: { followUpDays: number | null }
  - For RECORD_PAYMENT: { customerName: string, amount: number, type: "pending" | "paid" }
  - For RECORD_UDHARI: { customerName: string | null, amount: number | null, type: "udhari" | "repayment" | "full_repayment" | "partial_repayment" }
  - For LIST_UDHARI: { customerName: string | null }
  - For DEAL_PIPELINE_REPLY: { option: number | null, text: string | null }
  - For BULK_MESSAGE: { query: string | null, targetStage: "all" | "new" | "interested" | "negotiating" | "won" | "lost", messageType: "festival" | "announcement" | "custom", messageText: string }
  - For REMINDER_ACTION: { action: "done" | "snooze" | "later", snoozeDays: number | null }
  - For CREATE_INVOICE: { customerName: string, amount: number, item: string | null }
  - For LOG_ATTENDANCE: { staffName: string | null, type: "login" | "logout" }
  - For BUSINESS_STATS: { range: string | null }

Parsing/Conversion Rules:
- "15k" or "15 hazar" = 15000
- "1 lakh" = 100000
- "1 hafta" = 7 days
- "kal" = 1 day
- "parso" = 2 days
- "2 din" or "2 din baad" = 2 days
- "1 mahina" = 30 days
- Phone numbers: Extract ONLY when it is clearly an explicit 10-digit mobile number.
- If a field is not mentioned, set it to null.
- Always respond with valid JSON only. No markdown, no explanation, no code fences.`;

export interface ClassifiedMessage {
  intent: "NEW_LEAD" | "SET_REMINDER" | "RECORD_PAYMENT" | "RECORD_UDHARI" | "LIST_UDHARI" | "DEAL_PIPELINE_REPLY" | "BULK_MESSAGE" | "REMINDER_ACTION" | "CREATE_INVOICE" | "LOG_ATTENDANCE" | "BUSINESS_STATS";
  data: {
    name?: string;
    phone?: string | null;
    need?: string | null;
    budget?: number | null;
    followUpDays?: number | null;
    customerName?: string | null;
    amount?: number | null;
    type?: "pending" | "paid" | "udhari" | "repayment" | "full_repayment" | "partial_repayment" | "login" | "logout";
    option?: number | null;
    text?: string | null;
    query?: string | null;
    action?: "done" | "snooze" | "later";
    snoozeDays?: number | null;
    // New fields
    targetStage?: "all" | "new" | "interested" | "negotiating" | "won" | "lost";
    messageType?: "festival" | "announcement" | "custom";
    messageText?: string;
    item?: string | null;
    staffName?: string | null;
    range?: string | null;
  };
}

/**
 * Classify and parse any message from the business owner using GPT-4o-mini
 */
export async function classifyAndParseMessage(
  message: string
): Promise<ClassifiedMessage> {
  const openai = new OpenAI({ apiKey: getOpenAIApiKey() });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
      { role: "user", content: message },
    ],
    temperature: 0.1,
    max_tokens: 300,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("GPT returned empty response");
  }

  const parsed = JSON.parse(content) as ClassifiedMessage;

  // Additional formatting rules if needed
  if (parsed.intent === "NEW_LEAD" && parsed.data.budget) {
    parsed.data.budget = Number(parsed.data.budget);
  }
  if ((parsed.intent === "RECORD_PAYMENT" || parsed.intent === "RECORD_UDHARI" || parsed.intent === "CREATE_INVOICE") && parsed.data.amount) {
    parsed.data.amount = Number(parsed.data.amount);
  }

  return parsed;
}

/**
 * Parse a natural language lead message using GPT-4o-mini
 */
export async function parseLeadMessage(
  message: string
): Promise<ParsedLead> {
  const openai = new OpenAI({ apiKey: getOpenAIApiKey() });
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


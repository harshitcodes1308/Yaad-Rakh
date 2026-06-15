/**
 * Tiny Hinglish intent parser for the demo simulator.
 * Deterministic (no LLM) so the demo never stalls or fails.
 */

export type DemoIntent =
  | { type: "greeting" }
  | { type: "udhari"; name: string; amount: number; raw: string }
  | { type: "paid"; name: string; amount: number; raw: string }
  | { type: "list" }
  | { type: "help" };

const STOPWORDS = new Set([
  "ne", "se", "ko", "ka", "ki", "ke", "pe", "par", "mein", "me", "main",
  "aur", "tha", "thi", "the", "hai", "hain", "ho", "gaya", "gayi", "diya",
  "diye", "li", "liya", "lagai", "lagayi", "lagaya", "wala", "wali",
  "se", "tak", "wapas", "vapas", "chuka", "chukaye", "chukaayi", "chukai",
  "udhari", "udhaar", "udhar", "loan", "credit", "hisaab", "baki",
  "rupees", "rupaye", "rupiya", "rs", "inr",
]);

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function extractName(text: string): string | null {
  const tokens = text.trim().split(/\s+/);
  for (const tok of tokens) {
    const cleaned = tok.replace(/[^\p{L}]/gu, "");
    if (!cleaned) continue;
    if (/^\d/.test(tok)) continue;
    if (STOPWORDS.has(cleaned.toLowerCase())) continue;
    return titleCase(cleaned);
  }
  return null;
}

function extractAmount(text: string): number | null {
  const match = text.match(
    /(\d+(?:\.\d+)?)\s*(k|hazaar|hazar|thousand|lakh|lac)?/i
  );
  if (!match) return null;
  let amount = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();
  if (
    unit === "k" ||
    unit === "hazaar" ||
    unit === "hazar" ||
    unit === "thousand"
  ) {
    amount *= 1000;
  }
  if (unit === "lakh" || unit === "lac") amount *= 100000;
  return amount;
}

export function parseDemoMessage(rawMessage: string): DemoIntent {
  const text = rawMessage.trim();
  const lower = text.toLowerCase();

  // 1. Greeting
  if (
    /^(hi+|hello+|hey+|namaste|namastey|namaskar|salaam|ram ram|good morning|good evening)\b/i.test(
      lower
    )
  ) {
    return { type: "greeting" };
  }

  // 2. List / report intent
  if (
    /\b(list|report|kiska kitna|kaun kaun|sab udhari|sari udhari|total udhari|sab ka hisaab)\b/.test(
      lower
    )
  ) {
    return { type: "list" };
  }

  // 3. Loan paid back
  if (
    /\b(wapas|vapas|chuka|chukaye|chukaayi|chukai|de diye|de diya|return|paid|pay kar|pay kiya)\b/.test(
      lower
    )
  ) {
    const name = extractName(text);
    const amount = extractAmount(text);
    if (name && amount) {
      return { type: "paid", name, amount, raw: text };
    }
  }

  // 4. Udhari / new loan
  if (/\b(udhari|udhaar|udhar|loan|credit|hisaab|baki|le gaya|le gayi)\b/.test(lower)) {
    const name = extractName(text);
    const amount = extractAmount(text);
    if (name && amount) {
      return { type: "udhari", name, amount, raw: text };
    }
  }

  // 5. Fallback: name + amount → treat as udhari
  {
    const name = extractName(text);
    const amount = extractAmount(text);
    if (name && amount) {
      return { type: "udhari", name, amount, raw: text };
    }
  }

  return { type: "help" };
}

export function formatINR(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

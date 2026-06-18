const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");

// Parse .env manually
try {
  const envContent = fs.readFileSync(path.join(__dirname, "../.env"), "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      // Remove surrounding quotes
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
} catch (e) {
  console.error("Could not read .env file:", e);
}

console.log("Loaded API Key preview:", process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.slice(0, 15) + "..." : "undefined");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hello" }],
    });
    console.log("Success! Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI API test failed:", error);
  }
}

test();

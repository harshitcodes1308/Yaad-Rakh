
export {};
const API_URL = "http://localhost:3000/api/whatsapp/incoming";

async function testWebhook(senderPhone: string, messageBody: string) {
  console.log(`\nTesting webhook from ${senderPhone}: "${messageBody}"`);
  console.log("-".repeat(50));

  // Mock 360dialog webhook payload format
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "12345",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "919999999999",
                phone_number_id: "1234567890",
              },
              contacts: [
                {
                  profile: { name: "Business Owner" },
                  wa_id: senderPhone.replace("+", ""),
                },
              ],
              messages: [
                {
                  from: senderPhone.replace("+", ""),
                  id: `wamid.${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: { body: messageBody },
                  type: "text",
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

async function runTests() {
  console.log("Starting Webhook Integration Tests...");

  // Assume this number is registered as a business in the DB
  const businessPhone = "919876543210";

  await testWebhook(
    businessPhone,
    "Rahul ka call aaya tha, usko ek e-commerce website chahiye jisme payment gateway ho, 40 hazar bol raha tha, 1 hafta baad batana hai"
  );
}

runTests();

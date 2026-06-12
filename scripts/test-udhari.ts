import { prisma } from "../src/lib/db";
import { classifyAndParseMessage } from "../src/lib/openai";

const API_URL = "http://localhost:3000/api/whatsapp/incoming";
const REMINDER_API_URL = "http://localhost:3000/api/reminders/udhari";

async function testWebhook(senderPhone: string, messageBody: string) {
  console.log(`\n💬 Webhook Message: "${messageBody}"`);

  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "mock_entry_id",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "919999999999",
                phone_number_id: "mock_phone_id",
              },
              contacts: [
                {
                  profile: { name: "Simulator User" },
                  wa_id: senderPhone,
                },
              ],
              messages: [
                {
                  from: senderPhone,
                  id: `wamid.mock.${Date.now()}`,
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
    console.error("Fetch Error:", err);
  }
}

async function testReminderCron() {
  console.log(`\n⏰ Triggering Udhari Reminders Cron Job...`);
  try {
    const response = await fetch(REMINDER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    console.log("Cron Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Cron Error:", err);
  }
}

async function runTests() {
  console.log("=========================================");
  console.log("Verifying GPT Intent Parsing & Udhari CRM...");
  console.log("=========================================");

  // Ensure test business is in DB
  const businessPhone = "919876543210";
  let business = await prisma.business.findUnique({
    where: { whatsappNumber: `+${businessPhone}` },
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: "Test Kirana Store",
        ownerName: "Aryan Owner",
        whatsappNumber: `+${businessPhone}`,
        category: "Retail",
        botNumber: "+919999999999",
        plan: "pro", // Make pro so bulk/reminders work easily
      },
    });
    console.log("Created test business:", business.name);
  } else {
    console.log("Using existing test business:", business.name);
  }

  // 1. Verify Phone Parsing Bug Fix (GPT classification check)
  console.log("\n--- Checking GPT Phone Parsing Bug Fix ---");
  const parsedLeadMsg = await classifyAndParseMessage("Anushree ne 200 udhari li");
  console.log("Parsed result for 'Anushree ne 200 udhari li':");
  console.log(JSON.stringify(parsedLeadMsg, null, 2));
  
  if (parsedLeadMsg.data.phone) {
    console.log("❌ BUG STILL ACTIVE: Phone field is incorrectly populated!");
  } else {
    console.log("✅ BUG FIXED: Phone field is null as expected!");
  }

  // 2. Clear out existing payments for Test Kirana Store customers to start fresh
  const testCustomers = await prisma.customer.findMany({
    where: { businessId: business.id },
  });
  for (const tc of testCustomers) {
    await prisma.payment.deleteMany({ where: { customerId: tc.id } });
  }

  // 3. Test Webhook RECORD_UDHARI cases
  console.log("\n--- Testing RECORD_UDHARI (Credit taken) ---");
  await testWebhook(businessPhone, "Anushree ne 200 udhari li");
  await testWebhook(businessPhone, "Rohit ne 500 udhari li");

  // Verify DB state
  let anushree = await prisma.customer.findFirst({
    where: { businessId: business.id, name: { contains: "Anushree" } },
    include: { payments: true },
  });
  let rohit = await prisma.customer.findFirst({
    where: { businessId: business.id, name: { contains: "Rohit" } },
    include: { payments: true },
  });
  console.log(`Anushree DB Payments count: ${anushree?.payments.length}, Rohit count: ${rohit?.payments.length}`);

  console.log("\n--- Testing LIST_UDHARI (Specific Customer) ---");
  await testWebhook(businessPhone, "Anushree ka kitna baaki hai");

  console.log("\n--- Testing LIST_UDHARI (All Outstanding) ---");
  await testWebhook(businessPhone, "Sari udhari list karo");

  console.log("\n--- Testing RECORD_UDHARI (Repayment) ---");
  await testWebhook(businessPhone, "Rohit ne 200 wapas kar diye");
  
  // Verify remaining balance for Rohit
  await testWebhook(businessPhone, "Rohit ka kitna baaki hai");

  console.log("\n--- Testing RECORD_UDHARI (Aadhe wapas - Partial Repayment) ---");
  // Set outstanding balance to something simple, say we have remaining 300 for Rohit
  await testWebhook(businessPhone, "Rohit ne aadhe paise wapas kare");
  await testWebhook(businessPhone, "Rohit ka kitna baaki hai");

  console.log("\n--- Testing RECORD_UDHARI (Saare wapas - Full Repayment) ---");
  await testWebhook(businessPhone, "Anushree ne saare paise wapas kar diye");
  await testWebhook(businessPhone, "Anushree ka kitna baaki hai");

  // 4. Test Udhari Reminder Cron logic
  console.log("\n--- Testing Udhari Due Reminders Cron ---");
  // Make Rohit's remaining payment past due so it triggers the reminder
  const pendingRohitPayments = await prisma.payment.findMany({
    where: { customer: { businessId: business.id }, status: "pending" },
  });
  console.log(`Setting ${pendingRohitPayments.length} pending payments for Rohit as overdue...`);
  
  // Ensure customer Rohit has a phone number so we get a wa.me link
  if (rohit) {
    await prisma.customer.update({
      where: { id: rohit.id },
      data: { phone: "919876540001" },
    });
  }

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  for (const rp of pendingRohitPayments) {
    await prisma.payment.update({
      where: { id: rp.id },
      data: { dueDate: pastDate },
    });
  }

  await testReminderCron();

  // Verify that the payment due date has snoozed (moved to future date)
  const updatedPayments = await prisma.payment.findMany({
    where: { customer: { businessId: business.id }, status: "pending" },
  });
  console.log(`Updated payments count: ${updatedPayments.length}`);
  if (updatedPayments.length > 0) {
    console.log(`New Due Date for Rohit's pending payment: ${updatedPayments[0].dueDate}`);
  }

  // Check mock logs of outgoing messages
  const mockLogsRes = await fetch("http://localhost:3000/api/mock/whatsapp/logs");
  const mockLogsData = await mockLogsRes.json();
  console.log("\n--- Output Bot Message Logs (Simulator Mock Logs) ---");
  console.log(JSON.stringify(mockLogsData.logs, null, 2));

  console.log("\nDone verifying!");
  process.exit(0);
}

runTests();

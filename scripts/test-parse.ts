
export {};
const API_URL = "http://localhost:3000/api/leads/parse";

async function testParse(message: string) {
  console.log(`\nTesting parse for: "${message}"`);
  console.log("-".repeat(50));

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

async function runTests() {
  console.log("Starting GPT Lead Parsing Tests...");

  await testParse("Raj, 9876543210, website banana hai, budget 15k");
  await testParse(
    "Priya ne call kiya, interior design chahiye, 50 hazar budget, 3 din baad follow up"
  );
  await testParse("Suresh 9876543210");
  await testParse(
    "Amit Gupta se baat hui, unhe ek naya mobile app banwana hai, budget 2 lakh hai, kal call karna wapas. unka num 9999888877 hai"
  );
}

runTests();

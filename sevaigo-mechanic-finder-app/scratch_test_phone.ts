import { cleanPhoneNumber, isValidPhoneNumber, getTelUri, formatPhoneDisplay, getWhatsAppUri } from "./src/lib/phone";
import { getNearbyMechanics } from "./src/lib/mechanics";

async function runTests() {
  console.log("=== SEVAIGO PHONE CALLING UNIT TESTS ===");

  // Test 1: Validation and normalization of phone numbers
  const testCases = [
    { input: "8667084522", expectedClean: "+918667084522", expectedValid: true },
    { input: "9876543210", expectedClean: "+919876543210", expectedValid: true },
    { input: "98765 43210", expectedClean: "+919876543210", expectedValid: true },
    { input: "+91 98765-43210", expectedClean: "+919876543210", expectedValid: true },
    { input: "08667084522", expectedClean: "+918667084522", expectedValid: true },
    { input: "123", expectedClean: "", expectedValid: false },
    { input: "", expectedClean: "", expectedValid: false },
    { input: null, expectedClean: "", expectedValid: false },
    { input: undefined, expectedClean: "", expectedValid: false },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const clean = cleanPhoneNumber(tc.input);
    const valid = isValidPhoneNumber(tc.input);
    const tel = getTelUri(tc.input);
    const pass = clean === tc.expectedClean && valid === tc.expectedValid;
    if (pass) {
      passed++;
      console.log(`[PASS] input "${tc.input}" => clean: "${clean}", valid: ${valid}, tel: "${tel}"`);
    } else {
      console.error(`[FAIL] input "${tc.input}" => expected clean "${tc.expectedClean}", got "${clean}"; expected valid ${tc.expectedValid}, got ${valid}`);
    }
  }

  // Test 2: Formatting display
  const display1 = formatPhoneDisplay("8667084522");
  console.log(`[TEST] formatPhoneDisplay('8667084522') => "${display1}" (Expected: "+91 86670 84522")`);
  if (display1 === "+91 86670 84522") passed++;

  // Test 3: WhatsApp URI
  const wa = getWhatsAppUri("8667084522");
  console.log(`[TEST] getWhatsAppUri('8667084522') => "${wa}"`);
  if (wa.includes("https://wa.me/918667084522")) passed++;

  // Test 4: Check actual database mechanic records
  console.log("\n=== CHECKING REGISTERED DATABASE WORKSHOP PHONES ===");
  const directory = await getNearbyMechanics({ latitude: 13.0827, longitude: 80.2707, radiusKm: 100 });
  console.log(`Found ${directory.length} workshops in database:`);
  for (const m of directory) {
    const valid = isValidPhoneNumber(m.phone);
    const tel = getTelUri(m.phone);
    const formatted = formatPhoneDisplay(m.phone);
    console.log(`- "${m.shopName}" | Owner: ${m.ownerName} | Registered Phone: "${m.phone}" => Valid: ${valid} | tel: "${tel}" | Display: "${formatted}"`);
    if (!valid) {
      console.warn(`  ⚠️ Warning: Workshop ${m.shopName} has invalid phone!`);
    }
  }

  console.log(`\nALL TESTS COMPLETED: ${passed} assertions passed.`);
}

runTests().catch(console.error);

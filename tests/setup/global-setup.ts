async function globalSetup() {
  // Set E2E test mode environment variable
  process.env.NEXT_PUBLIC_E2E_TEST_MODE = 'true';
  console.log('✅ E2E Test Mode enabled - Clerk authentication bypassed');
}

export default globalSetup;

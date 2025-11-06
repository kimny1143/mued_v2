# GitHub Secrets Configuration - REQUIRED

## ⚠️ IMPORTANT: Clerk Keys Are MANDATORY

The CI/CD pipeline **CANNOT** run without valid Clerk test keys. Mock keys will not work because Clerk validates the key format during the Next.js build process.

---

## Required GitHub Secrets

You **MUST** configure these secrets in your GitHub repository for the CI/CD pipeline to work:

### 1. CLERK_TEST_PUBLISHABLE_KEY (REQUIRED)
- **Format**: Must start with `pk_test_` followed by a valid Clerk-generated string
- **Example**: `pk_test_ZXhhbXBsZS1jbGVyay0xLmNsZXJrLmFjY291bnRzLmRldiQ`
- **Where to get it**:
  1. Go to https://dashboard.clerk.com
  2. Select your application (or create a test app)
  3. Navigate to API Keys
  4. Copy the "Publishable key" from the test environment

### 2. CLERK_TEST_SECRET_KEY (REQUIRED)
- **Format**: Must start with `sk_test_` followed by a valid Clerk-generated string
- **Example**: `sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Where to get it**:
  1. Go to https://dashboard.clerk.com
  2. Select your application
  3. Navigate to API Keys
  4. Copy the "Secret key" from the test environment
- **⚠️ Security**: Never commit this to code or share publicly!

---

## How to Add Secrets to GitHub

1. Go to your repository: `https://github.com/[your-org]/mued_v2`
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret:
   - Name: `CLERK_TEST_PUBLISHABLE_KEY`
   - Value: Your actual Clerk publishable key
   - Click "Add secret"
6. Repeat for `CLERK_TEST_SECRET_KEY`

---

## Creating a Test Clerk Application

If you don't have Clerk keys yet:

1. **Sign up for Clerk** (free tier available):
   - Go to https://clerk.com
   - Sign up for a free account

2. **Create a test application**:
   - Click "Create application"
   - Name it: "MUED LMS Test"
   - Select authentication methods (Email, Google, etc.)
   - Choose "Development" environment

3. **Get your keys**:
   - After creation, go to "API Keys" in the dashboard
   - Copy both the Publishable key and Secret key
   - These will be your test keys for CI/CD

---

## Temporary Workaround (NOT RECOMMENDED)

If you absolutely cannot get Clerk keys immediately, you can temporarily disable the build step in CI:

### Option 1: Skip Build in Workflow
Edit `.github/workflows/test.yml`:
```yaml
# Comment out or remove the build step
# - name: Build application
#   run: npm run build
```

### Option 2: Skip Static Generation for Auth Pages
Update `next.config.js`:
```javascript
module.exports = {
  // ... other config
  experimental: {
    // Skip static generation for dashboard pages
    isrMemoryCacheSize: 0,
  },
  // Exclude dashboard from static generation
  generateStaticParams: async () => {
    return [];
  }
}
```

**⚠️ WARNING**: These workarounds will prevent you from catching build errors in CI!

---

## Verification

After adding the secrets:

1. **Trigger a CI run**:
   ```bash
   git commit --allow-empty -m "test: verify GitHub secrets"
   git push
   ```

2. **Check the Actions tab**:
   - Go to https://github.com/[your-org]/mued_v2/actions
   - Look for the latest workflow run
   - The build step should now pass

3. **Local testing with real keys**:
   ```bash
   # Create .env.local with your test keys
   echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY" >> .env.local
   echo "CLERK_SECRET_KEY=sk_test_YOUR_KEY" >> .env.local

   # Test the build
   npm run build
   ```

---

## Security Best Practices

1. **Use separate keys for different environments**:
   - Development: Local development keys
   - Test/CI: Dedicated test keys (used in GitHub Actions)
   - Staging: Staging environment keys
   - Production: Production keys (never used in CI)

2. **Rotate keys regularly**:
   - Set a reminder to rotate test keys every 90 days
   - Immediately rotate if keys are accidentally exposed

3. **Limit key permissions**:
   - Use Clerk's API key permissions to limit what test keys can do
   - Consider read-only keys where possible

4. **Monitor key usage**:
   - Check Clerk dashboard for unusual activity
   - Set up alerts for suspicious authentication attempts

---

## Troubleshooting

### Error: "The publishableKey passed to Clerk is invalid"
**Cause**: Using a mock or incorrectly formatted key
**Solution**: Use a real Clerk test key from your dashboard

### Error: "Missing publishableKey"
**Cause**: Environment variable not set or not accessible
**Solution**: Ensure the secret is added in GitHub and spelled correctly

### Error: "Authentication failed"
**Cause**: Mismatch between publishable and secret keys
**Solution**: Ensure both keys are from the same Clerk application

### Build still fails after adding secrets
**Cause**: Secrets may not be accessible to the workflow
**Solution**:
1. Check if the workflow file references the secrets correctly
2. Ensure the secrets are added to the correct repository
3. Try re-running the workflow from the Actions tab

---

## Contact for Help

If you're blocked on getting Clerk keys:
1. Contact the MUED project lead for shared test credentials
2. Post in the team Slack channel #mued-dev
3. Create an issue in the repository with the `ci-blocked` label

---

**Document Version**: 1.0.0
**Last Updated**: 2024-11-06
**Critical**: This configuration is REQUIRED for CI/CD to function
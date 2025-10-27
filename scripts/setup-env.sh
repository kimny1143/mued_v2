#!/bin/bash

#############################################
# MUED LMS v2 - Unified Environment Setup
#
# This script consolidates all environment and deployment utilities:
# - Set Vercel environment variables
# - Verify Vercel environment
# - Setup test dependencies
#
# Usage:
#   ./setup-env.sh vercel-set      # Set Vercel environment variables
#   ./setup-env.sh vercel-verify   # Verify Vercel environment
#   ./setup-env.sh test-deps       # Install test dependencies
#   ./setup-env.sh all             # Run all setup tasks
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Function: Set Vercel Environment Variables
setup_vercel_env() {
    echo "🚀 Setting Vercel Environment Variables..."
    echo "========================================="

    if [ ! -f .env.local ]; then
        log_error ".env.local file not found!"
        exit 1
    fi

    # Read environment variables and set them in Vercel
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue

        # Remove quotes and trim whitespace
        value=$(echo "$value" | sed 's/^["'\'']//' | sed 's/["'\'']$//' | tr -d '\n' | tr -d '\r')
        key=$(echo "$key" | tr -d ' ')

        if [ ! -z "$value" ]; then
            log_info "Setting $key"

            # Handle multi-line values (like private keys)
            if [[ "$key" == *"PRIVATE_KEY"* ]] || [[ "$key" == *"CERTIFICATE"* ]]; then
                # Use printf to preserve newlines
                printf '%s' "$value" | vercel env add "$key" production --force
            else
                echo "$value" | vercel env add "$key" production --force
            fi
        fi
    done < .env.local

    log_info "Vercel environment variables set successfully!"
}

# Function: Verify Vercel Environment
verify_vercel_env() {
    echo "🔍 Verifying Vercel Environment Variables..."
    echo "==========================================="

    required_vars=(
        "DATABASE_URL"
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        "CLERK_SECRET_KEY"
        "NEXT_PUBLIC_CLERK_SIGN_IN_URL"
        "NEXT_PUBLIC_CLERK_SIGN_UP_URL"
        "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"
        "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"
        "STRIPE_SECRET_KEY"
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "OPENAI_API_KEY"
    )

    missing_vars=()

    log_info "Checking required environment variables..."

    # Get list of Vercel env vars
    vercel_vars=$(vercel env ls production 2>/dev/null)

    for var in "${required_vars[@]}"; do
        if echo "$vercel_vars" | grep -q "^$var"; then
            log_info "$var is set"

            # Check for newline issues
            value=$(vercel env pull .env.vercel 2>/dev/null && grep "^$var=" .env.vercel | cut -d'=' -f2-)
            if echo "$value" | grep -q '\\n'; then
                log_warning "$var contains escaped newlines (\\n) - this may cause issues"
            fi
        else
            log_error "$var is missing"
            missing_vars+=("$var")
        fi
    done

    # Clean up temp file
    rm -f .env.vercel

    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo ""
        log_error "Missing environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    else
        echo ""
        log_info "All required environment variables are set!"
    fi
}

# Function: Setup Test Dependencies
setup_test_dependencies() {
    echo "📦 Installing Test Dependencies..."
    echo "================================="

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed!"
        exit 1
    fi

    log_info "Node.js version: $(node --version)"

    # Install Playwright browsers
    if [ -f "package.json" ]; then
        log_info "Installing Playwright browsers..."
        npx playwright install chromium

        # Install additional test utilities
        log_info "Installing test dependencies..."
        npm install --save-dev @playwright/test vitest @testing-library/react @testing-library/jest-dom

        log_info "Test dependencies installed successfully!"
    else
        log_error "package.json not found!"
        exit 1
    fi

    # Setup test environment file if not exists
    if [ ! -f ".env.test" ]; then
        log_warning ".env.test not found. Creating from template..."

        cat > .env.test << EOF
# Test Environment Variables
TEST_BASE_URL=http://localhost:3000
TEST_STUDENT_USERNAME=test_student
TEST_STUDENT_PASSWORD=TestPassword123!
TEST_MENTOR_USERNAME=test_mentor
TEST_MENTOR_PASSWORD=TestPassword123!

# Use test database (optional)
# DATABASE_URL=your_test_database_url
EOF

        log_info "Created .env.test template. Please update with actual test credentials."
    else
        log_info ".env.test already exists"
    fi
}

# Function: Run all setup tasks
setup_all() {
    echo "🔧 Running All Setup Tasks..."
    echo "============================="
    echo ""

    setup_test_dependencies
    echo ""

    setup_vercel_env
    echo ""

    verify_vercel_env
    echo ""

    log_info "All setup tasks completed successfully!"
}

# Main command router
case "$1" in
    vercel-set)
        setup_vercel_env
        ;;
    vercel-verify)
        verify_vercel_env
        ;;
    test-deps)
        setup_test_dependencies
        ;;
    all)
        setup_all
        ;;
    *)
        echo "MUED LMS v2 - Environment Setup Utility"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  vercel-set      Set Vercel environment variables from .env.local"
        echo "  vercel-verify   Verify Vercel environment variables are set"
        echo "  test-deps       Install test dependencies (Playwright, etc.)"
        echo "  all             Run all setup tasks"
        echo ""
        exit 1
        ;;
esac
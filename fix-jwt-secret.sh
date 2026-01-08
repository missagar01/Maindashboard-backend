#!/bin/bash
# Quick script to add JWT_SECRET to .env file

echo "=========================================="
echo "JWT_SECRET Configuration Script"
echo "=========================================="
echo ""

# Get the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

echo "📁 Project directory: $PROJECT_DIR"
echo "📄 .env file: $ENV_FILE"
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  .env file not found. Creating it..."
    touch "$ENV_FILE"
fi

# Check if JWT_SECRET already exists
if grep -q "^JWT_SECRET=" "$ENV_FILE"; then
    echo "⚠️  JWT_SECRET already exists in .env file"
    echo ""
    read -p "Do you want to regenerate it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove existing JWT_SECRET line
        sed -i '/^JWT_SECRET=/d' "$ENV_FILE"
    else
        echo "✅ Keeping existing JWT_SECRET"
        exit 0
    fi
fi

# Generate a secure JWT secret
echo "🔐 Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

if [ -z "$JWT_SECRET" ]; then
    echo "❌ Failed to generate JWT secret. Using fallback method..."
    JWT_SECRET=$(date +%s | sha256sum | base64 | head -c 32)
fi

# Add JWT_SECRET to .env
echo "" >> "$ENV_FILE"
echo "# JWT Configuration" >> "$ENV_FILE"
echo "JWT_SECRET=$JWT_SECRET" >> "$ENV_FILE"
echo "JWT_EXPIRES_IN=30d" >> "$ENV_FILE"

echo "✅ JWT_SECRET added to .env file"
echo ""
echo "📝 Generated JWT_SECRET (first 20 chars): ${JWT_SECRET:0:20}..."
echo ""
echo "✅ Configuration complete!"
echo ""
echo "Next steps:"
echo "  1. Restart PM2: pm2 restart o2d-lead-batch --update-env"
echo "  2. Check logs: pm2 logs o2d-lead-batch --lines 30"
echo ""






#!/bin/bash
# Oracle Instant Client Installation Script for AWS Ubuntu
# This script helps install Oracle Instant Client for Thick mode

set -e

echo "=========================================="
echo "Oracle Instant Client Installation Script"
echo "=========================================="
echo ""

# Check if running as root for some operations
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️ Some operations require sudo. You may be prompted for password."
fi

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
sudo apt-get update
sudo apt-get install -y libaio1t64 unzip wget curl

# Step 2: Check for existing installation
echo ""
echo "🔍 Step 2: Checking for existing Oracle Instant Client..."
EXISTING_CLIENT=$(ls -d /opt/oracle/instantclient_* 2>/dev/null | head -1)
if [ -n "$EXISTING_CLIENT" ]; then
    echo "✅ Found existing installation: $EXISTING_CLIENT"
    echo "   You can use this by setting in .env:"
    echo "   ORACLE_CLIENT=$EXISTING_CLIENT"
    read -p "   Do you want to use this existing installation? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        CLIENT_DIR="$EXISTING_CLIENT"
        SKIP_INSTALL=true
    fi
fi

if [ -z "$SKIP_INSTALL" ]; then
    # Step 3: Check for zip files
    echo ""
    echo "📥 Step 3: Checking for Oracle Instant Client zip files..."
    
    ZIP_BASIC=$(ls /tmp/instantclient-basic-linux.x64-*.zip 2>/dev/null | head -1)
    ZIP_SDK=$(ls /tmp/instantclient-sdk-linux.x64-*.zip 2>/dev/null | head -1)
    
    if [ -z "$ZIP_BASIC" ] || [ -z "$ZIP_SDK" ]; then
        echo "❌ Oracle Instant Client zip files not found in /tmp/"
        echo ""
        echo "📥 You need to download Oracle Instant Client first:"
        echo "   1. Go to: https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html"
        echo "   2. Download:"
        echo "      - instantclient-basic-linux.x64-*.zip (Basic Package)"
        echo "      - instantclient-sdk-linux.x64-*.zip (SDK Package)"
        echo "   3. Upload to /tmp/ on this server using SCP:"
        echo "      scp instantclient-*.zip ubuntu@your-server:/tmp/"
        echo ""
        echo "   Or download directly (requires Oracle account):"
        echo "   cd /tmp"
        echo "   wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basic-linux.x64-21.13.0.0.0dbru.zip"
        echo "   wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-sdk-linux.x64-21.13.0.0.0dbru.zip"
        echo ""
        exit 1
    fi
    
    echo "✅ Found zip files:"
    echo "   Basic: $ZIP_BASIC"
    echo "   SDK: $ZIP_SDK"
    
    # Step 4: Extract
    echo ""
    echo "📦 Step 4: Extracting Oracle Instant Client..."
    sudo mkdir -p /opt/oracle
    cd /opt/oracle
    
    echo "   Extracting Basic package..."
    sudo unzip -o "$ZIP_BASIC"
    echo "   Extracting SDK package..."
    sudo unzip -o "$ZIP_SDK"
    
    # Find the extracted directory
    CLIENT_DIR=$(ls -d /opt/oracle/instantclient_* | head -1)
    echo "✅ Extracted to: $CLIENT_DIR"
fi

# Step 5: Set up library path
echo ""
echo "🔧 Step 5: Setting up library path..."
echo "$CLIENT_DIR" | sudo tee /etc/ld.so.conf.d/oracle-instantclient.conf
sudo ldconfig

# Step 6: Verify installation
echo ""
echo "✅ Step 6: Verifying installation..."
if [ -f "$CLIENT_DIR/libclntsh.so" ] || [ -L "$CLIENT_DIR/libclntsh.so" ]; then
    echo "✅ Oracle Instant Client installed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Add to your .env file:"
    echo "      ORACLE_CLIENT=$CLIENT_DIR"
    echo ""
    echo "   2. Restart PM2:"
    echo "      pm2 restart o2d-lead-batch --update-env"
    echo ""
    echo "   3. Check logs to verify Thick mode:"
    echo "      pm2 logs o2d-lead-batch --lines 30"
    echo ""
    echo "   You should see:"
    echo "   ✅ Oracle Thick Client initialized at: $CLIENT_DIR"
    echo "   ✅ Running in Thick mode (Oracle Instant Client detected)"
else
    echo "❌ Installation verification failed. libclntsh.so not found."
    echo "   Check the directory: $CLIENT_DIR"
    exit 1
fi

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="






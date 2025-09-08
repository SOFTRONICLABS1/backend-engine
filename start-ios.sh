#!/bin/bash

echo "🚀 Starting iOS with comprehensive error handling..."

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Clean up any existing processes
print_status "🧹 Cleaning up existing processes..."

# Kill any existing metro/expo processes
pkill -f "expo\|metro\|react-native" 2>/dev/null || true

# Kill any process using port 8081
if lsof -ti:8081 >/dev/null 2>&1; then
    print_status "Killing processes on port 8081..."
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Step 2: Handle Watchman issues
print_status "🔧 Handling Watchman..."

if command_exists watchman; then
    print_status "Resetting Watchman state..."
    watchman shutdown-server 2>/dev/null || true
    
    # Clean up watchman state directories
    rm -rf /usr/local/var/run/watchman/*/
    rm -rf /var/folders/*/T/*/softroniclabs-mac-mini-002-state/ 2>/dev/null || true
    
    # Increase file limits for current session
    ulimit -n 16384 2>/dev/null || true
else
    print_warning "Watchman not found, proceeding without it..."
fi

# Create watchman config if it doesn't exist
if [ ! -f ".watchmanconfig" ]; then
    print_status "Creating Watchman config..."
    echo '{}' > .watchmanconfig
fi

# Step 3: Clean up Pods and caches
print_status "🧽 Cleaning iOS build artifacts..."

# Clean iOS build files
if [ -d "ios" ]; then
    cd ios
    
    # Clean Pods if they exist
    if [ -d "Pods" ] || [ -f "Podfile.lock" ]; then
        print_status "Cleaning iOS Pods..."
        rm -rf Pods Podfile.lock
        
        # Reinstall pods
        print_status "Reinstalling Pods..."
        if pod install --repo-update; then
            print_success "Pods installed successfully"
        else
            print_error "Pod install failed"
            cd ..
            exit 1
        fi
    fi
    
    cd ..
else
    print_error "iOS directory not found!"
    exit 1
fi

# Step 4: Clear Metro cache
print_status "🗑️ Clearing Metro cache..."
npx expo install --fix 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Step 5: Start Metro server with error handling
print_status "📱 Starting Metro bundler..."

# Start Metro in background with watchman disabled
WATCHMAN_DISABLE_SPAWN=true npx expo start --clear --dev-client &
METRO_PID=$!

# Wait for Metro to start
print_status "⏳ Waiting for Metro server to start..."
sleep 15

# Check if Metro is running
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "http://localhost:8081/status" > /dev/null 2>&1; then
        print_success "Metro server is running!"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        print_warning "Metro server not ready, attempt $RETRY_COUNT of $MAX_RETRIES..."
        
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            # Kill the current metro process and restart
            kill $METRO_PID 2>/dev/null || true
            sleep 3
            WATCHMAN_DISABLE_SPAWN=true npx expo start --clear --dev-client &
            METRO_PID=$!
            sleep 10
        fi
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Metro server failed to start after $MAX_RETRIES attempts"
    kill $METRO_PID 2>/dev/null || true
    exit 1
fi

# Step 6: Build and run iOS app
print_status "📱 Building and running iOS app..."

# Use expo run:ios for Expo-managed projects
if WATCHMAN_DISABLE_SPAWN=true npx expo run:ios; then
    print_success "✅ iOS app launched successfully!"
else
    print_error "❌ iOS app launch failed"
    print_status "🔍 Troubleshooting tips:"
    echo "  1. Make sure Xcode is installed and up to date"
    echo "  2. Check if iOS Simulator is available"
    echo "  3. Try running: sudo xcode-select --install"
    echo "  4. Verify iOS deployment target in ios/Podfile"
    
    # Don't kill Metro, user might want to debug
    print_status "Metro server is still running for debugging..."
    exit 1
fi

# Keep the script running so Metro stays active
print_status "🎉 iOS app is running! Metro bundler will continue running..."
print_status "Press Ctrl+C to stop Metro and exit"

# Wait for user to stop
trap "echo 'Stopping Metro server...'; kill $METRO_PID 2>/dev/null || true; exit 0" INT TERM

wait $METRO_PID
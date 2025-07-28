#!/bin/bash

# PM2 Logs Script for IQX Stock Data API
# Xem logs của ứng dụng

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default number of lines
LINES=${1:-50}

echo -e "${BLUE}📋 Viewing IQX Stock Data API logs (last $LINES lines)...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed.${NC}"
    exit 1
fi

# Check if process exists
if pm2 list | grep -q "be-iqx"; then
    echo -e "${GREEN}📊 Application status:${NC}"
    pm2 status be-iqx
    
    echo -e "${BLUE}📋 Application logs:${NC}"
    pm2 logs be-iqx --lines $LINES
else
    echo -e "${YELLOW}⚠️  No be-iqx process found running${NC}"
    echo -e "${BLUE}📁 Checking log files directly...${NC}"
    
    if [ -f "logs/combined.log" ]; then
        echo -e "${GREEN}📄 Combined logs:${NC}"
        tail -n $LINES logs/combined.log
    fi
    
    if [ -f "logs/error.log" ]; then
        echo -e "${RED}❌ Error logs:${NC}"
        tail -n $LINES logs/error.log
    fi
    
    if [ -f "logs/out.log" ]; then
        echo -e "${GREEN}📤 Output logs:${NC}"
        tail -n $LINES logs/out.log
    fi
fi

echo -e "${BLUE}💡 Tip: Use 'pm2 logs be-iqx --follow' to follow logs in real-time${NC}"

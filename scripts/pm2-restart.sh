#!/bin/bash

# PM2 Restart Script for IQX Stock Data API
# Restart ứng dụng PM2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Restarting IQX Stock Data API...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed.${NC}"
    exit 1
fi

# Check if process exists
if pm2 list | grep -q "be-iqx"; then
    echo -e "${YELLOW}🔄 Restarting be-iqx process...${NC}"
    pm2 restart be-iqx
    
    echo -e "${GREEN}✅ IQX Stock Data API restarted successfully!${NC}"
    
    # Show status
    echo -e "${BLUE}📊 Application status:${NC}"
    pm2 status
    
    # Show recent logs
    echo -e "${BLUE}📋 Recent logs:${NC}"
    pm2 logs be-iqx --lines 5
    
else
    echo -e "${YELLOW}⚠️  No be-iqx process found. Starting new process...${NC}"
    ./scripts/pm2-start.sh
fi

echo -e "${YELLOW}🌐 Application running on: http://localhost:5001${NC}"

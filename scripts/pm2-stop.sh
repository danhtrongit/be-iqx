#!/bin/bash

# PM2 Stop Script for IQX Stock Data API
# Dừng ứng dụng PM2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping IQX Stock Data API...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed.${NC}"
    exit 1
fi

# Check if process exists
if pm2 list | grep -q "be-iqx"; then
    echo -e "${YELLOW}🛑 Stopping be-iqx process...${NC}"
    pm2 stop be-iqx
    
    echo -e "${YELLOW}🗑️  Deleting be-iqx process...${NC}"
    pm2 delete be-iqx
    
    echo -e "${GREEN}✅ IQX Stock Data API stopped successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  No be-iqx process found running${NC}"
fi

# Show current PM2 status
echo -e "${BLUE}📊 Current PM2 status:${NC}"
pm2 status

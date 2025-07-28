#!/bin/bash

# PM2 Start Script for IQX Stock Data API
# Khởi động ứng dụng với PM2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting IQX Stock Data API with PM2...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed. Installing PM2...${NC}"
    npm install -g pm2
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    echo -e "${YELLOW}📁 Creating logs directory...${NC}"
    mkdir -p logs
fi

# Stop existing process if running
echo -e "${YELLOW}🛑 Stopping existing be-iqx process (if any)...${NC}"
pm2 stop be-iqx 2>/dev/null || echo -e "${BLUE}ℹ️  No existing process found${NC}"
pm2 delete be-iqx 2>/dev/null || echo -e "${BLUE}ℹ️  No existing process to delete${NC}"

# Start the application
echo -e "${GREEN}🚀 Starting be-iqx application...${NC}"
pm2 start ecosystem.config.js

# Show status
echo -e "${GREEN}📊 Application status:${NC}"
pm2 status

# Show logs
echo -e "${BLUE}📋 Recent logs:${NC}"
pm2 logs be-iqx --lines 10

echo -e "${GREEN}✅ IQX Stock Data API started successfully!${NC}"
echo -e "${BLUE}📝 Useful commands:${NC}"
echo -e "   pm2 status           - Check application status"
echo -e "   pm2 logs be-iqx      - View logs"
echo -e "   pm2 restart be-iqx   - Restart application"
echo -e "   pm2 stop be-iqx      - Stop application"
echo -e "   pm2 monit            - Monitor dashboard"
echo -e "${YELLOW}🌐 Application running on: http://localhost:5001${NC}"

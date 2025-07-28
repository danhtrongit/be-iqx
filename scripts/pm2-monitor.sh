#!/bin/bash

# PM2 Monitor Script for IQX Stock Data API
# Hiển thị thông tin monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 IQX Stock Data API Monitoring Dashboard${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed.${NC}"
    exit 1
fi

# Function to show status
show_status() {
    echo -e "${GREEN}📊 Application Status:${NC}"
    pm2 status
    echo ""
}

# Function to show system info
show_system_info() {
    echo -e "${BLUE}💻 System Information:${NC}"
    echo -e "Date: $(date)"
    echo -e "Uptime: $(uptime | cut -d',' -f1 | cut -d' ' -f4-)"
    echo -e "Load Average: $(uptime | grep -o 'load average.*' | cut -d':' -f2)"
    echo -e "Memory Usage: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}' 2>/dev/null || echo 'N/A')"
    echo -e "Disk Usage: $(df -h . | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
    echo ""
}

# Function to show app info
show_app_info() {
    if pm2 list | grep -q "be-iqx"; then
        echo -e "${GREEN}🚀 Application Information:${NC}"
        pm2 show be-iqx
        echo ""
        
        echo -e "${BLUE}📈 Performance Metrics:${NC}"
        pm2 monit --no-daemon | head -20
        echo ""
    else
        echo -e "${YELLOW}⚠️  Application not running${NC}"
        echo ""
    fi
}

# Function to show recent logs
show_recent_logs() {
    echo -e "${BLUE}📋 Recent Logs (last 10 lines):${NC}"
    if pm2 list | grep -q "be-iqx"; then
        pm2 logs be-iqx --lines 10 --nostream
    else
        echo -e "${YELLOW}⚠️  No logs available (app not running)${NC}"
    fi
    echo ""
}

# Function to test API health
test_api_health() {
    echo -e "${BLUE}🏥 API Health Check:${NC}"
    
    if command -v curl &> /dev/null; then
        if curl -s http://localhost:5001/health > /dev/null; then
            echo -e "${GREEN}✅ API is responding on port 5001${NC}"
            
            # Get health details
            HEALTH_RESPONSE=$(curl -s http://localhost:5001/health)
            echo -e "Response: $HEALTH_RESPONSE"
        else
            echo -e "${RED}❌ API is not responding on port 5001${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  curl not available for health check${NC}"
    fi
    echo ""
}

# Main monitoring function
main_monitor() {
    while true; do
        clear
        echo -e "${BLUE}📊 IQX Stock Data API - Live Monitor${NC}"
        echo -e "${BLUE}====================================${NC}"
        echo -e "Press Ctrl+C to exit | Refreshing every 5 seconds"
        echo ""
        
        show_status
        show_system_info
        test_api_health
        show_recent_logs
        
        echo -e "${YELLOW}💡 Commands: pm2 restart be-iqx | pm2 logs be-iqx | pm2 stop be-iqx${NC}"
        
        sleep 5
    done
}

# Check command line arguments
case "${1:-status}" in
    "live"|"monitor")
        main_monitor
        ;;
    "status")
        show_status
        ;;
    "info")
        show_app_info
        ;;
    "system")
        show_system_info
        ;;
    "health")
        test_api_health
        ;;
    "logs")
        show_recent_logs
        ;;
    "all")
        show_status
        show_system_info
        show_app_info
        test_api_health
        show_recent_logs
        ;;
    *)
        echo -e "${BLUE}📊 IQX PM2 Monitor Usage:${NC}"
        echo -e "  ./scripts/pm2-monitor.sh [command]"
        echo ""
        echo -e "${YELLOW}Commands:${NC}"
        echo -e "  status   - Show PM2 status (default)"
        echo -e "  live     - Live monitoring dashboard"
        echo -e "  info     - Show detailed app information"
        echo -e "  system   - Show system information"
        echo -e "  health   - Test API health"
        echo -e "  logs     - Show recent logs"
        echo -e "  all      - Show all information"
        ;;
esac

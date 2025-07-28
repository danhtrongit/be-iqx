#!/bin/bash

# Script để xử lý file backup lớn trong Git
# Xóa file lớn khỏi Git history và thêm vào .gitignore

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Git Large Files Cleanup Tool${NC}"
echo -e "${BLUE}================================${NC}"

# Check if git-filter-repo is available
if ! command -v git-filter-repo &> /dev/null; then
    echo -e "${YELLOW}⚠️  git-filter-repo not found. Installing...${NC}"
    
    # Try to install git-filter-repo
    if command -v pip3 &> /dev/null; then
        pip3 install git-filter-repo
    elif command -v brew &> /dev/null; then
        brew install git-filter-repo
    else
        echo -e "${RED}❌ Please install git-filter-repo manually:${NC}"
        echo -e "   pip3 install git-filter-repo"
        echo -e "   # or"
        echo -e "   brew install git-filter-repo"
        exit 1
    fi
fi

# Function to show large files in git
show_large_files() {
    echo -e "${BLUE}📊 Large files in Git repository:${NC}"
    git rev-list --objects --all | \
    git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
    sed -n 's/^blob //p' | \
    sort --numeric-sort --key=2 | \
    tail -20 | \
    while read objectname size rest; do
        if [ $size -gt 10485760 ]; then  # 10MB
            size_mb=$(echo "scale=2; $size / 1024 / 1024" | bc)
            echo -e "${YELLOW}  ${size_mb}MB${NC} $rest"
        fi
    done
}

# Function to remove large files from git history
remove_large_files() {
    echo -e "${YELLOW}🗑️  Removing large backup files from Git history...${NC}"
    
    # Remove backup files from git history
    git filter-repo --path backups --invert-paths --force
    
    # Remove specific large files
    git filter-repo --path '*.dump' --invert-paths --force
    git filter-repo --path '*.sql' --invert-paths --force --partial
    
    echo -e "${GREEN}✅ Large files removed from Git history${NC}"
}

# Function to clean up current working directory
cleanup_working_directory() {
    echo -e "${YELLOW}🧹 Cleaning up working directory...${NC}"
    
    # Remove backup files from working directory (keep a few recent ones)
    if [ -d "backups" ]; then
        cd backups
        
        # Keep only the 3 most recent backup files
        echo -e "${BLUE}📁 Keeping only 3 most recent backups...${NC}"
        
        # List files by modification time, keep newest 3
        ls -t *.sql *.dump 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
        
        cd ..
    fi
    
    echo -e "${GREEN}✅ Working directory cleaned${NC}"
}

# Function to setup .gitignore
setup_gitignore() {
    echo -e "${YELLOW}📝 Updating .gitignore...${NC}"
    
    # .gitignore should already be updated, but let's verify
    if ! grep -q "backups/" .gitignore; then
        echo -e "\n# Backup files (should not be in git repository)" >> .gitignore
        echo "backups/" >> .gitignore
        echo "*.sql" >> .gitignore
        echo "*.dump" >> .gitignore
        echo "*.tar.gz" >> .gitignore
    fi
    
    echo -e "${GREEN}✅ .gitignore updated${NC}"
}

# Function to force push changes
force_push_changes() {
    echo -e "${RED}⚠️  WARNING: This will force push and rewrite Git history!${NC}"
    read -p "Are you sure you want to continue? (yes/no): " -r
    
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo -e "${YELLOW}🚀 Force pushing changes...${NC}"
        
        # Add .gitignore changes
        git add .gitignore
        git commit -m "Add backup files to .gitignore and remove large files from history" || true
        
        # Force push
        git push origin main --force
        
        echo -e "${GREEN}✅ Changes pushed successfully${NC}"
    else
        echo -e "${YELLOW}❌ Force push cancelled${NC}"
    fi
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}Choose an action:${NC}"
    echo -e "1. Show large files in repository"
    echo -e "2. Remove large files from Git history (DESTRUCTIVE)"
    echo -e "3. Clean up working directory"
    echo -e "4. Update .gitignore"
    echo -e "5. Force push changes (DESTRUCTIVE)"
    echo -e "6. Do everything (DESTRUCTIVE)"
    echo -e "7. Exit"
}

# Main execution
case "${1:-menu}" in
    "show")
        show_large_files
        ;;
    "remove")
        remove_large_files
        ;;
    "cleanup")
        cleanup_working_directory
        ;;
    "gitignore")
        setup_gitignore
        ;;
    "push")
        force_push_changes
        ;;
    "all")
        echo -e "${RED}⚠️  This will perform ALL destructive operations!${NC}"
        read -p "Are you absolutely sure? (yes/no): " -r
        
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            show_large_files
            remove_large_files
            cleanup_working_directory
            setup_gitignore
            force_push_changes
        else
            echo -e "${YELLOW}❌ Operation cancelled${NC}"
        fi
        ;;
    "menu"|*)
        while true; do
            show_menu
            read -p "Enter your choice (1-7): " choice
            
            case $choice in
                1)
                    show_large_files
                    ;;
                2)
                    remove_large_files
                    ;;
                3)
                    cleanup_working_directory
                    ;;
                4)
                    setup_gitignore
                    ;;
                5)
                    force_push_changes
                    ;;
                6)
                    echo -e "${RED}⚠️  This will perform ALL destructive operations!${NC}"
                    read -p "Are you absolutely sure? (yes/no): " -r
                    
                    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
                        show_large_files
                        remove_large_files
                        cleanup_working_directory
                        setup_gitignore
                        force_push_changes
                    else
                        echo -e "${YELLOW}❌ Operation cancelled${NC}"
                    fi
                    ;;
                7)
                    echo -e "${GREEN}👋 Goodbye!${NC}"
                    exit 0
                    ;;
                *)
                    echo -e "${RED}❌ Invalid choice. Please try again.${NC}"
                    ;;
            esac
            
            echo -e "\n${BLUE}Press Enter to continue...${NC}"
            read
        done
        ;;
esac

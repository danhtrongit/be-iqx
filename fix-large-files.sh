#!/bin/bash

# Quick fix for large backup files in Git
# Xóa backup files khỏi Git và commit .gitignore

echo "🧹 Fixing large backup files in Git..."

# 1. Remove backup files from current commit
echo "📁 Removing backup files from Git tracking..."
git rm -r --cached backups/ 2>/dev/null || echo "No backups/ in git"
git rm --cached *.sql *.dump *.tar.gz 2>/dev/null || echo "No backup files in git"

# 2. Add and commit .gitignore changes
echo "📝 Committing .gitignore changes..."
git add .gitignore
git commit -m "Add backup files to .gitignore to prevent large files in repository

- Added backups/ directory to .gitignore
- Added *.sql, *.dump, *.tar.gz to .gitignore
- Removed existing backup files from Git tracking
- Backup files should be stored locally or in separate backup storage"

# 3. Push changes
echo "🚀 Pushing changes..."
git push origin main

echo "✅ Done! Backup files are now ignored by Git."
echo ""
echo "💡 Next steps:"
echo "   - Backup files will no longer be tracked by Git"
echo "   - Use 'npm run backup' to create local backups"
echo "   - Consider using external backup storage for production"
echo "   - Current backup files remain in your local backups/ folder"

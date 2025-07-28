# 🗄️ Hướng Dẫn Backup & Restore Database - IQX Stock Data API

## 📋 Tổng Quan

Hệ thống IQX cung cấp bộ công cụ backup và restore database toàn diện để bảo vệ dữ liệu quan trọng. Các tool này hỗ trợ nhiều loại backup khác nhau và tự động hóa quy trình quản lý backup.

## 🛠️ Các Tool Có Sẵn

### 1. **Database Backup Tool** (`tools/database-backup.js`)
- Tạo backup database với nhiều định dạng
- Hỗ trợ backup toàn bộ, schema-only, data-only
- Backup theo bảng cụ thể
- Backup hình ảnh và tạo manifest

### 2. **Database Restore Tool** (`tools/database-restore.js`)
- Khôi phục database từ backup files
- Hỗ trợ nhiều định dạng backup
- Tự động tạo backup trước khi restore
- Verification sau khi restore

### 3. **Backup Manager** (`tools/backup-manager.js`)
- Quản lý tổng hợp các backup
- Tự động dọn dẹp backup cũ
- Thống kê và cấu hình
- Giao diện tương tác

## 🚀 Cách Sử Dụng

### 1. Backup Database

#### Backup Toàn Bộ (Khuyến nghị)
```bash
# Sử dụng npm script
npm run backup

# Hoặc chạy trực tiếp
node tools/database-backup.js --full
```

#### Backup Schema Only
```bash
npm run backup-schema
# Chỉ backup cấu trúc bảng, không có dữ liệu
```

#### Backup Data Only
```bash
npm run backup-data
# Chỉ backup dữ liệu, không có cấu trúc
```

#### Backup Tất Cả
```bash
npm run backup-all
# Tạo full, schema, data và images backup
```

#### Backup Bảng Cụ Thể
```bash
node tools/database-backup.js --table tickers
node tools/database-backup.js --table historical_prices
```

#### Backup Với Tùy Chọn
```bash
# Backup với images
node tools/database-backup.js --full --images

# Backup custom format
node tools/database-backup.js --custom
```

### 2. Restore Database

#### Restore Tương Tác
```bash
npm run restore
# Hiển thị danh sách backup để chọn
```

#### Restore Backup Mới Nhất
```bash
npm run restore-latest
# Tự động restore backup mới nhất
```

#### Restore File Cụ Thể
```bash
node tools/database-restore.js --file backups/iqx_full_backup_2024-01-01.sql
```

#### Restore Với Images
```bash
node tools/database-restore.js --latest --images
```

#### Restore Không Tạo Backup Trước
```bash
node tools/database-restore.js --latest --no-backup
```

### 3. Quản Lý Backup

#### Giao Diện Tương Tác
```bash
npm run backup-manager
# Menu tương tác với đầy đủ tính năng
```

#### Xem Danh Sách Backup
```bash
npm run backup-list
```

#### Dọn Dẹp Backup Cũ
```bash
npm run backup-cleanup
```

#### Xem Thống Kê
```bash
npm run backup-stats
```

## 📊 Các Loại Backup

### 1. **Full Backup** (Khuyến nghị)
- **Nội dung**: Toàn bộ database + images
- **Kích thước**: Lớn nhất (~50-200MB)
- **Thời gian**: 2-5 phút
- **Sử dụng**: Backup hàng ngày, trước khi update

### 2. **Schema Backup**
- **Nội dung**: Chỉ cấu trúc bảng, indexes, constraints
- **Kích thước**: Nhỏ (~50KB)
- **Thời gian**: < 30 giây
- **Sử dụng**: Backup trước khi thay đổi schema

### 3. **Data Backup**
- **Nội dung**: Chỉ dữ liệu, không có cấu trúc
- **Kích thước**: Trung bình (~30-150MB)
- **Thời gian**: 1-3 phút
- **Sử dụng**: Backup dữ liệu để migrate

### 4. **Table Backup**
- **Nội dung**: Một bảng cụ thể
- **Kích thước**: Tùy thuộc bảng
- **Thời gian**: < 1 phút
- **Sử dụng**: Backup trước khi thay đổi bảng cụ thể

## 📁 Cấu Trúc Backup

### Thư Mục Backup
```
backups/
├── iqx_full_backup_2024-01-01T10-00-00.sql
├── iqx_schema_2024-01-01T10-00-00.sql
├── iqx_data_2024-01-01T10-00-00.sql
├── iqx_images_2024-01-01T10-00-00.tar.gz
├── iqx_backup_manifest_2024-01-01T10-00-00.json
└── backup-config.json
```

### Naming Convention
```
iqx_{type}_backup_{timestamp}.{extension}

Ví dụ:
- iqx_full_backup_2024-01-01T10-00-00.sql
- iqx_schema_2024-01-01T10-00-00.sql
- iqx_tickers_2024-01-01T10-00-00.sql
```

### Manifest File
```json
{
  "timestamp": "2024-01-01T10:00:00.000Z",
  "database": "iqx_db",
  "host": "localhost",
  "backupFiles": [
    {
      "filename": "iqx_full_backup_2024-01-01T10-00-00.sql",
      "size": 52428800,
      "sizeFormatted": "50.00 MB",
      "created": "2024-01-01T10:00:00.000Z"
    }
  ],
  "totalSize": 52428800
}
```

## ⚙️ Cấu Hình

### Backup Configuration
```json
{
  "retention": {
    "daily": 7,    // Giữ 7 backup hàng ngày
    "weekly": 4,   // Giữ 4 backup hàng tuần
    "monthly": 12  // Giữ 12 backup hàng tháng
  },
  "schedule": {
    "daily": "0 2 * * *",      // 2 AM hàng ngày
    "weekly": "0 3 * * 0",     // 3 AM Chủ nhật
    "monthly": "0 4 1 * *"     // 4 AM ngày 1 hàng tháng
  },
  "autoCleanup": true,
  "includeImages": true,
  "compression": true
}
```

### Environment Variables
```bash
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iqx_db
DB_USER=postgres
DB_PASSWORD=your_password

# Backup settings
BACKUP_RETENTION_DAYS=7
BACKUP_AUTO_CLEANUP=true
BACKUP_INCLUDE_IMAGES=true
```

## 🔄 Quy Trình Khuyến Nghị

### Backup Hàng Ngày
```bash
# Tự động (cron job)
0 2 * * * cd /path/to/iqx && npm run backup

# Thủ công
npm run backup
npm run backup-cleanup
```

### Backup Trước Khi Update
```bash
# 1. Backup toàn bộ
npm run backup-all

# 2. Thực hiện update
git pull
npm install

# 3. Restart application
npm run dev
```

### Backup Trước Khi Thay Đổi Schema
```bash
# 1. Backup schema hiện tại
npm run backup-schema

# 2. Backup data để đảm bảo
npm run backup-data

# 3. Thực hiện thay đổi
# 4. Test kỹ lưỡng
```

### Restore Trong Trường Hợp Khẩn Cấp
```bash
# 1. Dừng application
pm2 stop iqx-api  # hoặc Ctrl+C

# 2. Restore backup mới nhất
npm run restore-latest

# 3. Verify data
npm run health
npm run stats

# 4. Restart application
npm run dev
```

## 🚨 Troubleshooting

### Lỗi Kết Nối Database
```bash
# Kiểm tra PostgreSQL
sudo service postgresql status

# Kiểm tra cấu hình
cat .env | grep DB_

# Test kết nối
PGPASSWORD="your_password" pg_isready -h localhost -p 5432 -U postgres -d iqx_db
```

### Lỗi Quyền Truy Cập
```bash
# Cấp quyền cho user
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE iqx_db TO your_user;

# Hoặc sử dụng postgres user
export DB_USER=postgres
```

### Backup File Quá Lớn
```bash
# Sử dụng compression
node tools/database-backup.js --custom --compress

# Backup theo bảng
node tools/database-backup.js --table tickers
node tools/database-backup.js --table historical_prices
```

### Restore Thất Bại
```bash
# Kiểm tra file backup
file backups/your_backup.sql

# Kiểm tra database tồn tại
PGPASSWORD="password" psql -h localhost -U postgres -l | grep iqx_db

# Tạo database mới nếu cần
PGPASSWORD="password" createdb -h localhost -U postgres iqx_db
```

## 📈 Monitoring & Alerts

### Kiểm Tra Backup Thành Công
```bash
# Xem backup mới nhất
npm run backup-list | head -5

# Kiểm tra kích thước
npm run backup-stats

# Verify backup integrity
pg_dump --schema-only iqx_db | diff - backups/latest_schema.sql
```

### Cron Job Monitoring
```bash
# Thêm vào crontab
0 2 * * * cd /path/to/iqx && npm run backup >> /var/log/iqx-backup.log 2>&1

# Kiểm tra logs
tail -f /var/log/iqx-backup.log
```

### Disk Space Monitoring
```bash
# Kiểm tra dung lượng backup
du -sh backups/

# Cảnh báo khi backup folder > 1GB
if [ $(du -s backups/ | cut -f1) -gt 1048576 ]; then
  echo "Warning: Backup folder is larger than 1GB"
fi
```

## 💡 Best Practices

1. **Backup thường xuyên**: Ít nhất 1 lần/ngày
2. **Test restore**: Định kỳ test restore để đảm bảo backup hoạt động
3. **Multiple locations**: Lưu backup ở nhiều nơi (local, cloud, external drive)
4. **Monitor disk space**: Theo dõi dung lượng để tránh hết ổ cứng
5. **Document procedures**: Ghi chép quy trình cho team
6. **Automate cleanup**: Tự động xóa backup cũ để tiết kiệm dung lượng
7. **Verify integrity**: Kiểm tra tính toàn vẹn của backup files

---

**📝 Lưu ý**: Luôn test backup và restore procedures trong môi trường development trước khi áp dụng vào production.

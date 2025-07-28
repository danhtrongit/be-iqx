# 🔧 Tài Liệu Scripts - IQX Stock Data API

## 📋 Tổng Quan

Tài liệu này mô tả chi tiết tất cả các scripts có sẵn trong dự án IQX Stock Data API, bao gồm cách sử dụng, tham số, và ví dụ thực tế.

## 🚀 Scripts Cơ Bản

### 1. Khởi Động Ứng Dụng

#### `npm start`
**Mô tả:** Khởi động server ở chế độ production.
```bash
npm start
```
**Chi tiết:**
- Chạy file `src/app.js` với Node.js
- Không tự động reload khi có thay đổi code
- Phù hợp cho môi trường production

#### `npm run dev`
**Mô tả:** Khởi động server ở chế độ development với auto-reload.
```bash
npm run dev
```
**Chi tiết:**
- Sử dụng nodemon để tự động restart khi có thay đổi
- Hiển thị logs chi tiết
- Phù hợp cho môi trường development

### 2. Thiết Lập Hệ Thống

#### `npm run setup`
**Mô tả:** Khởi tạo database và cấu trúc bảng.
```bash
npm run setup
```
**Chi tiết:**
- Chạy file `setup.js`
- Tạo tất cả bảng cần thiết trong PostgreSQL
- Kiểm tra kết nối database
- Chỉ chạy một lần khi setup lần đầu

### 3. Kiểm Tra Hệ Thống

#### `npm run health`
**Mô tả:** Kiểm tra tình trạng sức khỏe của API.
```bash
npm run health
```
**Tương đương:**
```bash
curl http://localhost:5001/health
```
**Response mẫu:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600
}
```

#### `npm test`
**Mô tả:** Chạy test suite để kiểm tra các API endpoints.
```bash
npm test
```
**Chi tiết:**
- Chạy file `test_api.js`
- Kiểm tra tất cả endpoints chính
- Hiển thị kết quả pass/fail

## 📊 Scripts Thu Thập Dữ Liệu

### 1. Thu Thập Dữ Liệu Ticker

#### `npm run collect-tickers`
**Mô tả:** Thu thập dữ liệu tất cả mã chứng khoán từ Simplize API.
```bash
npm run collect-tickers
```
**Tương đương:**
```bash
curl -X POST http://localhost:5001/api/admin/collect-data
```
**Chi tiết:**
- Thu thập dữ liệu từ ~1800+ mã chứng khoán
- Sử dụng 128 workers để xử lý song song
- Thời gian thực hiện: ~15-20 phút
- Tự động download logo công ty

### 2. Thu Thập Lịch Sử Giá

#### `npm run collect-prices`
**Mô tả:** Thu thập dữ liệu giá gần đây cho tất cả mã chứng khoán.
```bash
npm run collect-prices
```
**Chi tiết:**
- Thu thập dữ liệu giá 30 ngày gần nhất
- Sử dụng danh sách ticker từ `tickers.json`
- Thời gian thực hiện: ~10-15 phút

#### `npm run collect-prices-full`
**Mô tả:** Thu thập toàn bộ lịch sử giá (tất cả dữ liệu có sẵn).
```bash
npm run collect-prices-full
```
**⚠️ Cảnh báo:** Script này có thể mất nhiều giờ để hoàn thành!

### 3. Thu Thập Dữ Liệu Sở Hữu

#### `npm run collect-ownership`
**Mô tả:** Thu thập dữ liệu cơ cấu sở hữu doanh nghiệp.
```bash
npm run collect-ownership
```
**Chi tiết:**
- Thu thập thông tin sở hữu theo nhóm nhà đầu tư
- Bao gồm: cá nhân, tổ chức, nhà nước, nước ngoài
- Thời gian thực hiện: ~5-10 phút

## 🔍 Scripts Phân Tích Kỹ Thuật

### 1. Thu Thập Dữ Liệu Kỹ Thuật Cơ Bản

#### `npm run collect-technical`
**Mô tả:** Thu thập dữ liệu phân tích kỹ thuật (khung 15 phút).
```bash
npm run collect-technical
```

### 2. Thu Thập Theo Khung Thời Gian

#### `npm run collect-technical-hour`
**Mô tả:** Thu thập dữ liệu phân tích kỹ thuật khung 1 giờ.
```bash
npm run collect-technical-hour
```

#### `npm run collect-technical-day`
**Mô tả:** Thu thập dữ liệu phân tích kỹ thuật khung 1 ngày.
```bash
npm run collect-technical-day
```

#### `npm run collect-technical-week`
**Mô tả:** Thu thập dữ liệu phân tích kỹ thuật khung 1 tuần.
```bash
npm run collect-technical-week
```

**Chi tiết chung cho tất cả scripts technical:**
- Sử dụng 128 workers để xử lý song song
- Thu thập các chỉ báo: Moving Average, Oscillator, Summary
- Bao gồm: Support/Resistance levels, Fibonacci levels
- Thời gian thực hiện: ~20-30 phút

## 📈 Scripts Chỉ Số Tác Động

### 1. Thu Thập Impact Index

#### `npm run collect-impact-index`
**Mô tả:** Thu thập chỉ số tác động thị trường từ Google Sheets.
```bash
npm run collect-impact-index
```
**Chi tiết:**
- Kết nối với Google Sheets API
- Thu thập dữ liệu cho HSX, HNX, UPCOM
- Cập nhật ranking và impact score

### 2. Kiểm Tra Impact Index

#### `npm run test-impact-hsx`
**Mô tả:** Kiểm tra top 10 cổ phiếu tác động tích cực trên HSX.
```bash
npm run test-impact-hsx
```

#### `npm run test-impact-hnx`
**Mô tả:** Kiểm tra top 10 cổ phiếu tác động tích cực trên HNX.
```bash
npm run test-impact-hnx
```

#### `npm run test-impact-upcom`
**Mô tả:** Kiểm tra top 10 cổ phiếu tác động tích cực trên UPCOM.
```bash
npm run test-impact-upcom
```

## 💰 Scripts Giao Dịch Khối Ngoại

### 1. Thu Thập Dữ Liệu

#### `npm run collect-foreign-trading`
**Mô tả:** Thu thập dữ liệu giao dịch khối ngoại.
```bash
npm run collect-foreign-trading
```

### 2. Kiểm Tra Dữ Liệu

#### `npm run test-foreign-buyers`
**Mô tả:** Xem top 10 cổ phiếu được khối ngoại mua nhiều nhất.
```bash
npm run test-foreign-buyers
```

#### `npm run test-foreign-sellers`
**Mô tả:** Xem top 10 cổ phiếu được khối ngoại bán nhiều nhất.
```bash
npm run test-foreign-sellers
```

## 📊 Scripts Thống Kê

### 1. Thống Kê Tổng Quan

#### `npm run stats`
**Mô tả:** Xem thống kê tổng quan về dữ liệu ticker.
```bash
npm run stats
```

### 2. Thống Kê Chi Tiết

#### `npm run historical-stats`
**Mô tả:** Thống kê dữ liệu lịch sử giá.
```bash
npm run historical-stats
```

#### `npm run ownership-stats`
**Mô tả:** Thống kê dữ liệu sở hữu.
```bash
npm run ownership-stats
```

#### `npm run technical-stats`
**Mô tả:** Thống kê dữ liệu phân tích kỹ thuật.
```bash
npm run technical-stats
```

#### `npm run impact-stats`
**Mô tả:** Thống kê chỉ số tác động.
```bash
npm run impact-stats
```

#### `npm run foreign-stats`
**Mô tả:** Thống kê giao dịch khối ngoại.
```bash
npm run foreign-stats
```

## 🧪 Scripts Kiểm Tra

### 1. Kiểm Tra Lịch Sử Giá

#### `npm run test-prices-1m`
**Mô tả:** Kiểm tra dữ liệu giá FPT trong 1 tháng.
```bash
npm run test-prices-1m
```

#### `npm run test-prices-1y`
**Mô tả:** Kiểm tra dữ liệu giá FPT trong 1 năm.
```bash
npm run test-prices-1y
```

### 3. Kiểm Tra Search Optimization

#### `npm run test-search`
**Mô tả:** Chạy test suite đầy đủ cho tính năng search optimization.
```bash
npm run test-search
```
**Chi tiết:**
- Kiểm tra exact match priority
- Kiểm tra partial match priority
- Kiểm tra name search functionality
- Kiểm tra mixed search results order
- Kiểm tra sorting với search priority
- Kiểm tra performance

#### `npm run test-search-examples`
**Mô tả:** Kiểm tra nhanh các ví dụ search cơ bản.
```bash
npm run test-search-examples
```
**Chi tiết:**
- Test search "FPT" (exact match)
- Test search "VN" (partial match)
- Test search "Petro" (name search)

#### `npm run demo-search`
**Mô tả:** Chạy demo tương tác để xem search optimization hoạt động.
```bash
npm run demo-search
```
**Chi tiết:**
- Demo với màu sắc và phân tích chi tiết
- Hiển thị priority của từng kết quả
- Performance testing
- So sánh trước và sau optimization

## ⚙️ Cấu Hình Scripts

### Biến Môi Trường Quan Trọng
```bash
# Port server (mặc định trong scripts: 5001)
PORT=5001

# Bật/tắt scheduler
ENABLE_SCHEDULER=true

# Số lượng workers
WORKER_COUNT=128
```

### Tùy Chỉnh Scripts
Bạn có thể tùy chỉnh các scripts trong `package.json`:
```json
{
  "scripts": {
    "custom-collect": "curl -X POST http://localhost:5001/api/admin/collect-data"
  }
}
```

## 🚨 Lưu Ý Quan Trọng

1. **Thứ tự thực hiện:** Luôn chạy `npm run setup` trước khi sử dụng các scripts khác
2. **Kiểm tra server:** Đảm bảo server đang chạy trước khi chạy các scripts API
3. **Thời gian thực hiện:** Các scripts thu thập dữ liệu có thể mất thời gian dài
4. **Rate limiting:** Một số scripts có thể bị giới hạn bởi rate limiting của API
5. **Dung lượng:** Thu thập đầy đủ dữ liệu có thể tốn nhiều dung lượng database

## 🔄 Quy Trình Khuyến Nghị

### Lần Đầu Setup
```bash
1. npm run setup
2. npm run dev (terminal khác)
3. npm run collect-tickers
4. npm run stats
```

### Thu Thập Dữ Liệu Hàng Ngày
```bash
1. npm run collect-tickers
2. npm run collect-prices
3. npm run collect-technical-day
4. npm run collect-foreign-trading
```

### Kiểm Tra Định Kỳ
```bash
1. npm run health
2. npm run stats
3. npm run test-prices-1m
```

## 🔧 Scripts Nâng Cao

### 1. Tùy Chỉnh Thu Thập Dữ Liệu

#### Thu thập dữ liệu cho một nhóm mã cụ thể
```bash
# Tạo file custom-tickers.json
echo '["FPT", "VNM", "HPG", "VIC", "MSN"]' > custom-tickers.json

# Thu thập cho nhóm này
curl -X POST http://localhost:5001/api/historical-prices/collect-bulk \
  -H 'Content-Type: application/json' \
  -d "{\"tickers\": $(cat custom-tickers.json), \"type\": \"recent\"}"
```

#### Thu thập dữ liệu với cấu hình tùy chỉnh
```bash
# Thu thập technical với ít workers hơn (tiết kiệm tài nguyên)
curl -X POST http://localhost:5001/api/technical/collect \
  -H 'Content-Type: application/json' \
  -d '{"tickers": ["FPT", "VNM"], "useWorkers": true, "workerCount": 32}'
```

### 2. Scripts Monitoring và Debugging

#### Tạo script monitoring tùy chỉnh
```bash
# Tạo file monitor.sh
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "=== IQX API Health Check ==="
echo "Thời gian: $(date)"
echo ""

# Kiểm tra server
echo "1. Kiểm tra server..."
curl -s http://localhost:5001/health | jq '.status' || echo "❌ Server không phản hồi"

# Kiểm tra database
echo "2. Kiểm tra database..."
curl -s http://localhost:5001/api/admin/health | jq '.data.database.status' || echo "❌ Database lỗi"

# Kiểm tra scheduler
echo "3. Kiểm tra scheduler..."
curl -s http://localhost:5001/api/admin/scheduler/status | jq '.data.isRunning' || echo "❌ Scheduler lỗi"

# Thống kê dữ liệu
echo "4. Thống kê dữ liệu..."
curl -s http://localhost:5001/api/tickers/statistics | jq '.data.overview.totalTickers' || echo "❌ Không lấy được thống kê"

echo ""
echo "=== Hoàn thành ==="
EOF

chmod +x monitor.sh
./monitor.sh
```

#### Script kiểm tra logs lỗi
```bash
# Tạo file check-errors.sh
cat > check-errors.sh << 'EOF'
#!/bin/bash
echo "=== Kiểm Tra Logs Lỗi ==="

# Logs thu thập dữ liệu thất bại
echo "1. Logs thu thập thất bại (10 gần nhất):"
curl -s "http://localhost:5001/api/tickers/logs?status=ERROR&limit=10" | jq '.data.logs[] | {ticker, error_message, created_at}'

echo ""
echo "2. Tỷ lệ thành công:"
curl -s "http://localhost:5001/api/tickers/logs?limit=100" | jq '.data.summary.successRate'

echo ""
echo "3. Mã có nhiều lỗi nhất:"
curl -s "http://localhost:5001/api/tickers/logs?status=ERROR&limit=50" | jq '.data.logs | group_by(.ticker) | map({ticker: .[0].ticker, count: length}) | sort_by(.count) | reverse | .[0:5]'
EOF

chmod +x check-errors.sh
./check-errors.sh
```

### 3. Scripts Backup và Maintenance

#### Backup dữ liệu quan trọng
```bash
# Tạo script backup
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

echo "Bắt đầu backup vào $BACKUP_DIR..."

# Backup database schema
pg_dump -h localhost -U postgres -d iqx_db --schema-only > $BACKUP_DIR/schema.sql

# Backup dữ liệu quan trọng
pg_dump -h localhost -U postgres -d iqx_db -t tickers > $BACKUP_DIR/tickers.sql
pg_dump -h localhost -U postgres -d iqx_db -t historical_prices > $BACKUP_DIR/historical_prices.sql

# Backup images
tar -czf $BACKUP_DIR/images.tar.gz src/uploads/images/

# Backup config
cp .env $BACKUP_DIR/
cp package.json $BACKUP_DIR/

echo "Backup hoàn thành: $BACKUP_DIR"
EOF

chmod +x backup.sh
```

#### Script dọn dẹp dữ liệu cũ
```bash
# Tạo script cleanup
cat > cleanup.sh << 'EOF'
#!/bin/bash
echo "=== Dọn Dẹp Dữ Liệu Cũ ==="

# Xóa logs cũ hơn 30 ngày
echo "1. Xóa logs cũ..."
find logs/ -name "*.log" -mtime +30 -delete

# Dọn dẹp images không sử dụng
echo "2. Dọn dẹp images..."
curl -X POST http://localhost:5001/api/admin/images/cleanup

# Xóa dữ liệu technical analysis cũ hơn 90 ngày (nếu cần)
echo "3. Kiểm tra dung lượng database..."
psql -h localhost -U postgres -d iqx_db -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

echo "Dọn dẹp hoàn thành!"
EOF

chmod +x cleanup.sh
```

### 4. Scripts Performance Testing

#### Test hiệu suất API
```bash
# Tạo script test performance
cat > performance-test.sh << 'EOF'
#!/bin/bash
echo "=== Test Hiệu Suất API ==="

# Test endpoint cơ bản
echo "1. Test GET /api/tickers (10 requests):"
for i in {1..10}; do
  time curl -s http://localhost:5001/api/tickers?limit=10 > /dev/null
done

echo ""
echo "2. Test GET /api/tickers/FPT (10 requests):"
for i in {1..10}; do
  time curl -s http://localhost:5001/api/tickers/FPT > /dev/null
done

echo ""
echo "3. Test search endpoint (5 requests):"
for i in {1..5}; do
  time curl -s "http://localhost:5001/api/tickers/search?query=FPT&limit=20" > /dev/null
done

echo ""
echo "4. Test concurrent requests:"
# Chạy 5 requests đồng thời
for i in {1..5}; do
  curl -s http://localhost:5001/api/tickers/statistics > /dev/null &
done
wait
echo "Concurrent test hoàn thành"
EOF

chmod +x performance-test.sh
```

#### Load testing với Apache Bench (nếu có cài đặt)
```bash
# Test với ab (Apache Bench)
ab -n 100 -c 10 http://localhost:5001/api/tickers?limit=10

# Test với wrk (nếu có cài đặt)
wrk -t12 -c400 -d30s http://localhost:5001/api/tickers?limit=10
```

## 📊 Scripts Báo Cáo

### 1. Báo Cáo Hàng Ngày

#### Tạo báo cáo tự động
```bash
cat > daily-report.sh << 'EOF'
#!/bin/bash
REPORT_FILE="reports/daily_$(date +%Y%m%d).txt"
mkdir -p reports

echo "=== BÁO CÁO HÀNG NGÀY $(date) ===" > $REPORT_FILE
echo "" >> $REPORT_FILE

# Thống kê tổng quan
echo "1. THỐNG KÊ TỔNG QUAN:" >> $REPORT_FILE
curl -s http://localhost:5001/api/tickers/statistics | jq '.data.overview' >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "2. TRẠNG THÁI HỆ THỐNG:" >> $REPORT_FILE
curl -s http://localhost:5001/api/admin/health | jq '.data | {status, uptime, memory}' >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "3. SCHEDULER STATUS:" >> $REPORT_FILE
curl -s http://localhost:5001/api/admin/scheduler/status | jq '.data | {isRunning, nextRuns}' >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "4. LOGS GẦN NHẤT (10 entries):" >> $REPORT_FILE
curl -s "http://localhost:5001/api/tickers/logs?limit=10" | jq '.data.logs[] | {ticker, status, created_at}' >> $REPORT_FILE

echo "Báo cáo đã được lưu: $REPORT_FILE"
EOF

chmod +x daily-report.sh
```

### 2. Báo Cáo Hiệu Suất

#### Phân tích hiệu suất thu thập dữ liệu
```bash
cat > performance-report.sh << 'EOF'
#!/bin/bash
echo "=== BÁO CÁO HIỆU SUẤT ==="

# Thống kê logs 24h gần nhất
echo "1. Thống kê 24h gần nhất:"
curl -s "http://localhost:5001/api/tickers/logs?limit=1000" | jq '
.data.logs |
map(select(.created_at > (now - 86400 | strftime("%Y-%m-%dT%H:%M:%S.%fZ")))) |
group_by(.status) |
map({status: .[0].status, count: length}) |
sort_by(.count) | reverse'

echo ""
echo "2. Thời gian xử lý trung bình:"
curl -s "http://localhost:5001/api/tickers/logs?limit=100" | jq '
.data.logs |
map(select(.processing_time_ms != null)) |
{
  avg_processing_time: (map(.processing_time_ms) | add / length),
  min_processing_time: (map(.processing_time_ms) | min),
  max_processing_time: (map(.processing_time_ms) | max)
}'

echo ""
echo "3. Top 10 mã chậm nhất:"
curl -s "http://localhost:5001/api/tickers/logs?limit=500" | jq '
.data.logs |
map(select(.processing_time_ms != null)) |
group_by(.ticker) |
map({
  ticker: .[0].ticker,
  avg_time: (map(.processing_time_ms) | add / length)
}) |
sort_by(.avg_time) | reverse | .[0:10]'
EOF

chmod +x performance-report.sh
```

## 🔄 Automation Scripts

### 1. Cron Jobs Setup

#### Thiết lập cron jobs tự động
```bash
# Tạo script setup cron
cat > setup-cron.sh << 'EOF'
#!/bin/bash
echo "Thiết lập cron jobs cho IQX API..."

# Backup crontab hiện tại
crontab -l > crontab_backup_$(date +%Y%m%d).txt

# Tạo crontab mới
cat > iqx_crontab << 'CRON_EOF'
# IQX API Automation Scripts

# Backup hàng ngày lúc 2:00 AM
0 2 * * * /path/to/your/project/backup.sh >> /path/to/your/project/logs/backup.log 2>&1

# Báo cáo hàng ngày lúc 6:00 AM
0 6 * * * /path/to/your/project/daily-report.sh >> /path/to/your/project/logs/report.log 2>&1

# Dọn dẹp hàng tuần (Chủ nhật 3:00 AM)
0 3 * * 0 /path/to/your/project/cleanup.sh >> /path/to/your/project/logs/cleanup.log 2>&1

# Kiểm tra health mỗi 15 phút
*/15 * * * * /path/to/your/project/monitor.sh >> /path/to/your/project/logs/monitor.log 2>&1

# Thu thập dữ liệu bổ sung lúc 12:00 PM (nếu cần)
0 12 * * * curl -X POST http://localhost:5001/api/admin/collect-data >> /path/to/your/project/logs/manual-collect.log 2>&1
CRON_EOF

# Cài đặt crontab
crontab iqx_crontab
echo "Cron jobs đã được thiết lập!"
echo "Kiểm tra: crontab -l"
EOF

chmod +x setup-cron.sh
```

### 2. Docker Scripts (nếu sử dụng Docker)

#### Docker management scripts
```bash
# Tạo docker-compose.yml nếu chưa có
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  iqx-api:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=iqx_db
      - DB_USER=postgres
      - DB_PASSWORD=your_password
    depends_on:
      - postgres
    volumes:
      - ./src/uploads:/app/src/uploads
      - ./logs:/app/logs

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=iqx_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

volumes:
  postgres_data:
EOF

# Script quản lý Docker
cat > docker-manage.sh << 'EOF'
#!/bin/bash

case "$1" in
  start)
    echo "Khởi động IQX API với Docker..."
    docker-compose up -d
    ;;
  stop)
    echo "Dừng IQX API..."
    docker-compose down
    ;;
  restart)
    echo "Restart IQX API..."
    docker-compose restart
    ;;
  logs)
    echo "Xem logs..."
    docker-compose logs -f iqx-api
    ;;
  backup)
    echo "Backup database..."
    docker-compose exec postgres pg_dump -U postgres iqx_db > backup_$(date +%Y%m%d).sql
    ;;
  *)
    echo "Sử dụng: $0 {start|stop|restart|logs|backup}"
    exit 1
    ;;
esac
EOF

chmod +x docker-manage.sh
```

## 🚨 Emergency Scripts

### 1. Script Khôi Phục Khẩn Cấp

```bash
cat > emergency-recovery.sh << 'EOF'
#!/bin/bash
echo "=== KHÔI PHỤC KHẨN CẤP ==="

# Kiểm tra các dịch vụ cơ bản
echo "1. Kiểm tra Node.js process..."
if pgrep -f "node.*app.js" > /dev/null; then
    echo "✅ Node.js đang chạy"
else
    echo "❌ Node.js không chạy - Khởi động lại..."
    npm start &
fi

echo ""
echo "2. Kiểm tra PostgreSQL..."
if pg_isready -h localhost -p 5432 > /dev/null; then
    echo "✅ PostgreSQL đang chạy"
else
    echo "❌ PostgreSQL không chạy - Cần khởi động thủ công"
fi

echo ""
echo "3. Kiểm tra disk space..."
df -h | grep -E "(/$|/var|/tmp)"

echo ""
echo "4. Kiểm tra memory..."
free -h

echo ""
echo "5. Kiểm tra API endpoints..."
curl -s http://localhost:5001/health > /dev/null && echo "✅ API phản hồi" || echo "❌ API không phản hồi"

echo ""
echo "6. Restart services nếu cần..."
read -p "Restart tất cả services? (y/N): " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    pkill -f "node.*app.js"
    sleep 2
    npm start &
    echo "Services đã được restart"
fi
EOF

chmod +x emergency-recovery.sh
```

## 📝 Tổng Kết

### Scripts Quan Trọng Nhất

1. **`npm run setup`** - Thiết lập ban đầu
2. **`npm run dev`** - Development
3. **`npm run collect-tickers`** - Thu thập dữ liệu chính
4. **`npm run health`** - Kiểm tra sức khỏe
5. **`npm run stats`** - Xem thống kê

### Quy Trình Khuyến Nghị

#### Hàng Ngày
```bash
./monitor.sh          # Kiểm tra hệ thống
./daily-report.sh      # Tạo báo cáo
```

#### Hàng Tuần
```bash
./cleanup.sh           # Dọn dẹp
./backup.sh            # Backup
./performance-report.sh # Báo cáo hiệu suất
```

#### Khi Có Vấn Đề
```bash
./check-errors.sh      # Kiểm tra lỗi
./emergency-recovery.sh # Khôi phục khẩn cấp
```

---

**💡 Lưu ý:** Tất cả scripts đều có thể tùy chỉnh theo nhu cầu cụ thể của bạn. Hãy đọc kỹ và test trước khi sử dụng trong production.

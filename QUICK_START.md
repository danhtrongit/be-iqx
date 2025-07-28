# 🚀 Quick Start Guide - IQX Stock Data API

## Bước 1: Chuẩn bị Database

### Tạo PostgreSQL Database
```sql
-- Kết nối vào PostgreSQL
psql -U postgres

-- Tạo database
CREATE DATABASE iqx_db;

-- Tạo user (tùy chọn)
CREATE USER iqx_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE iqx_db TO iqx_user;
```

### Cấu hình Environment
```bash
# File .env đã được tạo sẵn, chỉnh sửa theo cấu hình của bạn:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iqx_db
DB_USER=postgres
DB_PASSWORD=your_password
```

## Bước 2: Khởi động Server

```bash
# Khởi động development mode (tự động reload)
npm run dev

# Hoặc production mode
npm start
```

Server sẽ chạy tại: http://localhost:3000

## Bước 3: Kiểm tra API

```bash
# Kiểm tra health
npm run health

# Hoặc
curl http://localhost:3000/health
```

## Bước 4: Thu thập dữ liệu

### Thu thập thủ công
```bash
# Sử dụng npm script
npm run collect

# Hoặc curl trực tiếp
curl -X POST http://localhost:3000/api/admin/collect-data
```

### Thu thập tự động
- Scheduler sẽ tự động chạy 2 lần/ngày (8h sáng và 8h tối)
- Có thể tắt bằng cách set `ENABLE_SCHEDULER=false` trong .env

## Bước 5: Sử dụng API

### Lấy danh sách ticker
```bash
curl "http://localhost:3000/api/tickers?page=1&limit=10"
```

### Tìm kiếm ticker
```bash
curl "http://localhost:3000/api/tickers/search?query=FPT&exchange=HOSE"
```

### Lấy thông tin ticker cụ thể
```bash
curl "http://localhost:3000/api/tickers/FPT"
```

### Xem thống kê
```bash
npm run stats
# hoặc
curl "http://localhost:3000/api/tickers/statistics"
```

## Bước 6: Quản lý hệ thống

### Kiểm tra trạng thái scheduler
```bash
curl "http://localhost:3000/api/admin/scheduler/status"
```

### Xem logs thu thập dữ liệu
```bash
curl "http://localhost:3000/api/tickers/logs"
```

### Quản lý hình ảnh
```bash
# Xem thống kê hình ảnh
curl "http://localhost:3000/api/admin/images/stats"

# Dọn dẹp hình ảnh không sử dụng
curl -X POST "http://localhost:3000/api/admin/images/cleanup"
```

## Cấu trúc dữ liệu

### Ticker Object
```json
{
  "ticker": "FPT",
  "name_vi": "Công ty Cổ phần FPT",
  "name_en": "FPT Corp",
  "price_close": 110700,
  "market_cap": 163983250926000,
  "pe_ratio": 21.89,
  "pb_ratio": 5.66,
  "roe": 28.41,
  "image_url": "https://cdn.simplize.vn/...",
  "local_image_path": "src/uploads/images/FPT_xxx.jpeg"
}
```

## Tính năng chính

✅ **Thu thập tự động**: 2 lần/ngày  
✅ **Retry logic**: Tối đa 3 lần thử lại  
✅ **Lưu hình ảnh**: Tự động tải về local  
✅ **API đầy đủ**: CRUD, search, statistics  
✅ **Logging**: Chi tiết mọi hoạt động  
✅ **Security**: Rate limiting, validation  
✅ **Admin panel**: Quản lý từ xa  

## Troubleshooting

### Lỗi kết nối database
```bash
# Kiểm tra PostgreSQL đang chạy
sudo service postgresql status

# Kiểm tra cấu hình .env
cat .env | grep DB_
```

### Lỗi thu thập dữ liệu
```bash
# Xem logs chi tiết
curl "http://localhost:3000/api/tickers/logs?limit=20"

# Kiểm tra trạng thái hệ thống
curl "http://localhost:3000/api/admin/health"
```

### Test API
```bash
# Chạy test suite
npm test
# hoặc
node test_api.js
```

## Monitoring

### Logs
- `logs/app.log` - Logs ứng dụng
- `logs/error.log` - Logs lỗi
- `logs/debug.log` - Debug logs (dev mode)

### Endpoints quan trọng
- `/health` - Health check cơ bản
- `/api/admin/health` - Health check chi tiết
- `/api/tickers/statistics` - Thống kê thị trường
- `/api/admin/scheduler/status` - Trạng thái scheduler

## Tùy chỉnh

### Thay đổi lịch thu thập
```env
# Trong .env
CRON_SCHEDULE_MORNING=0 9 * * *  # 9h sáng
CRON_SCHEDULE_EVENING=0 21 * * * # 9h tối
```

### Thay đổi rate limiting
```env
RATE_LIMIT_WINDOW_MS=900000      # 15 phút
RATE_LIMIT_MAX_REQUESTS=200      # 200 requests
```

### Thêm ticker mới
Chỉnh sửa file `tickers.json` và thêm ticker symbol mới.

## Production Deployment

1. Set `NODE_ENV=production`
2. Cấu hình reverse proxy (nginx)
3. Setup SSL certificates
4. Configure firewall
5. Setup monitoring & alerting
6. Configure log rotation

---

🎉 **Chúc mừng!** Bạn đã thiết lập thành công IQX Stock Data API!

📚 Xem thêm: `README.md` và `API_DOCUMENTATION.md` để biết chi tiết.

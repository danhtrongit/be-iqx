# 🚀 Hướng Dẫn PM2 - IQX Stock Data API

## 📋 Tổng Quan

PM2 là process manager cho Node.js applications, giúp quản lý ứng dụng IQX Stock Data API một cách chuyên nghiệp với các tính năng:

- ✅ **Auto restart** khi ứng dụng crash
- ✅ **Load balancing** với multiple instances
- ✅ **Monitoring** real-time
- ✅ **Log management** tự động
- ✅ **Zero-downtime deployment**
- ✅ **Startup scripts** tự động khởi động

## 🛠️ Cài Đặt PM2

```bash
# Cài đặt PM2 globally
npm install -g pm2

# Kiểm tra version
pm2 --version
```

## 🚀 Sử Dụng Cơ Bản

### 1. Khởi Động Ứng Dụng

```bash
# Sử dụng npm script (khuyến nghị)
npm run pm2:start

# Hoặc chạy trực tiếp
./scripts/pm2-start.sh

# Hoặc sử dụng PM2 trực tiếp
pm2 start ecosystem.config.js
```

### 2. Kiểm Tra Trạng Thái

```bash
# Xem trạng thái ứng dụng
npm run pm2:status

# Hoặc
pm2 status be-iqx
```

### 3. Xem Logs

```bash
# Xem logs gần nhất
npm run pm2:logs

# Theo dõi logs real-time
pm2 logs be-iqx --follow

# Xem logs với số dòng cụ thể
./scripts/pm2-logs.sh 100
```

### 4. Restart Ứng Dụng

```bash
# Restart ứng dụng
npm run pm2:restart

# Hoặc
pm2 restart be-iqx
```

### 5. Dừng Ứng Dụng

```bash
# Dừng ứng dụng
npm run pm2:stop

# Hoặc
pm2 stop be-iqx
```

### 6. Monitoring

```bash
# Dashboard monitoring
npm run pm2:monitor

# Live monitoring
./scripts/pm2-monitor.sh live

# Chỉ xem status
./scripts/pm2-monitor.sh status
```

## 📊 Monitoring Dashboard

### Giao Diện Web
```bash
# Khởi động web dashboard
pm2 web

# Truy cập: http://localhost:9615
```

### Terminal Dashboard
```bash
# Dashboard trong terminal
pm2 monit

# Hoặc sử dụng script tùy chỉnh
npm run pm2:monitor
```

## ⚙️ Cấu Hình Chi Tiết

### File `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'be-iqx',                    // Tên ứng dụng
    script: 'src/app.js',              // File chính
    instances: 1,                      // Số instances
    exec_mode: 'fork',                 // Chế độ thực thi
    
    env: {
      NODE_ENV: 'development',
      PORT: 5001
    },
    
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    
    // Auto restart settings
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
```

### Các Tùy Chọn Quan Trọng

| Tùy Chọn | Mô Tả | Giá Trị |
|----------|-------|---------|
| `instances` | Số process chạy song song | 1 (single), 'max' (all CPUs) |
| `exec_mode` | Chế độ thực thi | 'fork', 'cluster' |
| `watch` | Tự động restart khi file thay đổi | true/false |
| `max_memory_restart` | Restart khi vượt quá memory | '1G', '500M' |
| `max_restarts` | Số lần restart tối đa | 10, 15 |
| `min_uptime` | Thời gian tối thiểu để coi là stable | '10s', '1m' |

## 📝 Log Management

### Xem Logs
```bash
# Logs tất cả processes
pm2 logs

# Logs của be-iqx
pm2 logs be-iqx

# Logs với số dòng cụ thể
pm2 logs be-iqx --lines 50

# Follow logs real-time
pm2 logs be-iqx --follow
```

### Quản Lý Log Files
```bash
# Xóa logs cũ
pm2 flush

# Rotate logs
pm2 install pm2-logrotate

# Cấu hình log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Log Files Location
```
logs/
├── combined.log    # Tất cả logs
├── out.log        # Standard output
├── error.log      # Error logs
└── pm2.log        # PM2 system logs
```

## 🔄 Deployment & Updates

### Zero-Downtime Deployment
```bash
# Reload ứng dụng (zero-downtime)
pm2 reload be-iqx

# Restart ứng dụng (có downtime ngắn)
pm2 restart be-iqx

# Graceful reload
pm2 gracefulReload be-iqx
```

### Update Code
```bash
# 1. Pull code mới
git pull origin main

# 2. Install dependencies
npm install

# 3. Reload ứng dụng
pm2 reload be-iqx

# Hoặc sử dụng script
npm run pm2:restart
```

## 🚀 Startup Scripts

### Tự Động Khởi Động Khi Boot

```bash
# Tạo startup script
pm2 startup

# Lưu current process list
pm2 save

# Test startup script
sudo systemctl start pm2-$USER
```

### Unstartup
```bash
# Xóa startup script
pm2 unstartup systemd
```

## 📊 Performance Monitoring

### CPU & Memory Usage
```bash
# Xem usage real-time
pm2 monit

# Xem thông tin chi tiết
pm2 show be-iqx

# Xem process list với metrics
pm2 list
```

### Health Checks
```bash
# Kiểm tra health của API
curl http://localhost:5001/health

# Script tự động health check
./scripts/pm2-monitor.sh health
```

## 🔧 Troubleshooting

### Ứng Dụng Không Khởi Động
```bash
# Kiểm tra logs lỗi
pm2 logs be-iqx --err

# Kiểm tra cấu hình
pm2 show be-iqx

# Restart với verbose
pm2 restart be-iqx --log-type
```

### Memory Leaks
```bash
# Theo dõi memory usage
pm2 monit

# Restart khi memory cao
pm2 restart be-iqx

# Cấu hình auto restart khi memory cao
# Trong ecosystem.config.js: max_memory_restart: '1G'
```

### Port Conflicts
```bash
# Kiểm tra port đang sử dụng
lsof -i :5001

# Kill process sử dụng port
kill -9 $(lsof -t -i:5001)

# Restart ứng dụng
npm run pm2:restart
```

## 📈 Advanced Features

### Cluster Mode
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'be-iqx',
    script: 'src/app.js',
    instances: 'max',        // Sử dụng tất cả CPU cores
    exec_mode: 'cluster'     // Cluster mode
  }]
};
```

### Load Balancing
```bash
# Khởi động với multiple instances
pm2 start ecosystem.config.js

# Scale up/down
pm2 scale be-iqx 4    # Scale to 4 instances
pm2 scale be-iqx +2   # Add 2 more instances
```

### Environment Management
```bash
# Start với environment cụ thể
pm2 start ecosystem.config.js --env production

# Reload với environment mới
pm2 reload ecosystem.config.js --env production
```

## 🛡️ Security & Best Practices

### 1. **User Permissions**
```bash
# Chạy PM2 với user riêng (không phải root)
sudo adduser pm2user
sudo su - pm2user
```

### 2. **Log Security**
```bash
# Giới hạn quyền truy cập logs
chmod 640 logs/*.log
chown pm2user:pm2group logs/
```

### 3. **Process Limits**
```bash
# Giới hạn số process
ulimit -u 1024

# Giới hạn memory
# Trong ecosystem.config.js: max_memory_restart: '1G'
```

## 📋 Quick Commands Reference

| Command | Mô Tả |
|---------|-------|
| `npm run pm2:start` | Khởi động ứng dụng |
| `npm run pm2:stop` | Dừng ứng dụng |
| `npm run pm2:restart` | Restart ứng dụng |
| `npm run pm2:logs` | Xem logs |
| `npm run pm2:monitor` | Monitoring dashboard |
| `npm run pm2:status` | Xem trạng thái |
| `pm2 monit` | Real-time monitoring |
| `pm2 reload be-iqx` | Zero-downtime reload |
| `pm2 show be-iqx` | Chi tiết process |
| `pm2 flush` | Xóa logs |

## 🎯 Production Checklist

- [ ] PM2 đã được cài đặt globally
- [ ] Startup script đã được tạo (`pm2 startup`)
- [ ] Process list đã được lưu (`pm2 save`)
- [ ] Log rotation đã được cấu hình
- [ ] Memory limits đã được set
- [ ] Health checks đã được setup
- [ ] Monitoring đã được enable
- [ ] Backup scripts đã được test

---

**💡 Tip:** Sử dụng `npm run pm2:monitor` để có dashboard monitoring đầy đủ với health checks tự động!

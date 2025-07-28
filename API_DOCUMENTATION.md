# 📊 Tài Liệu API - IQX Stock Data API

## 🌟 Tổng Quan

IQX Stock Data API là một hệ thống API RESTful chuyên nghiệp cung cấp quyền truy cập toàn diện vào dữ liệu thị trường chứng khoán Việt Nam. API thu thập dữ liệu từ Simplize API và cung cấp các endpoint để truy xuất thông tin mã chứng khoán, tìm kiếm cổ phiếu, và quản lý việc thu thập dữ liệu.

### ✨ Tính Năng Chính
- 📈 Dữ liệu thời gian thực của 1800+ mã chứng khoán Việt Nam
- 🔍 Tìm kiếm và lọc cổ phiếu theo nhiều tiêu chí
- 📊 Phân tích kỹ thuật với các chỉ báo Moving Average, Oscillator
- 💰 Dữ liệu giao dịch khối ngoại
- 🏢 Thông tin cơ cấu sở hữu doanh nghiệp
- 📉 Lịch sử giá cổ phiếu với nhiều khung thời gian
- 🎯 Chỉ số tác động thị trường (Impact Index)
- 🤖 Tự động thu thập dữ liệu theo lịch trình
- 🖼️ Quản lý hình ảnh logo công ty

## 🌐 URL Cơ Sở

```
http://localhost:3000
```

**Lưu ý:** Trong môi trường production, thay đổi URL phù hợp với domain của bạn.

## 🔐 Xác Thực

- **API công khai**: Hiện tại mở cho tất cả người dùng
- **Admin endpoints**: Có thể yêu cầu IP whitelist trong môi trường production
- **Bảo mật**: Sử dụng Helmet.js, CORS, và rate limiting

## ⚡ Giới Hạn Tốc Độ (Rate Limiting)

| Loại Endpoint | Giới Hạn | Thời Gian |
|---------------|-----------|-----------|
| **API Chung** | 100 requests | 15 phút/IP |
| **Admin** | 10 requests | 15 phút/IP |
| **Thu Thập Dữ Liệu** | 5 requests | 1 giờ/IP |

## 📋 Định Dạng Response

### ✅ Response Thành Công
```json
{
  "success": true,
  "data": {
    // Dữ liệu trả về
  },
  "pagination": {
    "currentPage": 1,        // Trang hiện tại
    "totalPages": 10,        // Tổng số trang
    "totalCount": 100,       // Tổng số bản ghi
    "limit": 10,             // Số bản ghi mỗi trang
    "hasNext": true,         // Có trang tiếp theo
    "hasPrev": false         // Có trang trước đó
  },
  "timestamp": "2024-01-01T12:00:00.000Z"  // Thời gian response
}
```

### ❌ Response Lỗi
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",     // Loại lỗi
  "message": "Thông báo lỗi chi tiết",
  "details": {                     // Chi tiết lỗi (tùy chọn)
    "field": "ticker",
    "value": "invalid_ticker",
    "constraint": "Ticker phải là chuỗi 3-4 ký tự"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 📊 Response Với Metadata
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "totalRecords": 1872,
    "lastUpdated": "2024-01-01T08:00:00.000Z",
    "dataSource": "Simplize API",
    "processingTime": "0.245s"
  }
}
```

## 🛣️ Danh Sách Endpoints

### 1. 🏠 Root Endpoint

#### `GET /`
Lấy thông tin API và danh sách endpoints có sẵn.

**Mô tả:** Endpoint gốc cung cấp thông tin tổng quan về API, phiên bản, và danh sách tất cả endpoints có sẵn.

**Response:**
```json
{
  "success": true,
  "message": "IQX Stock Data API",
  "version": "1.0.0",
  "description": "API chuyên nghiệp cho dữ liệu chứng khoán Việt Nam",
  "endpoints": {
    "tickers": {
      "getAll": "GET /api/tickers",
      "getBySymbol": "GET /api/tickers/:ticker",
      "search": "GET /api/tickers/search",
      "statistics": "GET /api/tickers/statistics"
    },
    "admin": {
      "collectData": "POST /api/admin/collect-data",
      "health": "GET /api/admin/health"
    }
  },
  "documentation": "https://github.com/your-repo/be-iqx#api-documentation",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. 💚 Health Check

#### `GET /health`
Kiểm tra tình trạng sức khỏe cơ bản của hệ thống.

**Mô tả:** Endpoint đơn giản để kiểm tra xem API có hoạt động bình thường không.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": "50 MB",
    "heapTotal": "30 MB",
    "heapUsed": "35 MB"
  },
  "version": "1.0.0"
}
```

### 3. 📈 Ticker Endpoints

#### `GET /api/tickers`
Lấy danh sách tất cả mã chứng khoán với phân trang.

**Mô tả:** Endpoint chính để lấy danh sách tất cả mã chứng khoán có trong hệ thống với hỗ trợ phân trang.

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `page` | integer | 1 | Số trang (bắt đầu từ 1) |
| `limit` | integer | 50 | Số bản ghi mỗi trang (tối đa 100) |

**Ví dụ:**
```bash
# Lấy 10 mã chứng khoán đầu tiên
curl "http://localhost:3000/api/tickers?page=1&limit=10"

# Lấy trang thứ 5 với 20 mã mỗi trang
curl "http://localhost:3000/api/tickers?page=5&limit=20"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tickers": [
      {
        "id": 1,
        "ticker": "FPT",
        "name_vi": "Công ty Cổ phần FPT",
        "name_en": "FPT Corp",
        "stock_exchange": "HOSE",
        "price_close": 110700,
        "market_cap": 163983250926000,
        "pe_ratio": 21.89,
        "pb_ratio": 5.66,
        "roe": 28.41,
        "roa": 14.05,
        "industry_activity": "Phần mềm và dịch vụ CNTT",
        "image_url": "https://cdn.simplize.vn/simplizevn/logo/FPT.jpeg",
        "updated_at": "2024-01-01T12:00:00.000Z"
      }
    ]
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 187,
    "totalCount": 1872,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "metadata": {
    "lastUpdated": "2024-01-01T08:00:00.000Z",
    "totalMarketCap": 5000000000000000
  }
}
```

#### `GET /api/tickers/:ticker`
Lấy thông tin chi tiết của một mã chứng khoán cụ thể.

**Mô tả:** Truy xuất tất cả thông tin chi tiết của một mã chứng khoán bao gồm giá cả, chỉ số tài chính, thông tin doanh nghiệp.

**Path Parameters:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `ticker` | string | ✅ | Mã chứng khoán (VD: "FPT", "VNM") |

**Ví dụ:**
```bash
# Lấy thông tin FPT
curl "http://localhost:3000/api/tickers/FPT"

# Lấy thông tin Vinamilk
curl "http://localhost:3000/api/tickers/VNM"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ticker": "FPT",
    "name_vi": "Công ty Cổ phần FPT",
    "name_en": "FPT Corp",
    "industry_activity": "Phần mềm và dịch vụ CNTT",
    "website": "https://fpt.com",
    "stock_exchange": "HOSE",

    // Thông tin giá cả
    "price_close": 110700,
    "price_open": 109000,
    "price_high": 112000,
    "price_low": 108500,
    "net_change": 1700,
    "pct_change": 1.56,

    // Chỉ số tài chính
    "market_cap": 163983250926000,
    "pe_ratio": 21.89,
    "pb_ratio": 5.66,
    "roe": 28.41,
    "roa": 14.05,
    "eps_ratio": 5056.78,
    "book_value": 19550.45,

    // Thông tin tăng trưởng
    "revenue_5y_growth": 18.45,
    "net_income_5y_growth": 18.59,
    "price_pct_chg_1y": 25.30,

    // Hình ảnh
    "image_url": "https://cdn.simplize.vn/simplizevn/logo/FPT.jpeg",
    "local_image_path": "src/uploads/images/FPT_1234567890_abc123.jpeg",

    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

#### `GET /api/tickers/search`
Tìm kiếm mã chứng khoán với nhiều bộ lọc khác nhau.

**Mô tả:** Endpoint mạnh mẽ cho phép tìm kiếm và lọc mã chứng khoán theo nhiều tiêu chí khác nhau như tên, sàn giao dịch, ngành nghề, giá cả, vốn hóa thị trường.

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `query` | string | - | Tìm kiếm trong ticker, tên tiếng Việt, tên tiếng Anh |
| `exchange` | string | - | Sàn giao dịch: `HOSE`, `HNX`, `UPCOM` |
| `sector` | string | - | Slug ngành kinh tế (VD: `cong-nghe`) |
| `industry` | string | - | Slug nhóm ngành (VD: `phan-mem-dich-vu-cntt`) |
| `minPrice` | number | - | Giá tối thiểu (VND) |
| `maxPrice` | number | - | Giá tối đa (VND) |
| `minMarketCap` | number | - | Vốn hóa tối thiểu (VND) |
| `maxMarketCap` | number | - | Vốn hóa tối đa (VND) |
| `sortBy` | string | `ticker` | Sắp xếp theo: `ticker`, `name_vi`, `price_close`, `market_cap`, `updated_at` |
| `sortOrder` | string | `asc` | Thứ tự: `asc` (tăng dần), `desc` (giảm dần) |
| `page` | integer | 1 | Số trang |
| `limit` | integer | 50 | Số bản ghi mỗi trang (tối đa 100) |

**Ví dụ:**
```bash
# Tìm kiếm FPT trên sàn HOSE, giá trên 50,000 VND
curl "http://localhost:3000/api/tickers/search?query=FPT&exchange=HOSE&minPrice=50000&sortBy=market_cap&sortOrder=desc"

# Tìm cổ phiếu công nghệ có vốn hóa lớn
curl "http://localhost:3000/api/tickers/search?sector=cong-nghe&minMarketCap=1000000000000&sortBy=market_cap&sortOrder=desc"

# Tìm cổ phiếu giá rẻ dưới 20,000 VND
curl "http://localhost:3000/api/tickers/search?maxPrice=20000&sortBy=price_close&sortOrder=asc&limit=20"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tickers": [
      {
        "ticker": "FPT",
        "name_vi": "Công ty Cổ phần FPT",
        "stock_exchange": "HOSE",
        "price_close": 110700,
        "market_cap": 163983250926000,
        "pe_ratio": 21.89,
        "industry_activity": "Phần mềm và dịch vụ CNTT"
      }
    ]
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 45,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "applied": {
      "query": "FPT",
      "exchange": "HOSE",
      "minPrice": 50000
    },
    "available": {
      "exchanges": ["HOSE", "HNX", "UPCOM"],
      "sectors": ["cong-nghe", "ngan-hang", "bat-dong-san"]
    }
  }
}
```

#### `GET /api/tickers/statistics`
Lấy thống kê tổng quan về thị trường chứng khoán.

**Mô tả:** Cung cấp cái nhìn tổng quan về thị trường bao gồm số lượng mã chứng khoán, vốn hóa, phân bố theo sàn và ngành.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTickers": 1872,
      "totalExchanges": 3,
      "totalSectors": 15,
      "averagePrice": "45250.50",
      "totalMarketCap": 5000000000000000,
      "tickersWithImages": 1650,
      "lastUpdated": "2024-01-01T08:00:00.000Z",
      "dataCompleteness": {
        "withPrices": 1850,
        "withFinancials": 1800,
        "withImages": 1650
      }
    },
    "exchanges": [
      {
        "exchange": "HOSE",
        "count": 400,
        "averagePrice": "75000.00",
        "totalMarketCap": 3000000000000000,
        "percentage": 21.4
      },
      {
        "exchange": "HNX",
        "count": 350,
        "averagePrice": "25000.00",
        "totalMarketCap": 1500000000000000,
        "percentage": 18.7
      },
      {
        "exchange": "UPCOM",
        "count": 1122,
        "averagePrice": "15000.00",
        "totalMarketCap": 500000000000000,
        "percentage": 59.9
      }
    ],
    "topSectors": [
      {
        "sector": "Công nghệ",
        "sectorSlug": "cong-nghe",
        "count": 150,
        "averagePrice": "85000.00",
        "totalMarketCap": 800000000000000
      },
      {
        "sector": "Ngân hàng",
        "sectorSlug": "ngan-hang",
        "count": 45,
        "averagePrice": "120000.00",
        "totalMarketCap": 1200000000000000
      }
    ],
    "priceRanges": {
      "under10k": 450,
      "10k_50k": 800,
      "50k_100k": 400,
      "over100k": 222
    }
  },
  "metadata": {
    "lastDataCollection": "2024-01-01T08:00:00.000Z",
    "nextScheduledUpdate": "2024-01-01T20:00:00.000Z",
    "dataSource": "Simplize API"
  }
}
```

#### `GET /api/tickers/logs`
Lấy nhật ký thu thập dữ liệu.

**Mô tả:** Xem lịch sử thu thập dữ liệu để theo dõi quá trình và debug các lỗi có thể xảy ra.

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `ticker` | string | - | Lọc theo mã chứng khoán cụ thể |
| `status` | string | - | Lọc theo trạng thái: `SUCCESS`, `ERROR`, `RETRY` |
| `limit` | integer | 50 | Số bản ghi (tối đa 100) |
| `page` | integer | 1 | Số trang |

**Ví dụ:**
```bash
# Xem logs của FPT
curl "http://localhost:3000/api/tickers/logs?ticker=FPT&limit=20"

# Xem logs lỗi
curl "http://localhost:3000/api/tickers/logs?status=ERROR"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "ticker": "FPT",
        "status": "SUCCESS",
        "error_message": null,
        "retry_count": 0,
        "processing_time_ms": 1250,
        "data_points_collected": 45,
        "created_at": "2024-01-01T08:00:00.000Z"
      },
      {
        "id": 2,
        "ticker": "VNM",
        "status": "ERROR",
        "error_message": "API rate limit exceeded",
        "retry_count": 2,
        "processing_time_ms": null,
        "data_points_collected": 0,
        "created_at": "2024-01-01T08:01:00.000Z"
      }
    ]
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalCount": 500,
    "limit": 50
  },
  "summary": {
    "totalLogs": 500,
    "successRate": 95.2,
    "errorRate": 4.8,
    "averageProcessingTime": 1150
  }
}
```

### 4. 📉 Historical Prices Endpoints

#### `GET /api/historical-prices/statistics`
Lấy thống kê dữ liệu lịch sử giá.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalRecords": 2500000,
      "totalTickers": 1850,
      "dateRange": {
        "earliest": "2010-01-01",
        "latest": "2024-01-01"
      },
      "averageRecordsPerTicker": 1351,
      "lastUpdated": "2024-01-01T08:00:00.000Z"
    },
    "coverage": {
      "daily": 1850,
      "weekly": 1850,
      "monthly": 1850
    }
  }
}
```

#### `GET /api/historical-prices/:ticker`
Lấy lịch sử giá của một mã chứng khoán.

**Path Parameters:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `ticker` | string | ✅ | Mã chứng khoán |

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `from` | date | 30 ngày trước | Ngày bắt đầu (YYYY-MM-DD) |
| `to` | date | hôm nay | Ngày kết thúc (YYYY-MM-DD) |
| `interval` | string | `1d` | Khoảng thời gian: `1d`, `1w`, `1m` |
| `limit` | integer | 100 | Số bản ghi (tối đa 1000) |

**Ví dụ:**
```bash
# Lấy giá FPT 30 ngày gần nhất
curl "http://localhost:3000/api/historical-prices/FPT"

# Lấy giá FPT từ đầu năm
curl "http://localhost:3000/api/historical-prices/FPT?from=2024-01-01&to=2024-12-31"
```

#### `GET /api/historical-prices/:ticker/period/:period`
Lấy lịch sử giá theo khoảng thời gian định sẵn.

**Path Parameters:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `ticker` | string | ✅ | Mã chứng khoán |
| `period` | string | ✅ | Khoảng: `1w`, `1m`, `3m`, `6m`, `1y`, `2y`, `5y`, `max` |

**Ví dụ:**
```bash
# Giá FPT 1 tháng
curl "http://localhost:3000/api/historical-prices/FPT/period/1m"

# Giá FPT 1 năm
curl "http://localhost:3000/api/historical-prices/FPT/period/1y"
```

### 5. 🔧 Technical Analysis Endpoints

#### `GET /api/technical/statistics`
Lấy thống kê dữ liệu phân tích kỹ thuật.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalRecords": 450000,
      "totalTickers": 1850,
      "timeFrames": ["15m", "1h", "1d", "1w"],
      "lastUpdated": "2024-01-01T12:00:00.000Z"
    },
    "coverage": {
      "15m": 1850,
      "1h": 1850,
      "1d": 1850,
      "1w": 1850
    },
    "indicators": {
      "movingAverage": ["SMA", "EMA", "WMA"],
      "oscillators": ["RSI", "MACD", "Stochastic"],
      "supportResistance": ["Pivot", "Fibonacci"]
    }
  }
}
```

#### `GET /api/technical/:ticker`
Lấy dữ liệu phân tích kỹ thuật của một mã chứng khoán.

**Path Parameters:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `ticker` | string | ✅ | Mã chứng khoán |

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `timeFrame` | string | `1d` | Khung thời gian: `15m`, `1h`, `1d`, `1w` |
| `limit` | integer | 50 | Số bản ghi gần nhất |

**Ví dụ:**
```bash
# Phân tích kỹ thuật FPT khung ngày
curl "http://localhost:3000/api/technical/FPT?timeFrame=1d"

# Phân tích kỹ thuật FPT khung giờ
curl "http://localhost:3000/api/technical/FPT?timeFrame=1h&limit=24"
```

### 6. 🏢 Ownership Endpoints

#### `GET /api/ownership/statistics`
Lấy thống kê dữ liệu cơ cấu sở hữu.

#### `GET /api/ownership/:ticker`
Lấy cơ cấu sở hữu của một mã chứng khoán.

**Response:**
```json
{
  "success": true,
  "data": {
    "ticker": "FPT",
    "breakdown": [
      {
        "investorType": "Cá nhân trong nước",
        "percentage": 45.2,
        "level": 1
      },
      {
        "investorType": "Tổ chức trong nước",
        "percentage": 35.8,
        "level": 1
      },
      {
        "investorType": "Nhà đầu tư nước ngoài",
        "percentage": 19.0,
        "level": 1
      }
    ],
    "lastUpdated": "2024-01-01T08:00:00.000Z"
  }
}
```

### 7. 🎯 Impact Index Endpoints

#### `GET /api/impact-index/statistics`
Lấy thống kê chỉ số tác động thị trường.

#### `GET /api/impact-index/top`
Lấy danh sách cổ phiếu có tác động cao nhất.

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `type` | string | `positive` | Loại tác động: `positive`, `negative`, `absolute` |
| `exchange` | string | - | Sàn giao dịch: `HSX`, `HNX`, `UPCOM` |
| `limit` | integer | 20 | Số bản ghi (tối đa 100) |

**Ví dụ:**
```bash
# Top 10 cổ phiếu tác động tích cực trên HSX
curl "http://localhost:3000/api/impact-index/top?type=positive&exchange=HSX&limit=10"
```

#### `GET /api/impact-index/:symbol`
Lấy chỉ số tác động của một mã cụ thể.

### 8. 💰 Foreign Trading Endpoints

#### `GET /api/foreign-trading/statistics`
Lấy thống kê giao dịch khối ngoại.

#### `GET /api/foreign-trading/top-buyers`
Lấy danh sách cổ phiếu được khối ngoại mua nhiều nhất.

#### `GET /api/foreign-trading/top-sellers`
Lấy danh sách cổ phiếu được khối ngoại bán nhiều nhất.

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `limit` | integer | 20 | Số bản ghi (tối đa 100) |
| `date` | date | hôm nay | Ngày giao dịch (YYYY-MM-DD) |

**Ví dụ:**
```bash
# Top 10 cổ phiếu khối ngoại mua nhiều nhất
curl "http://localhost:3000/api/foreign-trading/top-buyers?limit=10"
```

#### `GET /api/foreign-trading/:symbol`
Lấy dữ liệu giao dịch khối ngoại của một mã cụ thể.

### 9. 🔐 Admin Endpoints

#### `POST /api/admin/collect-data`
Kích hoạt thu thập dữ liệu thủ công cho tất cả mã chứng khoán.

**Mô tả:** Endpoint quan trọng để thu thập dữ liệu từ Simplize API. Sử dụng 128 workers để xử lý song song.

**Ví dụ:**
```bash
curl -X POST "http://localhost:3000/api/admin/collect-data"
```

**Response:**
```json
{
  "success": true,
  "message": "Thu thập dữ liệu hoàn thành thành công",
  "data": {
    "startTime": "2024-01-01T10:00:00.000Z",
    "endTime": "2024-01-01T10:15:00.000Z",
    "durationSeconds": 900,
    "totalTickers": 1872,
    "workersUsed": 128,
    "apiResults": {
      "success": 1850,
      "failed": 22,
      "retried": 15
    },
    "imageResults": {
      "downloaded": 1800,
      "failed": 50,
      "skipped": 22
    },
    "performance": {
      "avgProcessingTime": "0.48s",
      "totalApiCalls": 1872,
      "rateLimit": "Không vi phạm"
    }
  }
}
```

#### `GET /api/admin/scheduler/status`
Lấy trạng thái scheduler và thời gian chạy tiếp theo.

**Mô tả:** Kiểm tra tình trạng hoạt động của hệ thống tự động thu thập dữ liệu.

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "systemStatus": "healthy",
    "jobs": [
      {
        "name": "morning_collection",
        "schedule": "0 8 * * *",
        "description": "Thu thập dữ liệu hàng ngày lúc 08:00",
        "isRunning": true,
        "lastRun": "2024-01-01T08:00:00.000Z",
        "lastStatus": "SUCCESS",
        "avgDuration": "15m 30s"
      },
      {
        "name": "evening_collection",
        "schedule": "0 20 * * *",
        "description": "Thu thập dữ liệu hàng ngày lúc 20:00",
        "isRunning": true,
        "lastRun": "2024-01-01T20:00:00.000Z",
        "lastStatus": "SUCCESS",
        "avgDuration": "14m 45s"
      }
    ],
    "dataCollectionInProgress": false,
    "nextRuns": [
      {
        "name": "evening_collection",
        "nextRun": "2024-01-01T20:00:00.000Z",
        "timeUntil": "2h 30m 15s",
        "estimatedDuration": "15m"
      }
    ],
    "statistics": {
      "totalRuns": 150,
      "successRate": 98.7,
      "avgCollectionTime": "15m 12s",
      "lastFailure": "2023-12-28T08:00:00.000Z"
    }
  }
}
```

#### `POST /api/admin/images/download`
Tải xuống hình ảnh logo cho các mã chứng khoán cụ thể.

**Mô tả:** Tải xuống và lưu trữ logo công ty từ Simplize CDN vào server local.

**Request Body:**
```json
{
  "tickers": ["FPT", "VNM", "HPG"],
  "forceUpdate": false,  // Tùy chọn: ghi đè hình ảnh đã có
  "quality": "high"      // Tùy chọn: chất lượng hình ảnh
}
```

**Ví dụ:**
```bash
curl -X POST "http://localhost:3000/api/admin/images/download" \
  -H "Content-Type: application/json" \
  -d '{"tickers": ["FPT", "VNM", "HPG"]}'
```

**Response:**
```json
{
  "success": true,
  "message": "Tải xuống hình ảnh hoàn thành",
  "data": {
    "processed": 3,
    "success": [
      {
        "ticker": "FPT",
        "originalUrl": "https://cdn.simplize.vn/simplizevn/logo/FPT.jpeg",
        "localPath": "src/uploads/images/FPT_1234567890_abc123.jpeg",
        "fileSize": "45.2 KB",
        "downloadTime": "1.2s"
      },
      {
        "ticker": "VNM",
        "originalUrl": "https://cdn.simplize.vn/simplizevn/logo/VNM.jpeg",
        "localPath": "src/uploads/images/VNM_1234567891_def456.jpeg",
        "fileSize": "38.7 KB",
        "downloadTime": "0.9s"
      }
    ],
    "failed": [
      {
        "ticker": "HPG",
        "error": "Image not found on CDN",
        "originalUrl": "https://cdn.simplize.vn/simplizevn/logo/HPG.jpeg"
      }
    ],
    "skipped": [],
    "summary": {
      "totalSize": "83.9 KB",
      "totalTime": "2.1s",
      "successRate": "66.7%"
    }
  }
}
```

#### `POST /api/admin/images/cleanup`
Dọn dẹp các hình ảnh không còn sử dụng.

**Mô tả:** Xóa các file hình ảnh không còn được tham chiếu trong database.

**Response:**
```json
{
  "success": true,
  "message": "Dọn dẹp hình ảnh hoàn thành",
  "data": {
    "scanned": 1700,
    "deletedFiles": [
      "old_image_1.jpg",
      "old_image_2.png",
      "corrupted_image_3.jpeg"
    ],
    "deletedCount": 3,
    "freedSpace": "2.5 MB",
    "remainingFiles": 1650,
    "errors": []
  }
}
```

#### `GET /api/admin/images/stats`
Lấy thống kê lưu trữ hình ảnh.

**Response:**
```json
{
  "success": true,
  "data": {
    "storage": {
      "totalFiles": 1650,
      "totalSizeBytes": 52428800,
      "totalSizeMB": "50.00",
      "averageFileSize": "31.8 KB",
      "uploadDirectory": "src/uploads/images"
    },
    "coverage": {
      "tickersWithImages": 1650,
      "tickersWithoutImages": 222,
      "coveragePercentage": "88.1%"
    },
    "fileTypes": {
      "jpeg": 1580,
      "png": 70,
      "webp": 0
    },
    "lastCleanup": "2024-01-01T06:00:00.000Z"
  }
}
```

#### `POST /api/admin/ticker/:ticker/fetch`
Thu thập dữ liệu cho một mã chứng khoán cụ thể.

**Path Parameters:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `ticker` | string | ✅ | Mã chứng khoán cần thu thập |

**Ví dụ:**
```bash
curl -X POST "http://localhost:3000/api/admin/ticker/FPT/fetch"
```

**Response:**
```json
{
  "success": true,
  "message": "Thu thập dữ liệu FPT thành công",
  "data": {
    "ticker": "FPT",
    "dataCollected": {
      "basicInfo": true,
      "financials": true,
      "technicalAnalysis": true,
      "historicalPrices": true,
      "ownership": true,
      "image": true
    },
    "processingTime": "2.3s",
    "lastUpdated": "2024-01-01T12:00:00.000Z"
  }
}
```

#### `GET /api/admin/health`
Lấy trạng thái sức khỏe chi tiết của hệ thống.

**Mô tả:** Endpoint quan trọng để monitoring hệ thống trong production.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "version": "1.0.0",
    "environment": "production",

    "database": {
      "status": "healthy",
      "connectionPool": {
        "total": 20,
        "idle": 15,
        "active": 5
      },
      "responseTime": "12ms",
      "lastQuery": "2024-01-01T12:00:00.000Z"
    },

    "memory": {
      "rss": "120 MB",
      "heapTotal": "80 MB",
      "heapUsed": "60 MB",
      "external": "15 MB",
      "usage": "75%"
    },

    "uptime": {
      "seconds": 7200,
      "formatted": "2h 0m 0s",
      "startTime": "2024-01-01T10:00:00.000Z"
    },

    "scheduler": {
      "isRunning": true,
      "activeJobs": 2,
      "nextRuns": [
        {
          "job": "evening_collection",
          "nextRun": "2024-01-01T20:00:00.000Z"
        }
      ]
    },

    "api": {
      "totalRequests": 15420,
      "requestsPerMinute": 25.3,
      "averageResponseTime": "145ms",
      "errorRate": "0.2%"
    },

    "dataFreshness": {
      "tickers": "2024-01-01T08:00:00.000Z",
      "historicalPrices": "2024-01-01T08:15:00.000Z",
      "technicalAnalysis": "2024-01-01T08:30:00.000Z"
    }
  }
}
```

### 10. 🖼️ Image Serving

#### `GET /api/images/:filename`
Phục vụ hình ảnh logo công ty đã tải xuống.

**Path Parameters:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `filename` | string | ✅ | Tên file hình ảnh |

**Ví dụ:**
```bash
# Lấy logo FPT
curl "http://localhost:3000/api/images/FPT_1234567890_abc123.jpeg"

# Sử dụng trong HTML
<img src="http://localhost:3000/api/images/FPT_1234567890_abc123.jpeg" alt="FPT Logo">
```

**Chi tiết:**
- Hỗ trợ cache headers để tối ưu hiệu suất
- Tự động detect MIME type
- Hỗ trợ range requests cho file lớn
- Bảo mật: chỉ phục vụ file trong thư mục uploads

## 🚨 Mã Lỗi và Xử Lý

### HTTP Status Codes

| Mã Lỗi | Tên | Mô Tả | Giải Pháp |
|---------|-----|-------|-----------|
| **200** | OK | Thành công | - |
| **400** | Bad Request | Tham số không hợp lệ | Kiểm tra lại query parameters và request body |
| **404** | Not Found | Không tìm thấy resource | Kiểm tra URL và tham số path |
| **429** | Too Many Requests | Vượt quá giới hạn rate limit | Chờ và thử lại sau, hoặc giảm tần suất request |
| **500** | Internal Server Error | Lỗi server nội bộ | Liên hệ admin hoặc thử lại sau |
| **503** | Service Unavailable | Dịch vụ tạm thời không khả dụng | Thử lại sau vài phút |

### Các Loại Lỗi Thường Gặp

#### 1. Validation Errors
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Tham số không hợp lệ",
  "details": {
    "field": "ticker",
    "value": "INVALID_TICKER_123",
    "constraint": "Ticker phải là chuỗi 3-4 ký tự chữ cái"
  }
}
```

#### 2. Rate Limit Errors
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Vượt quá giới hạn 100 requests/15 phút",
  "details": {
    "limit": 100,
    "window": "15 minutes",
    "resetTime": "2024-01-01T12:15:00.000Z",
    "retryAfter": 300
  }
}
```

#### 3. Database Errors
```json
{
  "success": false,
  "error": "DATABASE_ERROR",
  "message": "Không thể kết nối database",
  "details": {
    "code": "CONNECTION_TIMEOUT",
    "retryable": true
  }
}
```

#### 4. External API Errors
```json
{
  "success": false,
  "error": "EXTERNAL_API_ERROR",
  "message": "Simplize API không phản hồi",
  "details": {
    "provider": "Simplize",
    "statusCode": 503,
    "retryAfter": 60
  }
}
```

## 📊 Data Models

### 1. Ticker Object (Đối Tượng Mã Chứng Khoán)
```json
{
  "id": 1,
  "ticker": "FPT",
  "name_vi": "Công ty Cổ phần FPT",
  "name_en": "FPT Corp",

  // Thông tin doanh nghiệp
  "industry_activity": "Phần mềm và dịch vụ CNTT",
  "bc_economic_sector_name": "Công nghệ thông tin",
  "bc_economic_sector_slug": "cong-nghe-thong-tin",
  "website": "https://fpt.com",
  "stock_exchange": "HOSE",

  // Thông tin giá cả
  "price_close": 110700,
  "price_open": 109000,
  "price_high": 112000,
  "price_low": 108500,
  "price_referrance": 109000,
  "net_change": 1700,
  "pct_change": 1.56,

  // Chỉ số tài chính
  "market_cap": 163983250926000,
  "outstanding_shares_value": 1481175000,
  "pe_ratio": 21.89,
  "pb_ratio": 5.66,
  "eps_ratio": 5056.78,
  "book_value": 19550.45,
  "roe": 28.41,
  "roa": 14.05,
  "ev_ebitda_ratio": 18.5,
  "free_float_rate": 85.2,

  // Chỉ số tăng trưởng
  "revenue_5y_growth": 18.45,
  "net_income_5y_growth": 18.59,
  "revenue_ltm_growth": 15.2,
  "net_income_ltm_growth": 12.8,
  "price_pct_chg_1y": 25.30,
  "price_pct_chg_ytd": 18.45,

  // Đánh giá và điểm số
  "valuation_point": 7.5,
  "growth_point": 8.2,
  "financial_health_point": 8.8,
  "company_quality": 8.1,
  "overall_risk_level": "Trung bình",

  // Hình ảnh
  "image_url": "https://cdn.simplize.vn/simplizevn/logo/FPT.jpeg",
  "local_image_path": "src/uploads/images/FPT_1234567890_abc123.jpeg",

  // Metadata
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T12:00:00.000Z"
}
```

### 2. Historical Price Object (Đối Tượng Lịch Sử Giá)
```json
{
  "id": 12345,
  "ticker": "FPT",
  "date": "2024-01-01",
  "open": 109000,
  "high": 112000,
  "low": 108500,
  "close": 110700,
  "volume": 2500000,
  "value": 276750000000,
  "created_at": "2024-01-01T16:00:00.000Z"
}
```

### 3. Technical Analysis Object (Đối Tượng Phân Tích Kỹ Thuật)
```json
{
  "id": 67890,
  "ticker": "FPT",
  "time_frame": "1d",
  "server_date_time": "2024-01-01T12:00:00.000Z",

  // Đánh giá tổng quan
  "gauge_summary_rating": "BUY",
  "gauge_summary_values": {
    "buy": 8,
    "neutral": 3,
    "sell": 2
  },

  // Moving Average
  "gauge_moving_average_rating": "STRONG_BUY",
  "gauge_moving_average_values": {
    "sma10": 108500,
    "sma20": 106200,
    "sma50": 102800,
    "ema10": 109200,
    "ema20": 107100
  },

  // Oscillators
  "gauge_oscillator_rating": "NEUTRAL",
  "gauge_oscillator_values": {
    "rsi": 58.5,
    "macd": 1250.5,
    "stochastic": 62.3
  },

  // Support & Resistance
  "pivot_point": 110000,
  "resistance1": 111500,
  "resistance2": 113000,
  "resistance3": 114500,
  "support1": 108500,
  "support2": 107000,
  "support3": 105500,

  // Fibonacci levels
  "fib_resistance1": 111200,
  "fib_resistance2": 112800,
  "fib_resistance3": 114400,
  "fib_support1": 108800,
  "fib_support2": 107200,
  "fib_support3": 105600,

  "created_at": "2024-01-01T12:00:00.000Z"
}
```

### 4. Ownership Object (Đối Tượng Cơ Cấu Sở Hữu)
```json
{
  "id": 11111,
  "ticker": "FPT",
  "investor_type": "Cá nhân trong nước",
  "pct_of_shares_out_held_tier": 45.2,
  "parent_investor_type": "Trong nước",
  "level": 1,
  "created_at": "2024-01-01T08:00:00.000Z",
  "updated_at": "2024-01-01T08:00:00.000Z"
}
```

### 5. Impact Index Object (Đối Tượng Chỉ Số Tác Động)
```json
{
  "id": 22222,
  "symbol": "FPT",
  "exchange": "HSX",
  "impact_index": 15.75,
  "ranking": 5,
  "total_symbols": 400,
  "percentile": 98.75,
  "created_at": "2024-01-01T09:00:00.000Z",
  "updated_at": "2024-01-01T09:00:00.000Z"
}
```

### 6. Foreign Trading Object (Đối Tượng Giao Dịch Khối Ngoại)
```json
{
  "id": 33333,
  "symbol": "FPT",
  "date": "2024-01-01",
  "buy_volume": 1500000,
  "buy_value": 165750000000,
  "sell_volume": 800000,
  "sell_value": 88560000000,
  "net_volume": 700000,
  "net_value": 77190000000,
  "created_at": "2024-01-01T16:30:00.000Z"
}
```

## 💡 Ví Dụ Sử Dụng Thực Tế

### 1. 🔍 Tìm Kiếm và Lọc Cổ Phiếu

#### Tìm cổ phiếu công nghệ có vốn hóa lớn
```bash
curl "http://localhost:3000/api/tickers/search?sector=cong-nghe&sortBy=market_cap&sortOrder=desc&limit=20"
```

#### Tìm cổ phiếu tăng trưởng cao
```bash
curl "http://localhost:3000/api/tickers/search?minPrice=10000&sortBy=revenue_5y_growth&sortOrder=desc&limit=10"
```

#### Tìm cổ phiếu giá rẻ có tiềm năng
```bash
curl "http://localhost:3000/api/tickers/search?maxPrice=20000&minMarketCap=1000000000000&sortBy=roe&sortOrder=desc"
```

#### Tìm cổ phiếu ngân hàng trên HOSE
```bash
curl "http://localhost:3000/api/tickers/search?industry=ngan-hang&exchange=HOSE&sortBy=pb_ratio&sortOrder=asc"
```

### 2. 📊 Phân Tích Kỹ Thuật

#### Xem tín hiệu kỹ thuật FPT khung ngày
```bash
curl "http://localhost:3000/api/technical/FPT?timeFrame=1d"
```

#### So sánh tín hiệu nhiều khung thời gian
```bash
# Khung 1 giờ
curl "http://localhost:3000/api/technical/FPT?timeFrame=1h"

# Khung 1 ngày
curl "http://localhost:3000/api/technical/FPT?timeFrame=1d"

# Khung 1 tuần
curl "http://localhost:3000/api/technical/FPT?timeFrame=1w"
```

### 3. 📈 Phân Tích Lịch Sử Giá

#### Xem biểu đồ giá FPT 6 tháng
```bash
curl "http://localhost:3000/api/historical-prices/FPT/period/6m"
```

#### So sánh hiệu suất 1 năm của nhiều cổ phiếu
```bash
# FPT
curl "http://localhost:3000/api/historical-prices/FPT/period/1y"

# VNM
curl "http://localhost:3000/api/historical-prices/VNM/period/1y"

# HPG
curl "http://localhost:3000/api/historical-prices/HPG/period/1y"
```

### 4. 💰 Theo Dõi Khối Ngoại

#### Top cổ phiếu khối ngoại mua mạnh
```bash
curl "http://localhost:3000/api/foreign-trading/top-buyers?limit=10"
```

#### Top cổ phiếu khối ngoại bán mạnh
```bash
curl "http://localhost:3000/api/foreign-trading/top-sellers?limit=10"
```

#### Xem giao dịch khối ngoại của FPT
```bash
curl "http://localhost:3000/api/foreign-trading/FPT"
```

### 5. 🎯 Chỉ Số Tác Động Thị Trường

#### Top cổ phiếu tác động tích cực HSX
```bash
curl "http://localhost:3000/api/impact-index/top?type=positive&exchange=HSX&limit=10"
```

#### Top cổ phiếu tác động tiêu cực HNX
```bash
curl "http://localhost:3000/api/impact-index/top?type=negative&exchange=HNX&limit=10"
```

### 6. 🔧 Quản Trị Hệ Thống

#### Kiểm tra sức khỏe hệ thống
```bash
curl "http://localhost:3000/api/admin/health"
```

#### Theo dõi quá trình thu thập dữ liệu
```bash
curl "http://localhost:3000/api/tickers/logs?limit=50"
```

#### Kích hoạt thu thập dữ liệu thủ công
```bash
curl -X POST "http://localhost:3000/api/admin/collect-data"
```

#### Kiểm tra trạng thái scheduler
```bash
curl "http://localhost:3000/api/admin/scheduler/status"
```

### 7. 📊 Xem Thống Kê Tổng Quan

#### Thống kê thị trường chung
```bash
curl "http://localhost:3000/api/tickers/statistics"
```

#### Thống kê từng loại dữ liệu
```bash
# Lịch sử giá
curl "http://localhost:3000/api/historical-prices/statistics"

# Phân tích kỹ thuật
curl "http://localhost:3000/api/technical/statistics"

# Giao dịch khối ngoại
curl "http://localhost:3000/api/foreign-trading/statistics"

# Chỉ số tác động
curl "http://localhost:3000/api/impact-index/statistics"
```

## 🚀 Best Practices

### 1. 🔄 Sử Dụng Pagination Hiệu Quả
```bash
# Tốt: Sử dụng limit hợp lý
curl "http://localhost:3000/api/tickers?page=1&limit=50"

# Tránh: Lấy quá nhiều dữ liệu một lúc
curl "http://localhost:3000/api/tickers?limit=1000"  # Có thể bị từ chối
```

### 2. 🎯 Lọc Dữ Liệu Thông Minh
```bash
# Tốt: Lọc cụ thể để giảm dữ liệu trả về
curl "http://localhost:3000/api/tickers/search?exchange=HOSE&minMarketCap=1000000000000&limit=20"

# Tránh: Lấy tất cả rồi filter ở client
curl "http://localhost:3000/api/tickers?limit=1000"  # Không hiệu quả
```

### 3. ⚡ Cache và Performance
```bash
# Sử dụng ETags và Last-Modified headers
curl -H "If-None-Match: \"abc123\"" "http://localhost:3000/api/tickers/FPT"

# Cache dữ liệu ít thay đổi ở client
# VD: Danh sách tickers, thông tin cơ bản công ty
```

### 4. 🔍 Error Handling
```javascript
// JavaScript example
async function fetchTicker(symbol) {
  try {
    const response = await fetch(`http://localhost:3000/api/tickers/${symbol}`);

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit - chờ và thử lại
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchTicker(symbol);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching ticker:', error);
    throw error;
  }
}
```

### 5. 📱 Responsive Design với API
```javascript
// Tải dữ liệu theo từng batch cho mobile
const loadTickersInBatches = async (batchSize = 20) => {
  let page = 1;
  let allTickers = [];

  while (true) {
    const response = await fetch(
      `http://localhost:3000/api/tickers?page=${page}&limit=${batchSize}`
    );
    const data = await response.json();

    allTickers.push(...data.data.tickers);

    if (!data.pagination.hasNext) break;
    page++;
  }

  return allTickers;
};
```

## 🔧 Troubleshooting

### Các Vấn Đề Thường Gặp

#### 1. Rate Limit Exceeded
**Triệu chứng:** HTTP 429, message "Too Many Requests"
**Giải pháp:**
- Giảm tần suất requests
- Implement exponential backoff
- Sử dụng cache để giảm số lượng API calls

#### 2. Database Connection Timeout
**Triệu chứng:** HTTP 500, message "Database connection timeout"
**Giải pháp:**
- Kiểm tra kết nối database
- Restart server nếu cần
- Liên hệ admin

#### 3. Data Not Updated
**Triệu chứng:** Dữ liệu cũ, không có dữ liệu mới nhất
**Giải pháp:**
- Kiểm tra scheduler status: `GET /api/admin/scheduler/status`
- Kích hoạt thu thập thủ công: `POST /api/admin/collect-data`
- Xem logs: `GET /api/tickers/logs`

#### 4. Image Not Loading
**Triệu chứng:** Logo công ty không hiển thị
**Giải pháp:**
- Kiểm tra đường dẫn file: `GET /api/admin/images/stats`
- Tải lại images: `POST /api/admin/images/download`
- Dọn dẹp files cũ: `POST /api/admin/images/cleanup`

## 📞 Hỗ Trợ

### Liên Hệ
- **Email:** support@iqx-api.com
- **Documentation:** https://github.com/your-repo/be-iqx
- **Issues:** https://github.com/your-repo/be-iqx/issues

### Monitoring
- **Health Check:** `GET /health`
- **System Status:** `GET /api/admin/health`
- **API Metrics:** Xem logs trong `/logs/app.log`

---

**📝 Lưu ý:** Tài liệu này được cập nhật thường xuyên. Vui lòng kiểm tra phiên bản mới nhất tại repository chính thức.

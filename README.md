# IQX Stock Data API

Professional Node.js application for collecting and serving Vietnamese stock market data with high-performance parallel processing.

## 🚀 Features

- **📊 Ticker Data Collection**: Comprehensive stock information from Simplize API
- **📈 Historical Prices**: Price history with multiple timeframes (1m, 3m, 6m, 1y, 5y, all)
- **👥 Ownership Analysis**: Shareholder structure and fund holdings
- **📊 Technical Analysis**: Moving averages, oscillators, and pivot points
- **⚡ High Performance**: 128 parallel workers for lightning-fast data collection
- **🔄 Auto Scheduling**: Automated data collection twice daily + technical analysis every 30 minutes
- **🌐 RESTful API**: Clean endpoints for data access
- **🗄️ PostgreSQL**: Robust data storage with proper indexing

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Scheduler**: node-cron
- **Security**: Helmet, CORS, Rate Limiting
- **Image Processing**: Axios for downloads, local file storage
- **Logging**: Custom logging system with file rotation

## Installation

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd be-iqx
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=iqx_db
   DB_USER=your_username
   DB_PASSWORD=your_password
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Enable/disable scheduler
   ENABLE_SCHEDULER=true
   ```

4. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE iqx_db;
   ```

5. **Start the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

#### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and available endpoints |
| GET | `/health` | Basic health check |
| GET | `/api/tickers` | Get all tickers with pagination |
| GET | `/api/tickers/:ticker` | Get specific ticker data |
| GET | `/api/tickers/search` | Search tickers with filters |
| GET | `/api/tickers/statistics` | Get market statistics |
| GET | `/api/tickers/logs` | Get data collection logs |
| GET | `/api/images/:filename` | Serve company logo images |

#### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/collect-data` | Manually trigger data collection |
| GET | `/api/admin/scheduler/status` | Get scheduler status |
| POST | `/api/admin/images/download` | Download images for specific tickers |
| POST | `/api/admin/images/cleanup` | Clean up orphaned images |
| GET | `/api/admin/images/stats` | Get image storage statistics |
| POST | `/api/admin/ticker/:ticker/fetch` | Fetch data for specific ticker |
| GET | `/api/admin/health` | Detailed system health check |

### Example Requests

#### Get All Tickers
```bash
curl "http://localhost:3000/api/tickers?page=1&limit=10"
```

#### Search Tickers
```bash
curl "http://localhost:3000/api/tickers/search?query=FPT&exchange=HOSE&minPrice=50000"
```

#### Get Specific Ticker
```bash
curl "http://localhost:3000/api/tickers/FPT"
```

#### Trigger Manual Data Collection
```bash
curl -X POST "http://localhost:3000/api/admin/collect-data"
```

### Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (for paginated endpoints)
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Data Collection

### Automatic Collection
- Runs twice daily at 8:00 AM and 8:00 PM (Vietnam timezone)
- Processes all tickers from `tickers.json`
- Downloads company logos automatically
- Logs all activities for monitoring

### Manual Collection
Use the admin endpoint to trigger manual collection:
```bash
curl -X POST "http://localhost:3000/api/admin/collect-data"
```

## Database Schema

### Tickers Table
Stores comprehensive stock data including:
- Basic information (ticker, names, industry)
- Financial metrics (price, market cap, ratios)
- Performance indicators (growth rates, returns)
- Technical analysis signals
- Company details and risk assessment

### Data Collection Logs
Tracks all API calls and their results for monitoring and debugging.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | iqx_db |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `ENABLE_SCHEDULER` | Enable automatic collection | true |
| `CRON_SCHEDULE_MORNING` | Morning collection time | 0 8 * * * |
| `CRON_SCHEDULE_EVENING` | Evening collection time | 0 20 * * * |
| `MAX_RETRY_ATTEMPTS` | API retry attempts | 3 |
| `RETRY_DELAY_MS` | Retry delay | 1000 |

### Rate Limiting
- General API: 100 requests per 15 minutes
- Admin endpoints: 10 requests per 15 minutes  
- Data collection: 5 requests per hour

## Monitoring

### Logs
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Debug logs: `logs/debug.log` (development only)

### Health Checks
- Basic: `GET /health`
- Detailed: `GET /api/admin/health`

### Statistics
- Market overview: `GET /api/tickers/statistics`
- Collection logs: `GET /api/tickers/logs`
- Image stats: `GET /api/admin/images/stats`

## Development

### Project Structure
```
src/
├── config/          # Database and app configuration
├── controllers/     # Request handlers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic services
├── utils/           # Utility functions
└── uploads/         # File storage
    └── images/      # Company logos
```

### Adding New Features
1. Create models in `src/models/`
2. Add business logic in `src/services/`
3. Create controllers in `src/controllers/`
4. Define routes in `src/routes/`
5. Add middleware if needed

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Set up monitoring and logging
6. Configure firewall rules

### Docker Support
```dockerfile
# Dockerfile example
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the logs for error details
- Use the health check endpoints for diagnostics
# be-iqx

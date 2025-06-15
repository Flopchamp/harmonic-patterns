# Harmonic Pattern Scanner with TradingView Integration

A web-based harmonic pattern scanner that detects and displays technical analysis patterns on interactive TradingView charts. This application scans various markets (Forex, Crypto, Metals, Stocks) in real-time to identify harmonic patterns such as Gartley, Butterfly, Bat, Crab, and ABCD patterns.

## Features

- **Pattern Detection**: Scans for multiple harmonic pattern types (Gartley, Bat, Butterfly, Crab, ABCD)
- **Multi-Market Support**: Forex, Crypto, Metals, and Stocks
- **Multiple Timeframes**: From 1-minute to Daily charts
- **Interactive TradingView Charts**: Professional-grade charting with pattern visualization
- **Real-time Updates**: Scans update every minute with WebSocket status updates
- **Pattern Visualization**: Draws patterns directly on charts
- **Trade Information**: Shows PRZ (Potential Reversal Zone), Stop Loss, and Target levels
- **Pattern Confirmation**: Uses technical indicators (RSI, MACD, Stochastic) for pattern validity
- **Confidence Scoring**: Assigns confidence scores based on pattern quality and indicator confirmation
- **API Rate Limiting**: Smart management of AlphaVantage API quota with request queuing
- **Responsive Design**: Works on desktop and mobile devices
- **Database Storage**: Saves detected patterns for historical analysis

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- Modern web browser

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/harmonic-pattern-scanner.git
   cd harmonic-pattern-scanner
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Access the application in your browser:
   ```
   http://localhost:3000
   ```

### Data Sources

The application uses the AlphaVantage API for real market data. The free tier limits are:
- 5 requests per minute
- 500 requests per day

To avoid these limitations, the application includes:
- Smart API rate limiting with request queueing
- Real-time status updates via WebSockets
- Fallback to cached or mock data when limits are reached

### Environment Setup

Create a `.env` file in the root directory with the following:

```
ALPHA_VANTAGE_API_KEY=your_api_key_here
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=harmonic_patterns
PORT=3000
```

If MySQL is not available, the application will automatically fall back to demo mode.

## Configuration

Customize your scanner by editing the following files:
- `.env` - Database and server configuration
- `src/js/scanner.js` - Modify symbols and scanning settings
- `src/js/harmonicPatterns.js` - Adjust pattern detection parameters

## Pattern Types

The scanner currently detects the following harmonic patterns:

1. **Gartley**: A pattern with precise Fibonacci ratios of 0.618, 0.382-0.886, 1.27-1.618, and 0.786
2. **Butterfly**: Features ratios of 0.786, 0.382-0.886, 1.618-2.618, and 1.27-1.618
3. **Bat**: Uses ratios of 0.382-0.5, 0.382-0.886, 1.618-2.618, and 0.886
4. **Crab**: Has ratios of 0.382-0.618, 0.382-0.886, 2.24-3.618, and 1.618
5. **ABCD**: Simple pattern with ratios of 0.382-0.618, 1.13-1.618, and 1.27-1.618

## Technical Architecture

- **Frontend**: HTML, CSS, JavaScript with Bootstrap (Responsive design)
- **Chart Integration**: TradingView Charting Library
- **Backend**: Node.js with Express
- **Database**: MySQL with automatic fallback to demo mode
- **Pattern Detection**: Custom algorithm based on Fibonacci ratios
- **Pattern Confirmation**: Technical indicators analysis (RSI, MACD, Stochastic)
- **Real-time Updates**: Scheduled scanning via JavaScript interval
- **API Management**: Smart rate limiting with WebSocket status updates
- **Data Caching**: In-memory cache system to reduce API calls

### Performance Optimizations

The application implements several performance optimizations:

1. **API Rate Limiting**: Prevents exceeding AlphaVantage quotas (5 requests/minute, 500/day)
   - Request queuing for handling traffic spikes
   - WebSocket status updates to the UI
   - Fallback to cached or mock data when limits are reached

2. **Data Caching**: Reduces API calls for frequently requested data
   - Configurable TTL (Time-To-Live) for different data types
   - Historical data cached for 24 hours
   - Mock data cached for 7 days
   - Automatic cache invalidation

3. **WebSockets**: Real-time updates without polling
   - API status broadcasts
   - Rate limit information
   - Connection status monitoring

### Directory Structure

```
harmonic-patterns/
├── backend/
│   ├── server.js            # Express server and API routes
│   ├── apiRateLimit.js      # API rate limiting logic
│   └── utils/
│       ├── dataCache.js     # Data caching utility
│       └── testRateLimit.js # Rate limiter test utility
├── public/
│   └── index.html           # Main HTML file
├── src/
│   ├── css/
│   │   └── styles.css       # Application styles
│   └── js/
│       ├── app.js           # Main application logic
│       ├── harmonicPatterns.js  # Pattern detection algorithms
│       ├── scanner.js       # Market scanner
│       ├── tradingViewChart.js  # Chart integration
│       └── confirmationIndicators.js # Technical indicators
└── .env                      # Environment variables (not in repo)
```

## License

[MIT License](LICENSE)

## Acknowledgments

- Inspired by [harmonics.app](https://harmonics.app)
- Special thanks to the technical analysis community

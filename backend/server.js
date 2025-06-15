/**
 * Backend Server
 * 
 * This file sets up the Node.js server with Express to handle API requests
 * and database interactions.
 */

const express = require('express');
const path = require('path');
// Load environment variables from the root directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const ApiRateLimiter = require('./apiRateLimit');
const dataCache = require('./utils/dataCache');

// Create API rate limiter for Alpha Vantage (5 requests per minute, 500 per day)
const alphaVantageRateLimiter = new ApiRateLimiter(5, 500);

// Log API key to check if it's being read correctly
console.log('API Key from .env:', process.env.ALPHA_VANTAGE_API_KEY);

// Flag to indicate if we're running in demo mode (fallback if db connection fails)
let useDemoMode = false;

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');

// Setup WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });
// Make WebSocket server available globally so ApiRateLimiter can access it
global.wss = wss;

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    // Send initial API rate limit status
    ws.send(JSON.stringify({ 
        type: 'apiStatus',
        minuteUsage: alphaVantageRateLimiter.minuteRequests / alphaVantageRateLimiter.requestsPerMinute,
        dayUsage: alphaVantageRateLimiter.dayRequests / alphaVantageRateLimiter.requestsPerDay,
        minuteRequests: alphaVantageRateLimiter.minuteRequests,
        dayRequests: alphaVantageRateLimiter.dayRequests,
        minuteLimit: alphaVantageRateLimiter.requestsPerMinute,
        dayLimit: alphaVantageRateLimiter.requestsPerDay
    }));
    
    // Setup interval to send API status updates
    const statusInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
                type: 'apiStatus',
                minuteUsage: alphaVantageRateLimiter.minuteRequests / alphaVantageRateLimiter.requestsPerMinute,
                dayUsage: alphaVantageRateLimiter.dayRequests / alphaVantageRateLimiter.requestsPerDay,
                minuteRequests: alphaVantageRateLimiter.minuteRequests,
                dayRequests: alphaVantageRateLimiter.dayRequests,
                minuteLimit: alphaVantageRateLimiter.requestsPerMinute,
                dayLimit: alphaVantageRateLimiter.requestsPerDay
            }));
        }
    }, 5000);
    
    ws.on('close', () => {
        console.log('Client disconnected from WebSocket');
        clearInterval(statusInterval);
    });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/src', express.static(path.join(__dirname, '..', 'src')));

// Database connection
let dbPool;

async function initializeDatabase() {
    try {
        dbPool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '4885',
            database: process.env.DB_NAME || 'harmonic_patterns',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        // Check connection
        const connection = await dbPool.getConnection();
        console.log('Database connection established');
        connection.release();
        
        // Initialize database tables if they don't exist
        await createTables();
    } catch (error) {
        console.error('Database connection error:', error);
        console.log('Falling back to demo mode');
        // If database connection fails, use demo mode as fallback
        useDemoMode = true;
    }
}

async function createTables() {
    try {
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS patterns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                pattern_type VARCHAR(20) NOT NULL,
                direction VARCHAR(10) NOT NULL,
                timeframe VARCHAR(5) NOT NULL,
                prz DECIMAL(10, 5) NOT NULL,
                stop_loss DECIMAL(10, 5) NOT NULL,
                target DECIMAL(10, 5) NOT NULL,
                points JSON NOT NULL,
                ratios JSON NOT NULL,
                timestamp BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Database tables initialized');
    } catch (error) {
        console.error('Error creating tables:', error);
    }
}

// API Routes

// Get all supported symbols
app.get('/api/symbols', async (req, res) => {
    try {
        // In a real app, these would come from a database or external API
        const symbols = {
            forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'EURGBP', 'EURJPY'],
            crypto: ['BTCUSD', 'ETHUSD', 'XRPUSD', 'LTCUSD', 'BCHUSD', 'ADAUSD', 'DOTUSD'],
            metals: ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'],
            stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'FB', 'TSLA', 'NVDA']
        };
        res.json(symbols);
    } catch (error) {
        console.error('Error fetching symbols:', error);
        res.status(500).json({ error: 'Failed to fetch symbols' });
    }
});

// Get historical data
app.get('/api/historical-data', async (req, res) => {
    try {
        const { symbol, timeframe, market } = req.query;
        
        if (!symbol || !timeframe) {
            return res.status(400).json({ error: 'Symbol and timeframe are required' });
        }
        
        const marketType = market || 'forex'; // Default to forex if not specified
        
        // Create a cache key based on the request parameters
        const cacheKey = `historical-data:${marketType}:${symbol}:${timeframe}`;
        
        // Try to get data from cache first
        const cachedData = dataCache.get(cacheKey);
        if (cachedData) {
            console.log(`Using cached data for ${symbol} (${marketType})`);
            return res.json(cachedData);
        }
          
        // Not in cache, try to fetch from a real API
        try {
            const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo'; // Get API key from environment variables
            let apiUrl;
            let timeSeriesKey;
              // Format the API URL based on the market type
            if (marketType === 'crypto') {
                // Crypto
                apiUrl = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol.split('USD')[0]}&market=USD&apikey=${apiKey}`;
                timeSeriesKey = 'Time Series (Digital Currency Daily)';
            } else if (marketType === 'stocks') {
                // Stocks
                apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
                timeSeriesKey = 'Time Series (Daily)';
            } else if (marketType === 'forex') {
                // Forex
                apiUrl = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${symbol.substring(0,3)}&to_symbol=${symbol.substring(3,6)}&apikey=${apiKey}`;
                timeSeriesKey = 'Time Series FX (Daily)';
            } else if (marketType === 'metals' && (symbol.includes('XAU') || symbol.includes('XAG'))) {
                // Metals like Gold (XAUUSD) and Silver (XAGUSD) are treated as forex
                apiUrl = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${symbol.substring(0,3)}&to_symbol=${symbol.substring(3,6)}&apikey=${apiKey}`;
                timeSeriesKey = 'Time Series FX (Daily)';
            }
              if (apiUrl) {
                console.log(`Preparing API request for: ${symbol}`);
                
                // Use axios with rate limiting
                const axios = require('axios');
                
                // Define the actual request function
                const makeApiRequest = async () => {
                    console.log(`Fetching from external API: ${apiUrl}`);
                    return await axios.get(apiUrl);
                };
                
                // Define the fallback function (generate mock data)
                const generateMockData = () => {
                    console.log(`Rate limit reached for ${symbol}, using mock data`);
                    return { 
                        data: {},  // Empty data will trigger the fallback to mock data
                        rateLimited: true 
                    };
                };
                  // Execute with rate limiting and queueing
                const response = await alphaVantageRateLimiter.queueRequest(
                    makeApiRequest, 
                    generateMockData
                );
                
                if (response.data && response.data[timeSeriesKey]) {
                    // Process the data
                    const timeSeriesData = response.data[timeSeriesKey];
                    const formattedData = [];
                    
                    // Process based on the data format
                    for (const date in timeSeriesData) {
                        const timestamp = new Date(date).getTime();
                        const values = timeSeriesData[date];
                        
                        let dataPoint = {
                            time: timestamp,
                            symbol
                        };
                        
                        if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('XRP')) {
                            // Crypto format
                            dataPoint.open = parseFloat(values['1a. open (USD)']);
                            dataPoint.high = parseFloat(values['2a. high (USD)']);
                            dataPoint.low = parseFloat(values['3a. low (USD)']);
                            dataPoint.close = parseFloat(values['4a. close (USD)']);
                        } else {
                            // Stock and forex format
                            dataPoint.open = parseFloat(values['1. open']);
                            dataPoint.high = parseFloat(values['2. high']);
                            dataPoint.low = parseFloat(values['3. low']);
                            dataPoint.close = parseFloat(values['4. close']);
                        }
                        
                        formattedData.push(dataPoint);
                    }
                      // Sort by time ascending
                    formattedData.sort((a, b) => a.time - b.time);
                    
                    // Cache the data (24 hours TTL for historical data)
                    dataCache.set(cacheKey, formattedData, 24 * 60 * 60 * 1000);
                    
                    console.log(`Successfully fetched ${formattedData.length} candles from API and cached`);
                    return res.json(formattedData);
                }
            }
        } catch (apiError) {
            console.warn('API fetch failed, falling back to mock data:', apiError.message);
        }
          // Fallback to mock data
        // Check if we have cached mock data
        const mockCacheKey = `mock-data:${marketType}:${symbol}:${timeframe}`;
        const cachedMockData = dataCache.get(mockCacheKey);
        
        if (cachedMockData) {
            console.log(`Using cached mock data for ${symbol} (${marketType})`);
            return res.json(cachedMockData);
        }
        
        // Generate fresh mock data
        console.log(`Generating new mock data for ${symbol} (${marketType})`);
        const endTime = Date.now();
        const interval = parseInt(timeframe) * 60 * 1000; // Convert to milliseconds
        const data = [];
        
        // Base price depends on the symbol
        let basePrice = 1.0;
        if (symbol.includes('BTC')) {
            basePrice = 45000 + Math.random() * 5000;
        } else if (symbol.includes('ETH')) {
            basePrice = 3000 + Math.random() * 300;
        } else if (symbol.includes('XAU')) {
            basePrice = 1800 + Math.random() * 100;
        } else if (symbol.includes('JPY')) {
            basePrice = 100 + Math.random() * 10;
        } else if (['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'FB', 'TSLA', 'NVDA'].includes(symbol)) {
            basePrice = 100 + Math.random() * 50;
        } else {
            basePrice = 1 + Math.random() * 0.2; // Forex pairs usually
        }
        
        // Generate 100 candles of historical data with some trend
        let currentPrice = basePrice;
        for (let i = 0; i < 100; i++) {
            const time = endTime - (99 - i) * interval;
            
            // Add some trend to make the data more realistic
            const trendBias = Math.sin(i / 10) * 0.005;
            const percentChange = (Math.random() - 0.5) * 0.02 + trendBias;
            
            const open = currentPrice;
            const close = open * (1 + percentChange);
            const high = Math.max(open, close) * (1 + Math.random() * 0.005);
            const low = Math.min(open, close) * (1 - Math.random() * 0.005);
            
            currentPrice = close;
            
            data.push({
                time,
                symbol,
                open,
                high,
                low,
                close
            });
        }
          // Cache the mock data (longer TTL since it doesn't change often)
        dataCache.set(mockCacheKey, data, 7 * 24 * 60 * 60 * 1000); // 7 days
        
        console.log(`Returning ${data.length} mock candles for ${symbol}`);
        res.json(data);
    } catch (error) {
        console.error('Error fetching historical data:', error);
        res.status(500).json({ error: 'Failed to fetch historical data' });
    }
});

// Mock data for patterns (used as fallback if database connection fails)
const mockPatterns = [
    {
        id: 1,
        symbol: 'EURUSD',
        pattern_type: 'gartley',
        direction: 'bullish',
        timeframe: '1h',
        prz: 1.08723,
        stop_loss: 1.08506,
        target: 1.09145,
        points: JSON.stringify({
            x: 1.07823,
            a: 1.09453,
            b: 1.08572,
            c: 1.09127,
            d: 1.08723
        }),
        ratios: JSON.stringify({
            xabRatio: 0.618,
            abcRatio: 0.5,
            bcdRatio: 1.27,
            xadRatio: 0.786
        }),
        timestamp: Date.now() - 60000,
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        symbol: 'BTCUSD',
        pattern_type: 'butterfly',
        direction: 'bearish',
        timeframe: '4h',
        prz: 32456.78,
        stop_loss: 32781.35,
        target: 31982.43,
        points: JSON.stringify({
            x: 33245.67,
            a: 31876.45,
            b: 32567.89,
            c: 31789.56,
            d: 32456.78
        }),
        ratios: JSON.stringify({
            xabRatio: 0.786,
            abcRatio: 0.5,
            bcdRatio: 1.618,
            xadRatio: 1.27
        }),
        timestamp: Date.now() - 120000,
        created_at: new Date().toISOString()
    }
];

// Save a detected pattern
app.post('/api/patterns', async (req, res) => {
    try {
        const {
            symbol,
            pattern,
            direction,
            timeframe,
            prz,
            stopLoss,
            targetPrice,
            points,
            ratios,
            timestamp
        } = req.body;
        
        // Validate input
        if (!symbol || !pattern || !direction || !timeframe) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (useDemoMode) {
            // In demo mode, just log and add to mock data
            console.log('Pattern saved (demo mode):', { symbol, pattern, direction, timeframe });
            
            // Add to mock data
            const newPattern = {
                id: mockPatterns.length + 1,
                symbol,
                pattern_type: pattern,
                direction,
                timeframe,
                prz,
                stop_loss: stopLoss,
                target: targetPrice,
                points: JSON.stringify(points),
                ratios: JSON.stringify(ratios),
                timestamp: timestamp || Date.now(),
                created_at: new Date().toISOString()
            };
            
            mockPatterns.push(newPattern);
            
            res.status(201).json({ 
                id: newPattern.id,
                message: 'Pattern saved successfully' 
            });
        } else {
            // Save to database in production mode
            const [result] = await dbPool.execute(
                `INSERT INTO patterns (
                    symbol, pattern_type, direction, timeframe, 
                    prz, stop_loss, target, points, 
                    ratios, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    symbol, pattern, direction, timeframe,
                    prz, stopLoss, targetPrice, JSON.stringify(points),
                    JSON.stringify(ratios), timestamp || Date.now()
                ]
            );
            
            res.status(201).json({ 
                id: result.insertId,
                message: 'Pattern saved successfully' 
            });
        }
    } catch (error) {
        console.error('Error saving pattern:', error);
        res.status(500).json({ error: 'Failed to save pattern' });
    }
});

// Get all saved patterns
app.get('/api/patterns', async (req, res) => {
    try {
        const { symbol, pattern, timeframe, limit } = req.query;
        
        if (useDemoMode) {
            // Use mock data in demo mode
            // Filter mock data based on query parameters
            let filteredPatterns = [...mockPatterns];
            
            if (symbol) {
                filteredPatterns = filteredPatterns.filter(p => p.symbol === symbol);
            }
            
            if (pattern) {
                filteredPatterns = filteredPatterns.filter(p => p.pattern_type === pattern);
            }
            
            if (timeframe) {
                filteredPatterns = filteredPatterns.filter(p => p.timeframe === timeframe);
            }
            
            // Sort by timestamp (newest first)
            filteredPatterns.sort((a, b) => b.timestamp - a.timestamp);
            
            // Apply limit if provided
            if (limit) {
                filteredPatterns = filteredPatterns.slice(0, parseInt(limit));
            }
            
            // Format the patterns to match expected output
            const formattedPatterns = filteredPatterns.map(p => ({
                ...p,
                points: typeof p.points === 'string' ? JSON.parse(p.points) : p.points,
                ratios: typeof p.ratios === 'string' ? JSON.parse(p.ratios) : p.ratios
            }));
            
            res.json(formattedPatterns);
        } else {
            // Use database in production mode
            // Build the query with filters
            let query = 'SELECT * FROM patterns';
            const params = [];
            
            // Add WHERE conditions if filters are provided
            if (symbol || pattern || timeframe) {
                query += ' WHERE';
                
                const conditions = [];
                if (symbol) {
                    conditions.push(' symbol = ?');
                    params.push(symbol);
                }
                if (pattern) {
                    conditions.push(' pattern_type = ?');
                    params.push(pattern);
                }
                if (timeframe) {
                    conditions.push(' timeframe = ?');
                    params.push(timeframe);
                }
                
                query += conditions.join(' AND');
            }
            
            // Order by most recent first
            query += ' ORDER BY timestamp DESC';
            
            // Add limit if provided
            if (limit) {
                query += ' LIMIT ?';
                params.push(parseInt(limit));
            }
            
            const [patterns] = await dbPool.execute(query, params);
            
            // Parse JSON fields
            const formattedPatterns = patterns.map(p => ({
                ...p,
                points: JSON.parse(p.points),
                ratios: JSON.parse(p.ratios)
            }));
            
            res.json(formattedPatterns);
        }
    } catch (error) {
        console.error('Error fetching patterns:', error);
        res.status(500).json({ error: 'Failed to fetch patterns' });
    }
});

// Test endpoint for API rate limiter
app.get('/api/test-rate-limit', async (req, res) => {
    const count = parseInt(req.query.count) || 3;
    const results = [];
    
    console.log(`Received test request to make ${count} API calls`);
    
    // Define the test request function
    const makeTestRequest = async () => {
        return { success: true, timestamp: Date.now() };
    };
    
    // Define the fallback function
    const fallbackTestResponse = () => {
        return { success: false, rateLimited: true, timestamp: Date.now() };
    };
    
    // Queue the requested number of calls
    for (let i = 0; i < count; i++) {
        try {
            console.log(`Queueing test request ${i+1}/${count}`);
            const result = await alphaVantageRateLimiter.queueRequest(
                makeTestRequest,
                fallbackTestResponse
            );
            results.push(result);
        } catch (error) {
            console.error(`Error in test request ${i+1}:`, error);
            results.push({ error: error.message });
        }
    }
    
    res.json({
        requestedCount: count,
        results: results,
        rateLimit: {
            minuteUsage: alphaVantageRateLimiter.minuteRequests / alphaVantageRateLimiter.requestsPerMinute,
            dayUsage: alphaVantageRateLimiter.dayRequests / alphaVantageRateLimiter.requestsPerDay,
            minuteRequests: alphaVantageRateLimiter.minuteRequests,
            dayRequests: alphaVantageRateLimiter.dayRequests,
            queueLength: alphaVantageRateLimiter.requestQueue.length
        }
    });
});

// Cache status endpoint
app.get('/api/cache-status', (req, res) => {
    const stats = dataCache.getStats();
    res.json({
        status: 'success',
        cache: stats,
        message: `Cache contains ${stats.active} active items (${stats.expired} expired)`
    });
});

// Default route - serve the main app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start the server using the http server with WebSocket support
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initializeDatabase();
});

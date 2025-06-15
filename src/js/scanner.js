/**
 * Pattern Scanner
 * 
 * This file contains the main scanner logic that runs at specified intervals
 * to detect harmonic patterns across different markets and timeframes.
 */

class Scanner {
    constructor() {
        this.harmonicPatterns = new HarmonicPatterns();
        this.scanResults = [];
        this.scanInterval = null;
        this.markets = {
            forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'EURGBP', 'EURJPY'],
            crypto: ['BTCUSD', 'ETHUSD', 'XRPUSD', 'LTCUSD', 'BCHUSD', 'ADAUSD', 'DOTUSD'],
            metals: ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'],
            stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'FB', 'TSLA', 'NVDA']
        };
        this.timeframes = {
            '1m': 1,
            '5m': 5,
            '15m': 15,
            '30m': 30,
            '1h': 60,
            '4h': 240,
            '1d': 1440
        };
        this.currentMarket = 'forex';
        this.currentTimeframe = '1h';
    }

    // Set the market type to scan
    setMarket(market) {
        if (this.markets[market]) {
            this.currentMarket = market;
            console.log(`Market changed to ${market}`);
        }
    }

    // Set the timeframe to scan
    setTimeframe(timeframe) {
        if (this.timeframes[timeframe]) {
            this.currentTimeframe = timeframe;
            console.log(`Timeframe changed to ${timeframe}`);
        }
    }    // Method to fetch historical data for scanning
    async fetchHistoricalData(symbol, timeframe) {
        try {
            // Try to fetch from our backend first
            try {
                const response = await fetch(`/api/historical-data?symbol=${symbol}&timeframe=${this.timeframes[timeframe]}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`Fetched ${data.length} candles for ${symbol} from backend`);
                    return data;
                }
            } catch (backendError) {
                console.warn('Backend data fetch failed:', backendError);
            }
              // If backend fetch fails, try to use the backend's API
            // We'll rely on the backend to provide the API key from environment variables
            // This way we don't expose the API key in client-side code
            let apiUrl;
            
            // We'll use the backend route instead of directly calling Alpha Vantage
            // This will use the API key from the server's environment variables
            
            // Format symbol for API (remove / for forex pairs)
            const formattedSymbol = symbol.replace('/', '');
            
            // Format interval for API
            let apiInterval;
            switch(timeframe) {
                case '1m': apiInterval = '1min'; break;
                case '5m': apiInterval = '5min'; break;
                case '15m': apiInterval = '15min'; break;
                case '30m': apiInterval = '30min'; break;
                case '1h': apiInterval = '60min'; break;
                case '4h': apiInterval = '4hour'; break;
                case '1d': apiInterval = 'daily'; break;
                default: apiInterval = 'daily';
            }
              // Use the backend route with market information
            // This centralizes all API calls through our backend
            apiUrl = `/api/historical-data?symbol=${symbol}&timeframe=${this.timeframes[timeframe]}&market=${this.currentMarket}`;
            
            // Fallback to demo data if market not supported
            if (!['crypto', 'forex', 'stocks', 'metals'].includes(this.currentMarket)) {
                console.warn('Market not supported by API, using demo data');
                return this.generateDemoData(symbol, timeframe);
            }
            
            console.log(`Fetching data from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                console.warn(`API request failed: ${response.status}`);
                return this.generateDemoData(symbol, timeframe);
            }
            
            const rawData = await response.json();
            
            // Process the API response based on the market type
            let formattedData = [];
            
            if (this.currentMarket === 'crypto') {
                const timeSeriesData = rawData['Time Series (Digital Currency Daily)'];
                if (timeSeriesData) {
                    formattedData = Object.entries(timeSeriesData).map(([date, values]) => {
                        const timestamp = new Date(date).getTime();
                        return {
                            time: timestamp,
                            symbol,
                            open: parseFloat(values['1a. open (USD)']),
                            high: parseFloat(values['2a. high (USD)']),
                            low: parseFloat(values['3a. low (USD)']),
                            close: parseFloat(values['4a. close (USD)'])
                        };
                    }).reverse();
                }
            } else if (this.currentMarket === 'stocks') {
                const timeSeriesData = rawData['Time Series (Daily)'];
                if (timeSeriesData) {
                    formattedData = Object.entries(timeSeriesData).map(([date, values]) => {
                        const timestamp = new Date(date).getTime();
                        return {
                            time: timestamp,
                            symbol,
                            open: parseFloat(values['1. open']),
                            high: parseFloat(values['2. high']),
                            low: parseFloat(values['3. low']),
                            close: parseFloat(values['4. close'])
                        };
                    }).reverse();
                }
            } else if (this.currentMarket === 'forex') {
                const timeSeriesData = rawData['Time Series FX (Daily)'];
                if (timeSeriesData) {
                    formattedData = Object.entries(timeSeriesData).map(([date, values]) => {
                        const timestamp = new Date(date).getTime();
                        return {
                            time: timestamp,
                            symbol,
                            open: parseFloat(values['1. open']),
                            high: parseFloat(values['2. high']),
                            low: parseFloat(values['3. low']),
                            close: parseFloat(values['4. close'])
                        };
                    }).reverse();
                }
            }
            
            // If we got no data from the API, use demo data
            if (formattedData.length === 0) {
                console.warn('No data returned from API, using demo data');
                return this.generateDemoData(symbol, timeframe);
            }
            
            console.log(`Successfully fetched ${formattedData.length} candles for ${symbol}`);
            return formattedData;
            
        } catch (error) {
            console.error(`Error fetching data for ${symbol} on ${timeframe} timeframe:`, error);
            // Fallback to demo data
            return this.generateDemoData(symbol, timeframe);
        }
    }
    
    // Generate demo data for when API calls fail
    generateDemoData(symbol, timeframe) {
        console.log(`Generating demo data for ${symbol} on ${timeframe} timeframe`);
        
        const endTime = Date.now();
        const interval = this.timeframes[timeframe] * 60 * 1000; // Convert to milliseconds
        const data = [];
        
        // Base price varies by market and symbol
        let basePrice = 1.0;
        if (this.currentMarket === 'crypto') {
            if (symbol.includes('BTC')) basePrice = 45000 + Math.random() * 5000;
            else if (symbol.includes('ETH')) basePrice = 3000 + Math.random() * 300;
            else basePrice = 100 + Math.random() * 50;
        } else if (this.currentMarket === 'forex') {
            if (symbol.includes('JPY')) basePrice = 100 + Math.random() * 10;
            else basePrice = 1 + Math.random() * 0.2;
        } else if (this.currentMarket === 'stocks') {
            basePrice = 100 + Math.random() * 50;
        } else if (this.currentMarket === 'metals') {
            if (symbol.includes('XAU')) basePrice = 1800 + Math.random() * 100;
            else if (symbol.includes('XAG')) basePrice = 20 + Math.random() * 5;
            else basePrice = 900 + Math.random() * 100;
        }
          // Generate 100 candles of historical data with patterns embedded
        let currentPrice = basePrice;
        for (let i = 0; i < 100; i++) {
            const time = endTime - (99 - i) * interval;
            
            // Intentionally create some patterns by using Fibonacci ratios
            // Every 20 candles, try to create a pattern-like price action
            if (i % 20 === 0 && i >= 20) {
                // Force pattern-like movements
                if (Math.random() > 0.5) {
                    // Try to create bullish pattern
                    const xPoint = data[i-20].close;
                    const aPoint = xPoint * 0.95; // XA move down
                    const bPoint = aPoint * 1.036; // AB move up (0.618 of XA)
                    const cPoint = bPoint * 0.95;  // BC move down
                    const dPoint = cPoint * 1.15;  // CD move up
                    
                    // Insert the pattern points
                    data[i-15].close = aPoint;
                    data[i-10].close = bPoint;
                    data[i-5].close = cPoint;
                    currentPrice = dPoint;
                } else {
                    // Try to create bearish pattern
                    const xPoint = data[i-20].close;
                    const aPoint = xPoint * 1.05; // XA move up
                    const bPoint = aPoint * 0.964; // AB move down (0.618 of XA)
                    const cPoint = bPoint * 1.05;  // BC move up
                    const dPoint = cPoint * 0.85;  // CD move down
                    
                    // Insert the pattern points
                    data[i-15].close = aPoint;
                    data[i-10].close = bPoint;
                    data[i-5].close = cPoint;
                    currentPrice = dPoint;
                }
            } else {
                // Normal price movement
                const percentChange = (Math.random() - 0.5) * 0.02; // -1% to +1%
                currentPrice = currentPrice * (1 + percentChange);
            }
            
            const open = currentPrice * (1 + (Math.random() - 0.5) * 0.005);
            const close = currentPrice;
            const high = Math.max(open, close) * (1 + Math.random() * 0.005);
            const low = Math.min(open, close) * (1 - Math.random() * 0.005);
            
            data.push({
                time,
                symbol,
                open,
                high,
                low,
                close
            });
        }
          return data;
    }    // Run a single scan for patterns
    async runScan() {
        this.scanResults = [];
        const symbols = this.markets[this.currentMarket];
        
        console.log(`Running scan for ${this.currentMarket} on ${this.currentTimeframe} timeframe...`);
        
        // Loop through all symbols in the current market
        for (const symbol of symbols) {
            console.log(`Scanning ${symbol}...`);
            const data = await this.fetchHistoricalData(symbol, this.currentTimeframe);
            
            // Skip if no data
            if (data.length === 0) {
                console.log(`No data available for ${symbol}`);
                continue;
            }
            
            console.log(`Analyzing ${data.length} candles for ${symbol}`);
            
            // Scan for harmonic patterns
            const patterns = this.harmonicPatterns.scanForPatterns(data);
            
            // Log detailed pattern counts by type
            if (patterns.length > 0) {
                const patternTypes = {};
                patterns.forEach(p => {
                    if (!patternTypes[p.pattern]) patternTypes[p.pattern] = 0;
                    patternTypes[p.pattern]++;
                });
                
                console.log(`Found ${patterns.length} patterns for ${symbol}:`);
                Object.entries(patternTypes).forEach(([pattern, count]) => {
                    console.log(`- ${pattern}: ${count}`);
                });
                
                this.scanResults.push(...patterns);
            } else {
                console.log(`No patterns detected for ${symbol}`);
            }
        }
        
        // Log all results
        console.log(`Scan complete. Found ${this.scanResults.length} patterns.`);
        
        // Trigger an event to notify that scan is complete
        const scanCompleteEvent = new CustomEvent('scanComplete', { 
            detail: { results: this.scanResults }
        });
        document.dispatchEvent(scanCompleteEvent);
        
        return this.scanResults;
    }

    // Start continuous scanning
    startScanning(intervalMinutes = 1) {
        // Clear any existing interval
        this.stopScanning();
        
        // Run an initial scan
        this.runScan();
        
        // Set up recurring scans
        const intervalMs = intervalMinutes * 60 * 1000;
        this.scanInterval = setInterval(() => this.runScan(), intervalMs);
        
        console.log(`Started automatic scanning every ${intervalMinutes} minute(s)`);
    }

    // Stop continuous scanning
    stopScanning() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
            console.log('Stopped automatic scanning');
        }
    }

    // Get the latest scan results
    getResults() {
        return this.scanResults;
    }    // Filter results by pattern type
    filterResultsByPattern(patternType) {
        if (patternType === 'all') {
            console.log(`Showing all patterns: ${this.scanResults.length} total`);
            return this.scanResults;
        }
        
        const filtered = this.scanResults.filter(result => result.pattern === patternType);
        console.log(`Filtering for ${patternType} patterns: ${filtered.length} of ${this.scanResults.length} total`);
        
        // Log all available patterns if none matched the filter
        if (filtered.length === 0 && this.scanResults.length > 0) {
            console.log('Available patterns in results:');
            const patternTypes = {};
            this.scanResults.forEach(p => {
                if (!patternTypes[p.pattern]) patternTypes[p.pattern] = 0;
                patternTypes[p.pattern]++;
            });
            Object.entries(patternTypes).forEach(([pattern, count]) => {
                console.log(`- ${pattern}: ${count}`);
            });
        }
        
        return filtered;
    }
}

// Export the Scanner class
if (typeof module !== 'undefined') {
    module.exports = Scanner;
}

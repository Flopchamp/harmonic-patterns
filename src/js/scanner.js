/**
 * Pattern Scanner
 * 
 * This file contains the main scanner logic that runs at specified intervals
 * to detect harmonic patterns across different markets and timeframes.
 */

class Scanner {    constructor() {
        this.harmonicPatterns = new HarmonicPatterns();
        
        // Initialize new pattern detection engines
        if (typeof ChartPatterns !== 'undefined') {
            this.chartPatterns = new ChartPatterns();
        }
        if (typeof CandlestickPatterns !== 'undefined') {
            this.candlestickPatterns = new CandlestickPatterns();
        }
        
        this.scanResults = [];
        this.scanInterval = null;
        this.isScanning = false;
        this.scanCount = 0;
        this.lastScanTime = null;
        
        // Enhanced market definitions with more symbols
        this.markets = {
            forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'NZDUSD'],
            crypto: ['BTCUSD', 'ETHUSD', 'XRPUSD', 'LTCUSD', 'BCHUSD', 'ADAUSD', 'DOTUSD', 'LINKUSD', 'MATICUSD', 'AVAXUSD'],
            metals: ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'COPPER', 'PALLADIUM'],
            stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'BABA', 'AMD']
        };
        
        // All supported timeframes
        this.timeframes = {
            '1m': 1,
            '5m': 5,
            '15m': 15,
            '30m': 30,
            '1h': 60,
            '4h': 240,
            '12h': 720,
            '1d': 1440,
            '1w': 10080
        };
        
        this.currentMarket = 'forex';
        this.currentTimeframe = '1m'; // Default to 1-minute for frequent scanning
        
        // Enhanced logging and statistics
        this.scanStats = {
            totalScans: 0,
            patternsFound: 0,
            lastPatternTime: null,
            scanDuration: 0,
            errorCount: 0
        };
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
    }    // Run a single comprehensive scan for all patterns
    async runScan() {
        if (this.isScanning) {
            console.log('⏳ Scan already in progress, skipping...');
            return;
        }
        
        this.isScanning = true;
        const scanStartTime = Date.now();
        this.scanCount++;
        this.lastScanTime = new Date().toISOString();
        
        console.log('\n🔍 ================================');
        console.log(`   HARMONIC PATTERN SCANNER v2.0`);
        console.log('🔍 ================================');
        console.log(`📊 Scan #${this.scanCount} | ${new Date().toLocaleTimeString()}`);
        console.log(`🌍 Market: ${this.currentMarket.toUpperCase()} | ⏱️ Timeframe: ${this.currentTimeframe}`);
        console.log(`📈 Symbols: ${this.markets[this.currentMarket].length} | 🎯 Patterns: Harmonic + Chart + Candlestick`);
        console.log('─'.repeat(70));
        
        this.scanResults = [];
        const symbols = this.markets[this.currentMarket];
        let totalPatterns = 0;
        let processedSymbols = 0;
        
        try {
            // Process each symbol in the current market
            for (const symbol of symbols) {
                try {
                    const data = await this.fetchHistoricalData(symbol, this.currentTimeframe);
                    
                    if (data.length === 0) {
                        console.log(`⚠️  ${symbol}: No data available`);
                        continue;
                    }
                    
                    processedSymbols++;
                    console.log(`📋 ${symbol}: Analyzing ${data.length} candles...`);
                    
                    // Run all pattern detection engines
                    const harmonicPatterns = this.harmonicPatterns.scanForPatterns(data);
                    const chartPatterns = this.chartPatterns ? this.chartPatterns.scanForChartPatterns(data) : [];
                    const candlestickPatterns = this.candlestickPatterns ? this.candlestickPatterns.scanForCandlestickPatterns(data) : [];
                    
                    // Combine and enhance pattern data
                    const allPatterns = [...harmonicPatterns, ...chartPatterns, ...candlestickPatterns];
                    
                    // Add metadata to each pattern
                    allPatterns.forEach(pattern => {
                        pattern.symbol = symbol;
                        pattern.timestamp = data[data.length - 1].time;
                        pattern.timeframe = this.currentTimeframe;
                        pattern.market = this.currentMarket;
                        pattern.scanId = this.scanCount;
                        
                        // Enhance pattern with additional analysis
                        pattern = this.enhancePatternData(pattern, data);
                    });
                    
                    // Log pattern findings for this symbol
                    if (allPatterns.length > 0) {
                        console.log(`✅ ${symbol}: Found ${allPatterns.length} patterns`);
                        
                        // Group patterns by type for cleaner display
                        const patternGroups = this.groupPatternsByType(allPatterns);
                        Object.entries(patternGroups).forEach(([type, patterns]) => {
                            console.log(`   ${this.getPatternTypeIcon(type)} ${type}: ${patterns.length} patterns`);
                            patterns.forEach(p => {
                                console.log(`      ├─ ${p.pattern} (${p.direction}) PRZ: ${p.prz.toFixed(4)} | SL: ${p.stopLoss?.toFixed(4) || 'N/A'} | TP: ${p.takeProfit?.toFixed(4) || 'N/A'}`);
                            });
                        });
                        
                        totalPatterns += allPatterns.length;
                        this.scanResults.push(...allPatterns);
                    } else {
                        console.log(`🔍 ${symbol}: No patterns detected`);
                    }
                    
                } catch (error) {
                    console.error(`❌ ${symbol}: Error during analysis - ${error.message}`);
                    this.scanStats.errorCount++;
                }
            }            
            // Generate comprehensive scan summary
            this.generateScanSummary(scanStartTime, processedSymbols, totalPatterns);
            
        } catch (error) {
            console.error('❌ Critical scan error:', error);
            this.scanStats.errorCount++;
        } finally {
            this.isScanning = false;
        }
        
        return this.scanResults;
    }

    // Enhanced pattern data with additional analysis
    enhancePatternData(pattern, data) {
        try {
            // Calculate more accurate PRZ levels
            if (pattern.prz) {
                // Add stop loss and take profit levels
                const atr = this.calculateATR(data, 14);
                const riskMultiplier = 1.5;
                const rewardMultiplier = 2.0;
                
                if (pattern.direction === 'bullish') {
                    pattern.stopLoss = pattern.prz - (atr * riskMultiplier);
                    pattern.takeProfit = pattern.prz + (atr * rewardMultiplier);
                } else if (pattern.direction === 'bearish') {
                    pattern.stopLoss = pattern.prz + (atr * riskMultiplier);
                    pattern.takeProfit = pattern.prz - (atr * rewardMultiplier);
                }
                
                // Calculate risk-reward ratio
                const risk = Math.abs(pattern.prz - pattern.stopLoss);
                const reward = Math.abs(pattern.takeProfit - pattern.prz);
                pattern.riskRewardRatio = reward / risk;
            }
            
            // Add pattern strength/confidence score
            pattern.confidence = this.calculatePatternConfidence(pattern, data);
            
        } catch (error) {
            console.warn(`Error enhancing pattern data: ${error.message}`);
        }
        
        return pattern;
    }

    // Calculate Average True Range for better SL/TP levels
    calculateATR(data, period = 14) {
        if (data.length < period + 1) return 0.001; // Default fallback
        
        let trueRanges = [];
        for (let i = 1; i < data.length; i++) {
            const high = data[i].high;
            const low = data[i].low;
            const prevClose = data[i - 1].close;
            
            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }
        
        // Calculate ATR (simple moving average of true ranges)
        const atrPeriod = Math.min(period, trueRanges.length);
        const recentTR = trueRanges.slice(-atrPeriod);
        return recentTR.reduce((sum, tr) => sum + tr, 0) / atrPeriod;
    }

    // Calculate pattern confidence score
    calculatePatternConfidence(pattern, data) {
        let confidence = 0.5; // Base confidence
        
        // Adjust based on pattern type
        if (pattern.pattern === 'gartley' || pattern.pattern === 'butterfly') {
            confidence += 0.2; // Higher confidence for classic harmonics
        }
        if (pattern.pattern === 'head_and_shoulders') {
            confidence += 0.15; // Strong reversal pattern
        }
        if (pattern.pattern === 'doji') {
            confidence += 0.1; // Reversal signal
        }
        
        // Adjust based on volume (if available)
        if (data.length > 0 && data[data.length - 1].volume) {
            const avgVolume = data.slice(-20).reduce((sum, d) => sum + (d.volume || 0), 0) / 20;
            const currentVolume = data[data.length - 1].volume;
            if (currentVolume > avgVolume * 1.5) {
                confidence += 0.1; // Higher volume confirmation
            }
        }
        
        return Math.min(0.95, Math.max(0.1, confidence)); // Clamp between 0.1 and 0.95
    }

    // Group patterns by type for cleaner display
    groupPatternsByType(patterns) {
        const groups = {
            'Harmonic': [],
            'Chart': [],
            'Candlestick': []
        };
        
        patterns.forEach(pattern => {
            if (['gartley', 'butterfly', 'bat', 'crab', 'abcd'].includes(pattern.pattern)) {
                groups.Harmonic.push(pattern);
            } else if (['head_and_shoulders', 'triangle', 'flag', 'support', 'resistance'].includes(pattern.pattern)) {
                groups.Chart.push(pattern);
            } else {
                groups.Candlestick.push(pattern);
            }
        });
        
        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) delete groups[key];
        });
        
        return groups;
    }

    // Get emoji icon for pattern type
    getPatternTypeIcon(type) {
        const icons = {
            'Harmonic': '🔹',
            'Chart': '📊',
            'Candlestick': '🕯️'
        };
        return icons[type] || '📈';
    }

    // Generate comprehensive scan summary
    generateScanSummary(scanStartTime, processedSymbols, totalPatterns) {
        const scanDuration = Date.now() - scanStartTime;
        this.scanStats.totalScans++;
        this.scanStats.patternsFound += totalPatterns;
        this.scanStats.scanDuration = scanDuration;
        
        if (totalPatterns > 0) {
            this.scanStats.lastPatternTime = new Date().toISOString();
        }
        
        console.log('\n📊 ================================');
        console.log('   SCAN SUMMARY & STATISTICS');
        console.log('📊 ================================');
        console.log(`⏱️  Scan Duration: ${scanDuration}ms`);
        console.log(`🎯 Symbols Processed: ${processedSymbols}/${this.markets[this.currentMarket].length}`);
        console.log(`📈 Total Patterns Found: ${totalPatterns}`);
        console.log(`🔢 Scan Statistics:`);
        console.log(`   ├─ Total Scans: ${this.scanStats.totalScans}`);
        console.log(`   ├─ Total Patterns: ${this.scanStats.patternsFound}`);
        console.log(`   ├─ Success Rate: ${((this.scanStats.totalScans - this.scanStats.errorCount) / this.scanStats.totalScans * 100).toFixed(1)}%`);
        console.log(`   └─ Avg Patterns/Scan: ${(this.scanStats.patternsFound / this.scanStats.totalScans).toFixed(1)}`);
        
        if (totalPatterns > 0) {
            console.log(`\n🎯 TOP PATTERNS THIS SCAN:`);
            const topPatterns = this.scanResults
                .sort((a, b) => (b.confidence || 0.5) - (a.confidence || 0.5))
                .slice(0, 5);
                
            topPatterns.forEach((pattern, index) => {
                console.log(`   ${index + 1}. ${pattern.symbol} - ${pattern.pattern.toUpperCase()} (${pattern.direction})`);
                console.log(`      PRZ: ${pattern.prz.toFixed(4)} | Confidence: ${((pattern.confidence || 0.5) * 100).toFixed(1)}%`);
            });
        }
          console.log('─'.repeat(70));
        console.log(`⏰ Next scan: ${this.scanInterval ? 'in 1 minute' : 'manual'}\n`);
    }

    // Start continuous scanning every minute (or specified interval)
    startScanning(intervalMinutes = 1) {
        // Clear any existing interval
        this.stopScanning();
        
        console.log(`🚀 Starting continuous pattern scanning every ${intervalMinutes} minute(s)...`);
        
        // Run an initial scan
        this.runScan();
        
        // Set up recurring scans
        const intervalMs = intervalMinutes * 60 * 1000;
        this.scanInterval = setInterval(() => {
            console.log('\n⏰ Auto-scan triggered...');
            this.runScan();
        }, intervalMs);
        
        console.log(`✅ Automatic scanning started - every ${intervalMinutes} minute(s)`);
    }

    // Stop continuous scanning
    stopScanning() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
            console.log('🛑 Stopped automatic scanning');
        }
    }

    // Get the latest scan results
    getResults() {
        return this.scanResults;
    }

    // Filter results by pattern type
    filterResultsByPattern(patternType) {
        if (patternType === 'all') {
            console.log(`📊 Showing all patterns: ${this.scanResults.length} total`);
            return this.scanResults;
        }
        
        const filtered = this.scanResults.filter(result => result.pattern === patternType);
        console.log(`🔍 Filtering for ${patternType} patterns: ${filtered.length} of ${this.scanResults.length} total`);
        
        // Log all available patterns if none matched the filter
        if (filtered.length === 0 && this.scanResults.length > 0) {
            console.log('📋 Available patterns in results:');
            const patternTypes = {};
            this.scanResults.forEach(p => {
                if (!patternTypes[p.pattern]) patternTypes[p.pattern] = 0;
                patternTypes[p.pattern]++;
            });
            Object.entries(patternTypes).forEach(([pattern, count]) => {
                console.log(`  • ${pattern}: ${count}`);
            });
        }
        
        return filtered;
    }

    // Multi-timeframe analysis
    async runMultiTimeframeAnalysis(symbol) {
        const timeframes = ['5m', '15m', '1h', '4h'];
        const results = {};
        
        console.log(`🔍 Multi-timeframe analysis for ${symbol}:`);
        
        for (const tf of timeframes) {
            const originalTf = this.currentTimeframe;
            this.setTimeframe(tf);
            
            const data = await this.fetchHistoricalData(symbol, tf);
            if (data.length > 0) {
                const harmonicPatterns = this.harmonicPatterns.scanForPatterns(data);
                const chartPatterns = this.chartPatterns ? this.chartPatterns.scanForChartPatterns(data) : [];
                const candlestickPatterns = this.candlestickPatterns ? this.candlestickPatterns.scanForCandlestickPatterns(data) : [];
                
                const allPatterns = [...harmonicPatterns, ...chartPatterns, ...candlestickPatterns];
                results[tf] = allPatterns;
                
                console.log(`  ${tf}: ${allPatterns.length} patterns`);
            }
            
            // Restore original timeframe
            this.setTimeframe(originalTf);
        }
        
        return results;
    }

    // Get scan statistics
    getScanStatistics() {
        return {
            ...this.scanStats,
            currentMarket: this.currentMarket,
            currentTimeframe: this.currentTimeframe,
            isScanning: this.isScanning,
            lastScanTime: this.lastScanTime,
            totalSymbols: this.markets[this.currentMarket].length
        };
    }
}

// Export the Scanner class
if (typeof module !== 'undefined') {
    module.exports = Scanner;
}

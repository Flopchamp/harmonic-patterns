/**
 * Debug Scanner Script
 * 
 * This script runs the harmonic pattern scanner in debug mode,
 * logging detailed information to the console for each timeframe and market.
 * It performs tests to verify the accuracy of pattern detection.
 */

// Import required modules
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');

// Load harmonicPatterns.js
const harmonicPatternsPath = path.join(__dirname, '..', 'src', 'js', 'harmonicPatterns.js');
const harmonicPatternsContent = fs.readFileSync(harmonicPatternsPath, 'utf8');
eval(harmonicPatternsContent.replace(/class HarmonicPatterns/g, 'global.HarmonicPatterns = class'));

// Load confirmationIndicators.js if it exists
try {
    const confirmationIndicatorsPath = path.join(__dirname, '..', 'src', 'js', 'confirmationIndicators.js');
    const confirmationIndicatorsContent = fs.readFileSync(confirmationIndicatorsPath, 'utf8');
    eval(confirmationIndicatorsContent.replace(/class ConfirmationIndicators/g, 'global.ConfirmationIndicators = class'));
} catch (error) {
    console.log('ConfirmationIndicators not found, continuing without confirmation features');
}

// Configuration
const markets = {
    forex: ['EURUSD', 'GBPUSD', 'USDJPY'],
    crypto: ['BTCUSD', 'ETHUSD'],
    metals: ['XAUUSD'],
    stocks: ['AAPL', 'MSFT']
};

const timeframes = {
    '1h': 60,
    '4h': 240,
    '1d': 1440
};

// Create pattern detector
const harmonicPatterns = new HarmonicPatterns();

// Function to fetch historical data
async function fetchHistoricalData(symbol, timeframe, market) {
    try {
        // Format the API URL
        const baseUrl = 'http://localhost:3000';
        const apiUrl = `${baseUrl}/api/historical-data?symbol=${symbol}&timeframe=${timeframe}&market=${market}`;
        
        console.log(`Fetching data from: ${apiUrl}`);
        
        try {
            const response = await axios.get(apiUrl);
            return response.data;
        } catch (error) {
            console.error(`API request failed: ${error.message}`);
            return generateDemoData(symbol, timeframe);
        }
    } catch (error) {
        console.error('Error fetching historical data:', error);
        return [];
    }
}

// Function to generate demo data
function generateDemoData(symbol, timeframe) {
    const endTime = Date.now();
    const interval = timeframe * 60 * 1000; // Convert to milliseconds
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
    
    return data;
}

// Function to check the consistency of Fibonacci ratios in detected patterns
function validateFibonacciRatios(pattern) {
    // Expected Fibonacci ratio ranges
    const expectedRatios = {
        gartley: {
            xabRatio: [0.598, 0.638],  // 0.618 ± 0.02
            abcRatio: [0.382, 0.886],
            bcdRatio: [1.27, 1.618],
            xadRatio: [0.766, 0.806]   // 0.786 ± 0.02
        },
        butterfly: {
            xabRatio: [0.766, 0.806],  // 0.786 ± 0.02
            abcRatio: [0.382, 0.886],
            bcdRatio: [1.618, 2.618],
            xadRatio: [1.27, 1.618]
        },
        bat: {
            xabRatio: [0.382, 0.5],
            abcRatio: [0.382, 0.886],
            bcdRatio: [1.618, 2.618],
            xadRatio: [0.866, 0.906]   // 0.886 ± 0.02
        },
        crab: {
            xabRatio: [0.382, 0.618],
            abcRatio: [0.382, 0.886],
            bcdRatio: [2.24, 3.618],
            xadRatio: [1.598, 1.638]   // 1.618 ± 0.02
        }
    };

    // Check if pattern type exists in expected ratios
    if (!expectedRatios[pattern.pattern]) {
        return { isValid: false, message: `Unknown pattern type: ${pattern.pattern}` };
    }

    const expected = expectedRatios[pattern.pattern];
    const actual = pattern.ratios;
    const errors = [];

    // Check each ratio
    for (const ratio in expected) {
        if (actual[ratio]) {
            const [min, max] = expected[ratio];
            if (actual[ratio] < min || actual[ratio] > max) {
                errors.push(`${ratio}: Expected ${min}-${max}, got ${actual[ratio].toFixed(3)}`);
            }
        } else {
            errors.push(`Missing ${ratio} ratio`);
        }
    }

    return {
        isValid: errors.length === 0,
        message: errors.length > 0 ? errors.join(', ') : 'All ratios are valid',
        expected: expected,
        actual: actual
    };
}

// Function to analyze pattern success rates (PRZ touch accuracy)
function analyzePRZAccuracy(pattern, data) {
    // This would require post-pattern data to see if PRZ level was touched
    // Since we don't have future data in this test, we'll simulate PRZ accuracy based on pattern quality
    
    // Calculate a theoretical accuracy based on ratio match quality
    const validation = validateFibonacciRatios(pattern);
    
    if (!validation.isValid) {
        return {
            touched: false,
            probability: 0.2, // 20% chance for invalid patterns
            message: 'Pattern has invalid ratios'
        };
    }

    // Get confidence from pattern confirmation if available
    let confidence = 0.5; // Base confidence
    if (pattern.confirmation && pattern.confirmation.score) {
        confidence = Math.min(0.9, pattern.confirmation.score / 100); // Max 90%
    }
    
    return {
        touched: null, // Unknown without future data
        probability: confidence,
        message: `Estimated ${Math.round(confidence * 100)}% probability based on pattern quality`
    };
}

// Improved function to format pattern results for console output
function formatPatternResult(pattern, patternIndex) {
    // Get validation info
    const validation = validateFibonacciRatios(pattern);
    const accuracy = analyzePRZAccuracy(pattern, null);
    
    // Calculate target and stop loss
    const xToD = Math.abs(pattern.points.d - pattern.points.x);
    const target = pattern.direction === 'bullish' 
        ? pattern.points.d + xToD 
        : pattern.points.d - xToD;
    
    const stopLoss = pattern.direction === 'bullish'
        ? pattern.points.d - (xToD * 0.2)
        : pattern.points.d + (xToD * 0.2);
    
    // Create pretty output
    let output = `\n${'-'.repeat(80)}\n`;
    output += `PATTERN #${patternIndex + 1}: ${pattern.pattern.toUpperCase()} (${pattern.direction.toUpperCase()})\n`;
    output += `${'-'.repeat(80)}\n`;
    output += `Symbol: ${pattern.symbol}\n`;
    output += `Time: ${new Date(pattern.timestamp).toLocaleString()}\n\n`;
    
    output += `POINTS:\n`;
    output += `X: ${pattern.points.x.toFixed(5)}\n`;
    output += `A: ${pattern.points.a.toFixed(5)}\n`;
    output += `B: ${pattern.points.b.toFixed(5)}\n`;
    output += `C: ${pattern.points.c.toFixed(5)}\n`;
    output += `D: ${pattern.points.d.toFixed(5)} (PRZ)\n\n`;
    
    output += `RATIOS:\n`;
    for (const [ratio, value] of Object.entries(pattern.ratios)) {
        const isValid = validation.isValid || !validation.expected[ratio] || 
            (value >= validation.expected[ratio][0] && value <= validation.expected[ratio][1]);
        
        const validMark = isValid ? '✓' : '✗';
        const expected = validation.expected[ratio] 
            ? `[Expected: ${validation.expected[ratio][0].toFixed(3)}-${validation.expected[ratio][1].toFixed(3)}]`
            : '';
            
        output += `${ratio}: ${value.toFixed(5)} ${validMark} ${expected}\n`;
    }
    
    output += `\nTRADE LEVELS:\n`;
    output += `Entry (PRZ): ${pattern.points.d.toFixed(5)}\n`;
    output += `Stop Loss: ${stopLoss.toFixed(5)}\n`;
    output += `Target: ${target.toFixed(5)}\n`;
    output += `Risk/Reward: ${Math.abs((target - pattern.points.d) / (pattern.points.d - stopLoss)).toFixed(2)}\n\n`;
    
    output += `VALIDATION:\n`;
    output += `Pattern quality: ${validation.isValid ? 'Valid' : 'Invalid'}\n`;
    output += `Message: ${validation.message}\n`;
    output += `Estimated PRZ accuracy: ${Math.round(accuracy.probability * 100)}%\n`;
    
    if (pattern.confirmation) {
        output += `\nCONFIRMATION INDICATORS:\n`;
        output += `Overall score: ${pattern.confirmation.score}/100\n`;
        
        if (pattern.confirmation.indicators) {
            for (const [indicator, value] of Object.entries(pattern.confirmation.indicators)) {
                output += `${indicator}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
            }
        }
    }
    
    return output;
}

// Function to run scan for a single market and timeframe
async function runMarketTimeframeScan(market, timeframeKey) {
    const timeframe = timeframes[timeframeKey];
    console.log(`\n${'='.repeat(100)}`);
    console.log(`SCANNING ${market.toUpperCase()} MARKET ON ${timeframeKey} TIMEFRAME`);
    console.log(`${'='.repeat(100)}`);
    
    const results = [];
    
    for (const symbol of markets[market]) {
        console.log(`\nScanning ${symbol}...`);
        const data = await fetchHistoricalData(symbol, timeframe, market);
        
        if (!data || data.length === 0) {
            console.log(`No data available for ${symbol}`);
            continue;
        }
        
        console.log(`Analyzing ${data.length} candles for ${symbol}`);
        
        const patterns = harmonicPatterns.scanForPatterns(data);
        
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
            
            // Add to results
            results.push(...patterns);
            
            // Print detailed information for each pattern
            patterns.forEach((pattern, index) => {
                console.log(formatPatternResult(pattern, index));
            });
        } else {
            console.log(`No patterns detected for ${symbol}`);
        }
    }
    
    console.log(`\n${'='.repeat(100)}`);
    console.log(`SCAN COMPLETE - ${market.toUpperCase()} / ${timeframeKey}`);
    console.log(`Found ${results.length} patterns across ${Object.keys(markets[market]).length} symbols`);
    console.log(`${'='.repeat(100)}`);
    
    return results;
}

// Main function to run all scans
async function runAllScans() {
    console.log('Starting Harmonic Pattern Scanner Debug Mode\n');
    
    const allResults = {};
    const startTime = Date.now();
    
    for (const market of Object.keys(markets)) {
        allResults[market] = {};
        
        for (const timeframe of Object.keys(timeframes)) {
            const results = await runMarketTimeframeScan(market, timeframe);
            allResults[market][timeframe] = results;
        }
    }
    
    const endTime = Date.now();
    const scanTime = (endTime - startTime) / 1000;
    
    // Output summary
    console.log('\n\n');
    console.log(`${'*'.repeat(100)}`);
    console.log(`HARMONIC PATTERN SCANNER - SCAN SUMMARY`);
    console.log(`${'*'.repeat(100)}`);
    console.log(`\nScan completed in ${scanTime.toFixed(2)} seconds`);
    
    let totalPatterns = 0;
    for (const market of Object.keys(allResults)) {
        console.log(`\n${market.toUpperCase()} MARKET:`);
        
        for (const timeframe of Object.keys(allResults[market])) {
            const count = allResults[market][timeframe].length;
            totalPatterns += count;
            console.log(`- ${timeframe}: ${count} patterns`);
        }
    }
    
    console.log(`\nTOTAL PATTERNS DETECTED: ${totalPatterns}`);
    
    // Save results to file
    const resultsFile = path.join(__dirname, '..', 'scan-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
    console.log(`\nDetailed results saved to: ${resultsFile}`);
}

// Check if server is running
async function checkServerStatus() {
    try {
        await axios.get('http://localhost:3000/api/symbols');
        return true;
    } catch (error) {
        return false;
    }
}

// Start the debugging process
async function start() {
    // Check if server is running
    const serverRunning = await checkServerStatus();
    
    if (!serverRunning) {
        console.error('ERROR: Server is not running. Please start the server with "npm start" before running this script.');
        process.exit(1);
    }
    
    runAllScans();
}

// Run the script
start();

/**
 * Harmonic Pattern Detection Logic
 * 
 * This file contains functions to identify various harmonic patterns
 * including Gartley, Butterfly, Bat, Crab, and ABCD patterns
 */

class HarmonicPatterns {
    constructor() {
        // Initialize confirmation indicators if available
        if (typeof ConfirmationIndicators !== 'undefined') {
            this.confirmationIndicators = new ConfirmationIndicators();
        }
        
        this.patterns = {
            gartley: {
                bullish: {
                    xabRatio: [0.598, 0.638],  // Acceptable range for XAB retracement (0.618 ± 0.02)
                    abcRatio: [0.382, 0.886],  // Acceptable range for ABC retracement
                    bcdRatio: [1.27, 1.618],   // Acceptable range for BCD projection
                    xadRatio: [0.766, 0.806]   // Acceptable range for XAD retracement (0.786 ± 0.02)
                },
                bearish: {
                    xabRatio: [0.598, 0.638],  // Acceptable range for XAB retracement (0.618 ± 0.02)
                    abcRatio: [0.382, 0.886],  // Acceptable range for ABC retracement
                    bcdRatio: [1.27, 1.618],   // Acceptable range for BCD projection
                    xadRatio: [0.766, 0.806]   // Acceptable range for XAD retracement (0.786 ± 0.02)
                }
            },
            butterfly: {
                bullish: {
                    xabRatio: [0.786, 0.786],
                    abcRatio: [0.382, 0.886],
                    bcdRatio: [1.618, 2.618],
                    xadRatio: [1.27, 1.618]
                },
                bearish: {
                    xabRatio: [0.786, 0.786],
                    abcRatio: [0.382, 0.886],
                    bcdRatio: [1.618, 2.618],
                    xadRatio: [1.27, 1.618]
                }
            },
            bat: {
                bullish: {
                    xabRatio: [0.382, 0.5],
                    abcRatio: [0.382, 0.886],
                    bcdRatio: [1.618, 2.618],
                    xadRatio: [0.886, 0.886]
                },
                bearish: {
                    xabRatio: [0.382, 0.5],
                    abcRatio: [0.382, 0.886],
                    bcdRatio: [1.618, 2.618],
                    xadRatio: [0.886, 0.886]
                }
            },
            crab: {
                bullish: {
                    xabRatio: [0.382, 0.618],
                    abcRatio: [0.382, 0.886],
                    bcdRatio: [2.24, 3.618],
                    xadRatio: [1.618, 1.618]
                },
                bearish: {
                    xabRatio: [0.382, 0.618],
                    abcRatio: [0.382, 0.886],
                    bcdRatio: [2.24, 3.618],
                    xadRatio: [1.618, 1.618]
                }
            },
            abcd: {
                bullish: {
                    abRatio: [0.382, 0.618],
                    bcRatio: [1.13, 1.618],
                    cdRatio: [1.27, 1.618]
                },
                bearish: {
                    abRatio: [0.382, 0.618],
                    bcRatio: [1.13, 1.618],
                    cdRatio: [1.27, 1.618]
                }
            }
        };
    }

    // Calculate the Fibonacci ratio between two price points
    calculateRatio(price1, price2) {
        if (price2 === 0) return 0;
        return Math.abs(price1 / price2);
    }    // Check if a value is within the range
    isInRange(value, range) {
        const tolerance = 0.015; // 1.5% tolerance
        return value >= (range[0] - tolerance) && value <= (range[1] + tolerance);
    }// Detect XABCD harmonic patterns (Gartley, Butterfly, Bat, Crab)
    detectXABCDPattern(points, pattern, direction) {
        const { x, a, b, c, d } = points;
        
        // Calculate the price movements
        const xa = Math.abs(a - x);
        const ab = Math.abs(b - a);
        const bc = Math.abs(c - b);
        const cd = Math.abs(d - c);
        const xb = Math.abs(b - x);
        const ad = Math.abs(d - a);
        const xd = Math.abs(d - x);
        
        // Calculate the ratios
        const xabRatio = this.calculateRatio(ab, xa);
        const abcRatio = this.calculateRatio(bc, ab);
        const bcdRatio = this.calculateRatio(cd, bc);
        const xadRatio = this.calculateRatio(ad, xa);
        
        // Debug log for pattern detection attempts
        if (pattern === 'gartley') {
            console.log(`Checking ${pattern} ${direction}: XAB=${xabRatio.toFixed(3)}, ABC=${abcRatio.toFixed(3)}, BCD=${bcdRatio.toFixed(3)}, XAD=${xadRatio.toFixed(3)}`);
        }
        
        // Get the pattern specifications
        const specs = this.patterns[pattern][direction];
        
        // Check if all ratios are within the acceptable ranges
        if (
            this.isInRange(xabRatio, specs.xabRatio) &&
            this.isInRange(abcRatio, specs.abcRatio) &&
            this.isInRange(bcdRatio, specs.bcdRatio) &&
            this.isInRange(xadRatio, specs.xadRatio)
        ) {
            return {
                pattern,
                direction,
                points: { x, a, b, c, d },
                ratios: {
                    xabRatio,
                    abcRatio,
                    bcdRatio,
                    xadRatio
                },
                prz: d, // Potential Reversal Zone
                stopLoss: direction === 'bullish' ? 
                    d * 0.98 : // 2% below PRZ for bullish
                    d * 1.02,  // 2% above PRZ for bearish
                targetPrice: direction === 'bullish' ?
                    d + (0.618 * (d - c)) : // 61.8% extension from PRZ for bullish
                    d - (0.618 * (c - d))   // 61.8% extension from PRZ for bearish
            };
        }
        
        return null;
    }

    // Detect ABCD pattern
    detectABCDPattern(points, direction) {
        const { a, b, c, d } = points;
        
        // Calculate the price movements
        const ab = Math.abs(b - a);
        const bc = Math.abs(c - b);
        const cd = Math.abs(d - c);
        
        // Calculate the ratios
        const abRatio = this.calculateRatio(ab, ab); // Always 1.0
        const bcRatio = this.calculateRatio(bc, ab);
        const cdRatio = this.calculateRatio(cd, bc);
        
        // Get the pattern specifications
        const specs = this.patterns.abcd[direction];
        
        // Check if all ratios are within the acceptable ranges
        if (
            this.isInRange(bcRatio, specs.bcRatio) &&
            this.isInRange(cdRatio, specs.cdRatio)
        ) {
            return {
                pattern: 'abcd',
                direction,
                points: { a, b, c, d },
                ratios: {
                    bcRatio,
                    cdRatio
                },
                prz: d, // Potential Reversal Zone
                stopLoss: direction === 'bullish' ? 
                    d * 0.98 : // 2% below PRZ for bullish
                    d * 1.02,  // 2% above PRZ for bearish
                targetPrice: direction === 'bullish' ?
                    d + (0.618 * (d - c)) : // 61.8% extension from PRZ for bullish
                    d - (0.618 * (c - d))   // 61.8% extension from PRZ for bearish
            };
        }
        
        return null;
    }    /**
     * Finds the most appropriate price for a pivot point
     * Uses high for peaks and low for troughs for more accurate pattern detection
     * 
     * @param {Array} data - OHLC price data
     * @param {number} index - Index of the candle to analyze
     * @returns {number} - The appropriate price for pattern calculation
     */
    findPivotPrice(data, index) {
        // Make sure we have valid data and index
        if (!data || index < 0 || index >= data.length) {
            return data[index]?.close || 0;
        }
        
        // If we're at the edges of the array, use close
        if (index === 0 || index === data.length - 1) {
            return data[index].close;
        }
        
        const current = data[index];
        const prev = data[index - 1];
        const next = data[index + 1];
        
        // Check if this is a peak (higher than neighbors)
        if (current.high > prev.high && current.high > next.high) {
            return current.high;
        }
        
        // Check if this is a trough (lower than neighbors)
        if (current.low < prev.low && current.low < next.low) {
            return current.low;
        }
        
        // For other cases, use close
        return current.close;
    }
    
    // Main method to scan for patterns
    scanForPatterns(data) {
        const results = [];
        
        // Skip if not enough data points
        if (!data || data.length < 5) {
            console.warn('Not enough data points for pattern detection, need at least 5 candles');
            return results;
        }
        
        // Loop through the data points to find potential patterns
        // Data should be an array of candlestick data with OHLC values
        for (let i = data.length - 1; i >= 4; i--) {
            // For XABCD patterns, we need 5 points
            // Using high/low values for more accurate pivot points
            const pointsXABCD = {
                x: this.findPivotPrice(data, i-4),
                a: this.findPivotPrice(data, i-3),
                b: this.findPivotPrice(data, i-2),
                c: this.findPivotPrice(data, i-1),
                d: this.findPivotPrice(data, i)
            };
            
            // For ABCD patterns, we need 4 points
            const pointsABCD = {
                a: this.findPivotPrice(data, i-3),
                b: this.findPivotPrice(data, i-2),
                c: this.findPivotPrice(data, i-1),
                d: this.findPivotPrice(data, i)
            };
            
            // Determine trend directions
            const bullishTrendXA = pointsXABCD.a > pointsXABCD.x;
            const bearishTrendXA = pointsXABCD.a < pointsXABCD.x;
            
            const bullishTrendAB = pointsABCD.b < pointsABCD.a;
            const bearishTrendAB = pointsABCD.b > pointsABCD.a;
            
            // Check for bullish XABCD patterns
            if (bullishTrendXA) {
                ['gartley', 'butterfly', 'bat', 'crab'].forEach(pattern => {
                    const result = this.detectXABCDPattern(pointsXABCD, pattern, 'bullish');
                    if (result) {
                        // Add relevant data segment for confirmation analysis
                        const dataSegment = data.slice(Math.max(0, i - 50), i + 1);
                        
                        // Add confirmation indicators if available
                        if (this.confirmationIndicators) {
                            result.confirmation = this.confirmationIndicators.confirmPattern(result, dataSegment);
                        }
                        
                        results.push({
                            ...result,
                            timestamp: data[i].time,
                            symbol: data[i].symbol
                        });
                    }
                });
            }
            
            // Check for bearish XABCD patterns
            if (bearishTrendXA) {
                ['gartley', 'butterfly', 'bat', 'crab'].forEach(pattern => {
                    const result = this.detectXABCDPattern(pointsXABCD, pattern, 'bearish');
                    if (result) {
                        // Add relevant data segment for confirmation analysis
                        const dataSegment = data.slice(Math.max(0, i - 50), i + 1);
                        
                        // Add confirmation indicators if available
                        if (this.confirmationIndicators) {
                            result.confirmation = this.confirmationIndicators.confirmPattern(result, dataSegment);
                        }
                        
                        results.push({
                            ...result,
                            timestamp: data[i].time,
                            symbol: data[i].symbol
                        });
                    }
                });
            }
            
            // Check for bullish ABCD pattern
            if (bullishTrendAB) {
                const result = this.detectABCDPattern(pointsABCD, 'bullish');
                if (result) {
                    // Add relevant data segment for confirmation analysis
                    const dataSegment = data.slice(Math.max(0, i - 50), i + 1);
                    
                    // Add confirmation indicators if available
                    if (this.confirmationIndicators) {
                        result.confirmation = this.confirmationIndicators.confirmPattern(result, dataSegment);
                    }
                    
                    results.push({
                        ...result,
                        timestamp: data[i].time,
                        symbol: data[i].symbol
                    });
                }
            }
            
            // Check for bearish ABCD pattern
            if (bearishTrendAB) {
                const result = this.detectABCDPattern(pointsABCD, 'bearish');
                if (result) {
                    // Add relevant data segment for confirmation analysis
                    const dataSegment = data.slice(Math.max(0, i - 50), i + 1);
                    
                    // Add confirmation indicators if available
                    if (this.confirmationIndicators) {
                        result.confirmation = this.confirmationIndicators.confirmPattern(result, dataSegment);
                    }
                    
                    results.push({
                        ...result,
                        timestamp: data[i].time,
                        symbol: data[i].symbol
                    });
                }
            }
        }
        
        return results;
    }
}

// Export the HarmonicPatterns class
if (typeof module !== 'undefined') {
    module.exports = HarmonicPatterns;
}

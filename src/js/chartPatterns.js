/**
 * Chart Pattern Detection
 * 
 * This file contains functions to identify chart patterns such as
 * Head & Shoulders, Triangles, Flags, Pennants, Wedges, etc.
 */

class ChartPatterns {
    constructor() {
        this.patterns = {
            headAndShoulders: {
                minBars: 20,
                tolerance: 0.02 // 2% tolerance
            },
            triangle: {
                minBars: 15,
                tolerance: 0.015 // 1.5% tolerance
            },
            flag: {
                minBars: 10,
                maxBars: 30,
                tolerance: 0.01 // 1% tolerance
            },
            wedge: {
                minBars: 15,
                tolerance: 0.02 // 2% tolerance
            }
        };
    }

    /**
     * Scan for all chart patterns
     * @param {Array} data - OHLC price data
     * @returns {Array} - Array of detected patterns
     */
    scanForChartPatterns(data) {
        const patterns = [];
        
        if (data.length < 20) {
            console.log('Insufficient data for chart pattern analysis');
            return patterns;
        }

        // Detect Head and Shoulders
        const headAndShoulders = this.detectHeadAndShoulders(data);
        if (headAndShoulders) patterns.push(headAndShoulders);

        // Detect Triangles
        const triangles = this.detectTriangles(data);
        patterns.push(...triangles);

        // Detect Flags and Pennants
        const flags = this.detectFlags(data);
        patterns.push(...flags);

        // Detect Wedges
        const wedges = this.detectWedges(data);
        patterns.push(...wedges);

        // Detect Support and Resistance
        const supportResistance = this.detectSupportResistance(data);
        patterns.push(...supportResistance);

        return patterns;
    }

    /**
     * Detect Head and Shoulders pattern
     * @param {Array} data - OHLC price data
     * @returns {Object|null} - Pattern object or null
     */
    detectHeadAndShoulders(data) {
        const highs = this.findPeaks(data);
        const lows = this.findTroughs(data);
        
        if (highs.length < 3 || lows.length < 2) return null;

        // Look for Head and Shoulders pattern
        for (let i = 1; i < highs.length - 1; i++) {
            const leftShoulder = highs[i - 1];
            const head = highs[i];
            const rightShoulder = highs[i + 1];
            
            // Head should be higher than both shoulders
            if (head.price > leftShoulder.price && head.price > rightShoulder.price) {
                // Shoulders should be approximately equal
                const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price;
                
                if (shoulderDiff <= this.patterns.headAndShoulders.tolerance) {
                    // Find neckline (connecting lows between shoulders)
                    const necklineLows = lows.filter(low => 
                        low.index > leftShoulder.index && low.index < rightShoulder.index
                    );
                    
                    if (necklineLows.length >= 2) {
                        const neckline = (necklineLows[0].price + necklineLows[1].price) / 2;
                        
                        return {
                            pattern: 'head_and_shoulders',
                            direction: 'bearish',
                            points: {
                                leftShoulder: leftShoulder.price,
                                head: head.price,
                                rightShoulder: rightShoulder.price,
                                neckline: neckline
                            },
                            prz: neckline,
                            stopLoss: head.price * 1.02,
                            targetPrice: neckline - (head.price - neckline),
                            confidence: this.calculatePatternConfidence('head_and_shoulders', {
                                shoulderSymmetry: 1 - shoulderDiff,
                                headHeight: (head.price - neckline) / neckline
                            })
                        };
                    }
                }
            }
        }

        return null;
    }

    /**
     * Detect Triangle patterns (Ascending, Descending, Symmetrical)
     * @param {Array} data - OHLC price data
     * @returns {Array} - Array of triangle patterns
     */
    detectTriangles(data) {
        const patterns = [];
        const highs = this.findPeaks(data);
        const lows = this.findTroughs(data);
        
        if (highs.length < 3 || lows.length < 3) return patterns;

        // Detect Ascending Triangle
        const ascendingTriangle = this.detectAscendingTriangle(highs, lows);
        if (ascendingTriangle) patterns.push(ascendingTriangle);

        // Detect Descending Triangle
        const descendingTriangle = this.detectDescendingTriangle(highs, lows);
        if (descendingTriangle) patterns.push(descendingTriangle);

        // Detect Symmetrical Triangle
        const symmetricalTriangle = this.detectSymmetricalTriangle(highs, lows);
        if (symmetricalTriangle) patterns.push(symmetricalTriangle);

        return patterns;
    }

    /**
     * Detect Flag and Pennant patterns
     * @param {Array} data - OHLC price data
     * @returns {Array} - Array of flag/pennant patterns
     */
    detectFlags(data) {
        const patterns = [];
        
        // Look for strong trends followed by consolidation
        for (let i = 20; i < data.length - 10; i++) {
            const trendData = data.slice(i - 20, i);
            const consolidationData = data.slice(i, i + 10);
            
            // Check for strong uptrend
            const trendSlope = this.calculateTrendSlope(trendData);
            if (Math.abs(trendSlope) > 0.02) { // 2% or greater trend
                const consolidationRange = this.calculatePriceRange(consolidationData);
                
                if (consolidationRange < 0.03) { // Tight consolidation
                    const flagPattern = {
                        pattern: trendSlope > 0 ? 'bull_flag' : 'bear_flag',
                        direction: trendSlope > 0 ? 'bullish' : 'bearish',
                        points: {
                            trendStart: trendData[0].close,
                            trendEnd: trendData[trendData.length - 1].close,
                            consolidationHigh: Math.max(...consolidationData.map(d => d.high)),
                            consolidationLow: Math.min(...consolidationData.map(d => d.low))
                        },
                        prz: consolidationData[consolidationData.length - 1].close,
                        stopLoss: trendSlope > 0 ? 
                            Math.min(...consolidationData.map(d => d.low)) * 0.98 :
                            Math.max(...consolidationData.map(d => d.high)) * 1.02,
                        targetPrice: trendSlope > 0 ?
                            consolidationData[consolidationData.length - 1].close + (trendData[trendData.length - 1].close - trendData[0].close) :
                            consolidationData[consolidationData.length - 1].close - (trendData[0].close - trendData[trendData.length - 1].close),
                        confidence: this.calculatePatternConfidence('flag', {
                            trendStrength: Math.abs(trendSlope),
                            consolidationTightness: 1 - consolidationRange
                        })
                    };
                    
                    patterns.push(flagPattern);
                }
            }
        }

        return patterns;
    }

    /**
     * Detect Wedge patterns (Rising, Falling)
     * @param {Array} data - OHLC price data
     * @returns {Array} - Array of wedge patterns
     */
    detectWedges(data) {
        const patterns = [];
        const highs = this.findPeaks(data);
        const lows = this.findTroughs(data);
        
        if (highs.length < 3 || lows.length < 3) return patterns;

        // Detect Rising Wedge
        const risingWedge = this.detectRisingWedge(highs, lows);
        if (risingWedge) patterns.push(risingWedge);

        // Detect Falling Wedge
        const fallingWedge = this.detectFallingWedge(highs, lows);
        if (fallingWedge) patterns.push(fallingWedge);

        return patterns;
    }

    /**
     * Detect Support and Resistance levels
     * @param {Array} data - OHLC price data
     * @returns {Array} - Array of support/resistance levels
     */
    detectSupportResistance(data) {
        const patterns = [];
        const highs = this.findPeaks(data);
        const lows = this.findTroughs(data);
        
        // Group similar price levels
        const resistanceLevels = this.groupSimilarLevels(highs);
        const supportLevels = this.groupSimilarLevels(lows);

        // Create support/resistance patterns
        resistanceLevels.forEach(level => {
            if (level.touches >= 3) {
                patterns.push({
                    pattern: 'resistance',
                    direction: 'bearish',
                    points: { level: level.price, touches: level.touches },
                    prz: level.price,
                    stopLoss: level.price * 1.01,
                    targetPrice: level.price * 0.95,
                    confidence: Math.min(0.9, level.touches * 0.2)
                });
            }
        });

        supportLevels.forEach(level => {
            if (level.touches >= 3) {
                patterns.push({
                    pattern: 'support',
                    direction: 'bullish',
                    points: { level: level.price, touches: level.touches },
                    prz: level.price,
                    stopLoss: level.price * 0.99,
                    targetPrice: level.price * 1.05,
                    confidence: Math.min(0.9, level.touches * 0.2)
                });
            }
        });

        return patterns;
    }

    // Helper methods for pattern detection
    findPeaks(data) {
        const peaks = [];
        for (let i = 2; i < data.length - 2; i++) {
            if (data[i].high > data[i-1].high && data[i].high > data[i+1].high &&
                data[i].high > data[i-2].high && data[i].high > data[i+2].high) {
                peaks.push({ index: i, price: data[i].high });
            }
        }
        return peaks;
    }

    findTroughs(data) {
        const troughs = [];
        for (let i = 2; i < data.length - 2; i++) {
            if (data[i].low < data[i-1].low && data[i].low < data[i+1].low &&
                data[i].low < data[i-2].low && data[i].low < data[i+2].low) {
                troughs.push({ index: i, price: data[i].low });
            }
        }
        return troughs;
    }

    calculateTrendSlope(data) {
        const first = data[0].close;
        const last = data[data.length - 1].close;
        return (last - first) / first;
    }

    calculatePriceRange(data) {
        const high = Math.max(...data.map(d => d.high));
        const low = Math.min(...data.map(d => d.low));
        return (high - low) / low;
    }

    groupSimilarLevels(points) {
        const groups = [];
        const tolerance = 0.01; // 1% tolerance
        
        points.forEach(point => {
            let grouped = false;
            for (let group of groups) {
                if (Math.abs(point.price - group.price) / group.price <= tolerance) {
                    group.touches++;
                    group.price = (group.price + point.price) / 2; // Average price
                    grouped = true;
                    break;
                }
            }
            if (!grouped) {
                groups.push({ price: point.price, touches: 1 });
            }
        });
        
        return groups;
    }

    calculatePatternConfidence(patternType, metrics) {
        // Calculate confidence based on pattern-specific metrics
        let confidence = 0.5; // Base confidence
        
        switch (patternType) {
            case 'head_and_shoulders':
                confidence = metrics.shoulderSymmetry * 0.5 + 
                           Math.min(metrics.headHeight, 0.1) * 5 * 0.3 + 0.2;
                break;
            case 'flag':
                confidence = metrics.trendStrength * 0.4 + 
                           metrics.consolidationTightness * 0.4 + 0.2;
                break;
            default:
                confidence = 0.6;
        }
        
        return Math.min(0.95, Math.max(0.3, confidence));
    }

    // Additional triangle detection methods
    detectAscendingTriangle(highs, lows) {
        // Implementation for ascending triangle
        // Horizontal resistance, ascending support
        return null; // Placeholder
    }

    detectDescendingTriangle(highs, lows) {
        // Implementation for descending triangle
        // Descending resistance, horizontal support
        return null; // Placeholder
    }

    detectSymmetricalTriangle(highs, lows) {
        // Implementation for symmetrical triangle
        // Converging trend lines
        return null; // Placeholder
    }

    detectRisingWedge(highs, lows) {
        // Implementation for rising wedge
        return null; // Placeholder
    }

    detectFallingWedge(highs, lows) {
        // Implementation for falling wedge
        return null; // Placeholder
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartPatterns;
}

/**
 * Candlestick Pattern Detection
 * 
 * This file contains functions to identify candlestick patterns such as
 * Doji, Hammer, Engulfing, Harami, and other reversal/continuation patterns
 */

class CandlestickPatterns {
    constructor() {
        this.patterns = {
            doji: {
                bodyThreshold: 0.1, // Body should be 10% or less of total range
                shadowRatio: 2.0    // Shadows should be at least 2x the body
            },
            hammer: {
                bodyRatio: 0.3,     // Body should be in upper 30% of range
                lowerShadowRatio: 2.0, // Lower shadow 2x body size
                upperShadowRatio: 0.1  // Upper shadow very small
            },
            engulfing: {
                minBodyRatio: 1.1   // Engulfing body should be 110% of previous
            },
            harami: {
                maxBodyRatio: 0.8   // Inside body should be 80% or less
            }
        };
    }

    /**
     * Scan for all candlestick patterns
     * @param {Array} data - OHLC price data
     * @returns {Array} - Array of detected patterns
     */
    scanForCandlestickPatterns(data) {
        const patterns = [];
        
        if (data.length < 2) {
            console.log('Insufficient data for candlestick pattern analysis');
            return patterns;
        }

        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const previous = data[i - 1];
            
            // Single candlestick patterns
            const doji = this.detectDoji(current);
            if (doji) patterns.push({...doji, index: i});

            const hammer = this.detectHammer(current);
            if (hammer) patterns.push({...hammer, index: i});

            const shootingStar = this.detectShootingStar(current);
            if (shootingStar) patterns.push({...shootingStar, index: i});

            const marubozu = this.detectMarubozu(current);
            if (marubozu) patterns.push({...marubozu, index: i});

            // Two-candlestick patterns
            const engulfing = this.detectEngulfing(previous, current);
            if (engulfing) patterns.push({...engulfing, index: i});

            const harami = this.detectHarami(previous, current);
            if (harami) patterns.push({...harami, index: i});

            const piercing = this.detectPiercingPattern(previous, current);
            if (piercing) patterns.push({...piercing, index: i});

            const darkCloud = this.detectDarkCloudCover(previous, current);
            if (darkCloud) patterns.push({...darkCloud, index: i});

            // Three-candlestick patterns (if we have enough data)
            if (i >= 2) {
                const thirdPrevious = data[i - 2];
                
                const morningStar = this.detectMorningStar(thirdPrevious, previous, current);
                if (morningStar) patterns.push({...morningStar, index: i});

                const eveningStar = this.detectEveningStar(thirdPrevious, previous, current);
                if (eveningStar) patterns.push({...eveningStar, index: i});

                const threeWhiteSoldiers = this.detectThreeWhiteSoldiers(thirdPrevious, previous, current);
                if (threeWhiteSoldiers) patterns.push({...threeWhiteSoldiers, index: i});

                const threeBlackCrows = this.detectThreeBlackCrows(thirdPrevious, previous, current);
                if (threeBlackCrows) patterns.push({...threeBlackCrows, index: i});
            }
        }

        return patterns;
    }

    /**
     * Detect Doji pattern
     * @param {Object} candle - Single candle OHLC data
     * @returns {Object|null} - Pattern object or null
     */
    detectDoji(candle) {
        const { open, high, low, close } = candle;
        const totalRange = high - low;
        const bodySize = Math.abs(close - open);
        
        if (totalRange === 0) return null;
        
        const bodyRatio = bodySize / totalRange;
        
        if (bodyRatio <= this.patterns.doji.bodyThreshold) {
            const upperShadow = high - Math.max(open, close);
            const lowerShadow = Math.min(open, close) - low;
            
            return {
                pattern: 'doji',
                direction: 'reversal',
                subtype: this.classifyDoji(upperShadow, lowerShadow, bodySize),
                points: { open, high, low, close },
                prz: close,
                stopLoss: bodyRatio < 0.05 ? high + (totalRange * 0.02) : low - (totalRange * 0.02),
                targetPrice: close + (close > open ? totalRange * 0.5 : -totalRange * 0.5),
                confidence: 1 - bodyRatio // Higher confidence for smaller bodies
            };
        }
        
        return null;
    }

    /**
     * Detect Hammer pattern
     * @param {Object} candle - Single candle OHLC data
     * @returns {Object|null} - Pattern object or null
     */
    detectHammer(candle) {
        const { open, high, low, close } = candle;
        const totalRange = high - low;
        const bodySize = Math.abs(close - open);
        const lowerShadow = Math.min(open, close) - low;
        const upperShadow = high - Math.max(open, close);
        
        if (totalRange === 0 || bodySize === 0) return null;
        
        // Hammer criteria
        const bodyInUpperPortion = (Math.min(open, close) - low) / totalRange >= 0.6;
        const longLowerShadow = lowerShadow >= bodySize * this.patterns.hammer.lowerShadowRatio;
        const shortUpperShadow = upperShadow <= bodySize * this.patterns.hammer.upperShadowRatio;
        
        if (bodyInUpperPortion && longLowerShadow && shortUpperShadow) {
            return {
                pattern: 'hammer',
                direction: 'bullish',
                subtype: close > open ? 'hammer' : 'hanging_man',
                points: { open, high, low, close },
                prz: close,
                stopLoss: low * 0.98,
                targetPrice: close + (totalRange * 0.618),
                confidence: this.calculateHammerConfidence(lowerShadow, bodySize, upperShadow)
            };
        }
        
        return null;
    }

    /**
     * Detect Shooting Star pattern
     * @param {Object} candle - Single candle OHLC data
     * @returns {Object|null} - Pattern object or null
     */
    detectShootingStar(candle) {
        const { open, high, low, close } = candle;
        const totalRange = high - low;
        const bodySize = Math.abs(close - open);
        const upperShadow = high - Math.max(open, close);
        const lowerShadow = Math.min(open, close) - low;
        
        if (totalRange === 0 || bodySize === 0) return null;
        
        // Shooting star criteria
        const bodyInLowerPortion = (high - Math.max(open, close)) / totalRange >= 0.6;
        const longUpperShadow = upperShadow >= bodySize * 2;
        const shortLowerShadow = lowerShadow <= bodySize * 0.1;
        
        if (bodyInLowerPortion && longUpperShadow && shortLowerShadow) {
            return {
                pattern: 'shooting_star',
                direction: 'bearish',
                points: { open, high, low, close },
                prz: close,
                stopLoss: high * 1.02,
                targetPrice: close - (totalRange * 0.618),
                confidence: this.calculateShootingStarConfidence(upperShadow, bodySize, lowerShadow)
            };
        }
        
        return null;
    }

    /**
     * Detect Marubozu pattern
     * @param {Object} candle - Single candle OHLC data
     * @returns {Object|null} - Pattern object or null
     */
    detectMarubozu(candle) {
        const { open, high, low, close } = candle;
        const totalRange = high - low;
        const bodySize = Math.abs(close - open);
        
        if (totalRange === 0) return null;
        
        const bodyRatio = bodySize / totalRange;
        
        if (bodyRatio >= 0.95) { // Body is 95% or more of total range
            return {
                pattern: 'marubozu',
                direction: close > open ? 'bullish' : 'bearish',
                subtype: close > open ? 'white_marubozu' : 'black_marubozu',
                points: { open, high, low, close },
                prz: close,
                stopLoss: close > open ? low * 0.99 : high * 1.01,
                targetPrice: close > open ? close + bodySize : close - bodySize,
                confidence: bodyRatio
            };
        }
        
        return null;
    }

    /**
     * Detect Engulfing pattern
     * @param {Object} prev - Previous candle
     * @param {Object} curr - Current candle
     * @returns {Object|null} - Pattern object or null
     */
    detectEngulfing(prev, curr) {
        const prevBody = Math.abs(prev.close - prev.open);
        const currBody = Math.abs(curr.close - curr.open);
        
        // Current candle must engulf previous candle's body
        const bullishEngulfing = prev.close < prev.open && curr.close > curr.open &&
                                curr.open < prev.close && curr.close > prev.open;
        
        const bearishEngulfing = prev.close > prev.open && curr.close < curr.open &&
                                curr.open > prev.close && curr.close < prev.open;
        
        if ((bullishEngulfing || bearishEngulfing) && currBody > prevBody * this.patterns.engulfing.minBodyRatio) {
            return {
                pattern: 'engulfing',
                direction: bullishEngulfing ? 'bullish' : 'bearish',
                subtype: bullishEngulfing ? 'bullish_engulfing' : 'bearish_engulfing',
                points: {
                    prev: { open: prev.open, close: prev.close },
                    curr: { open: curr.open, close: curr.close }
                },
                prz: curr.close,
                stopLoss: bullishEngulfing ? prev.low * 0.98 : prev.high * 1.02,
                targetPrice: bullishEngulfing ? 
                    curr.close + currBody : curr.close - currBody,
                confidence: Math.min(0.9, currBody / prevBody - 1)
            };
        }
        
        return null;
    }

    /**
     * Detect Harami pattern
     * @param {Object} prev - Previous candle
     * @param {Object} curr - Current candle
     * @returns {Object|null} - Pattern object or null
     */
    detectHarami(prev, curr) {
        const prevBody = Math.abs(prev.close - prev.open);
        const currBody = Math.abs(curr.close - curr.open);
        
        // Current candle must be inside previous candle's body
        const insideBody = curr.open > Math.min(prev.open, prev.close) &&
                          curr.open < Math.max(prev.open, prev.close) &&
                          curr.close > Math.min(prev.open, prev.close) &&
                          curr.close < Math.max(prev.open, prev.close);
        
        if (insideBody && currBody < prevBody * this.patterns.harami.maxBodyRatio) {
            const direction = Math.abs(prev.close - prev.open) > Math.abs(curr.close - curr.open) ? 'reversal' : 'continuation';
            
            return {
                pattern: 'harami',
                direction: direction,
                subtype: (prev.close > prev.open && curr.close < curr.open) ? 'bearish_harami' : 'bullish_harami',
                points: {
                    prev: { open: prev.open, close: prev.close },
                    curr: { open: curr.open, close: curr.close }
                },
                prz: curr.close,
                stopLoss: direction === 'bullish' ? prev.low * 0.99 : prev.high * 1.01,
                targetPrice: direction === 'bullish' ? 
                    curr.close + prevBody * 0.5 : curr.close - prevBody * 0.5,
                confidence: 1 - (currBody / prevBody)
            };
        }
        
        return null;
    }

    /**
     * Detect Piercing Pattern
     * @param {Object} prev - Previous candle
     * @param {Object} curr - Current candle
     * @returns {Object|null} - Pattern object or null
     */
    detectPiercingPattern(prev, curr) {
        // Previous must be bearish, current must be bullish
        if (prev.close >= prev.open || curr.close <= curr.open) return null;
        
        const prevBody = prev.open - prev.close;
        const currPenetration = curr.close - prev.close;
        const penetrationRatio = currPenetration / prevBody;
        
        // Current must open below previous low and close above midpoint of previous body
        if (curr.open < prev.low && penetrationRatio > 0.5) {
            return {
                pattern: 'piercing',
                direction: 'bullish',
                points: {
                    prev: { open: prev.open, close: prev.close },
                    curr: { open: curr.open, close: curr.close }
                },
                prz: curr.close,
                stopLoss: curr.open * 0.98,
                targetPrice: curr.close + prevBody,
                confidence: Math.min(0.9, penetrationRatio)
            };
        }
        
        return null;
    }

    /**
     * Detect Dark Cloud Cover
     * @param {Object} prev - Previous candle
     * @param {Object} curr - Current candle
     * @returns {Object|null} - Pattern object or null
     */
    detectDarkCloudCover(prev, curr) {
        // Previous must be bullish, current must be bearish
        if (prev.close <= prev.open || curr.close >= curr.open) return null;
        
        const prevBody = prev.close - prev.open;
        const currPenetration = prev.close - curr.close;
        const penetrationRatio = currPenetration / prevBody;
        
        // Current must open above previous high and close below midpoint of previous body
        if (curr.open > prev.high && penetrationRatio > 0.5) {
            return {
                pattern: 'dark_cloud_cover',
                direction: 'bearish',
                points: {
                    prev: { open: prev.open, close: prev.close },
                    curr: { open: curr.open, close: curr.close }
                },
                prz: curr.close,
                stopLoss: curr.open * 1.02,
                targetPrice: curr.close - prevBody,
                confidence: Math.min(0.9, penetrationRatio)
            };
        }
        
        return null;
    }

    // Three-candlestick patterns
    detectMorningStar(first, second, third) {
        // Implementation for morning star
        return null; // Placeholder
    }

    detectEveningStar(first, second, third) {
        // Implementation for evening star
        return null; // Placeholder
    }

    detectThreeWhiteSoldiers(first, second, third) {
        // Implementation for three white soldiers
        return null; // Placeholder
    }

    detectThreeBlackCrows(first, second, third) {
        // Implementation for three black crows
        return null; // Placeholder
    }

    // Helper methods
    classifyDoji(upperShadow, lowerShadow, bodySize) {
        if (upperShadow > lowerShadow * 2) return 'dragonfly_doji';
        if (lowerShadow > upperShadow * 2) return 'gravestone_doji';
        if (Math.abs(upperShadow - lowerShadow) / Math.max(upperShadow, lowerShadow) < 0.1) return 'standard_doji';
        return 'doji';
    }

    calculateHammerConfidence(lowerShadow, bodySize, upperShadow) {
        const shadowRatio = lowerShadow / bodySize;
        const upperShadowRatio = upperShadow / bodySize;
        return Math.min(0.95, 0.5 + (shadowRatio / 10) + (0.1 - upperShadowRatio) * 2);
    }

    calculateShootingStarConfidence(upperShadow, bodySize, lowerShadow) {
        const shadowRatio = upperShadow / bodySize;
        const lowerShadowRatio = lowerShadow / bodySize;
        return Math.min(0.95, 0.5 + (shadowRatio / 10) + (0.1 - lowerShadowRatio) * 2);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CandlestickPatterns;
}

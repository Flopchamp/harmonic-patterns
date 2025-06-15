/**
 * Confirmation Indicators
 * 
 * This file contains technical indicators that can be used to confirm
 * harmonic patterns and improve trading decisions.
 */

class ConfirmationIndicators {
    constructor() {
        this.indicators = {
            rsi: {
                overbought: 70,
                oversold: 30,
                period: 14
            },
            macd: {
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9
            },
            stochastic: {
                kPeriod: 14,
                dPeriod: 3,
                slowing: 3,
                overbought: 80,
                oversold: 20
            }
        };
    }

    // Calculate RSI (Relative Strength Index)
    calculateRSI(data, period = 14) {
        if (data.length < period + 1) {
            console.warn('Not enough data to calculate RSI');
            return null;
        }

        // Extract close prices
        const closes = data.map(candle => candle.close);
        
        // Calculate price changes
        const changes = [];
        for (let i = 1; i < closes.length; i++) {
            changes.push(closes[i] - closes[i - 1]);
        }
        
        // Calculate average gains and losses
        let gains = 0;
        let losses = 0;
        
        // Initial average
        for (let i = 0; i < period; i++) {
            if (changes[i] >= 0) {
                gains += changes[i];
            } else {
                losses += Math.abs(changes[i]);
            }
        }
        
        // Convert to averages
        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        // Calculate smoothed RSI for the rest of the data
        const rsiValues = [];
        
        // First RSI based on SMA
        let rs = avgGain / (avgLoss === 0 ? 0.0001 : avgLoss); // Avoid division by zero
        let rsi = 100 - (100 / (1 + rs));
        rsiValues.push(rsi);
        
        // Subsequent RSIs based on smoothed averages
        for (let i = period; i < changes.length; i++) {
            // Update average gain and loss using the smoothing technique
            avgGain = ((avgGain * (period - 1)) + (changes[i] >= 0 ? changes[i] : 0)) / period;
            avgLoss = ((avgLoss * (period - 1)) + (changes[i] < 0 ? Math.abs(changes[i]) : 0)) / period;
            
            rs = avgGain / (avgLoss === 0 ? 0.0001 : avgLoss); // Avoid division by zero
            rsi = 100 - (100 / (1 + rs));
            rsiValues.push(rsi);
        }
        
        return rsiValues;
    }

    // Calculate MACD (Moving Average Convergence Divergence)
    calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (data.length < slowPeriod + signalPeriod) {
            console.warn('Not enough data to calculate MACD');
            return null;
        }
        
        // Extract close prices
        const closes = data.map(candle => candle.close);
        
        // Calculate EMAs
        const fastEMA = this.calculateEMA(closes, fastPeriod);
        const slowEMA = this.calculateEMA(closes, slowPeriod);
        
        // Calculate MACD line
        const macdLine = [];
        for (let i = 0; i < fastEMA.length; i++) {
            if (i < slowEMA.length - fastEMA.length) {
                // Skip the beginning where we don't have slowEMA values yet
                continue;
            }
            macdLine.push(fastEMA[i] - slowEMA[i - (slowEMA.length - fastEMA.length)]);
        }
        
        // Calculate Signal line (EMA of MACD line)
        const signalLine = this.calculateEMA(macdLine, signalPeriod);
        
        // Calculate histogram (MACD line - Signal line)
        const histogram = [];
        for (let i = 0; i < signalLine.length; i++) {
            histogram.push(macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i]);
        }
        
        return {
            macdLine,
            signalLine,
            histogram
        };
    }

    // Calculate Stochastic Oscillator
    calculateStochastic(data, kPeriod = 14, dPeriod = 3, slowing = 3) {
        if (data.length < kPeriod + dPeriod) {
            console.warn('Not enough data to calculate Stochastic');
            return null;
        }
        
        const kValues = [];
        const dValues = [];
        
        // Calculate %K for each period
        for (let i = kPeriod - 1; i < data.length; i++) {
            // Find highest high and lowest low in the period
            let highestHigh = -Infinity;
            let lowestLow = Infinity;
            
            for (let j = 0; j < kPeriod; j++) {
                const high = data[i - j].high;
                const low = data[i - j].low;
                
                if (high > highestHigh) highestHigh = high;
                if (low < lowestLow) lowestLow = low;
            }
            
            // Calculate raw %K
            const currentClose = data[i].close;
            const rawK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
            
            // Apply slowing if specified
            if (slowing > 1 && kValues.length >= slowing - 1) {
                let sum = rawK;
                for (let s = 1; s < slowing; s++) {
                    sum += kValues[kValues.length - s];
                }
                kValues.push(sum / slowing);
            } else {
                kValues.push(rawK);
            }
        }
        
        // Calculate %D (SMA of %K)
        for (let i = dPeriod - 1; i < kValues.length; i++) {
            let sum = 0;
            for (let j = 0; j < dPeriod; j++) {
                sum += kValues[i - j];
            }
            dValues.push(sum / dPeriod);
        }
        
        return {
            k: kValues,
            d: dValues
        };
    }

    // Helper method to calculate EMA
    calculateEMA(data, period) {
        if (data.length < period) {
            return [];
        }
        
        // Start with SMA for first value
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i];
        }
        
        const ema = [sum / period];
        
        // Calculate multiplier
        const multiplier = 2 / (period + 1);
        
        // Calculate EMA for the rest of the data
        for (let i = period; i < data.length; i++) {
            const currentEma = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
            ema.push(currentEma);
        }
        
        return ema;
    }

    // Evaluate pattern using confirmation indicators
    confirmPattern(pattern, data) {
        const confirmations = {
            indicators: {},
            overallScore: 0,
            isPotentiallyValid: false
        };
        
        // Get the most recent data for indicator calculations
        const recentData = data.slice(-50); // Use last 50 candles
        
        // Calculate RSI
        const rsi = this.calculateRSI(recentData, this.indicators.rsi.period);
        if (rsi) {
            const currentRSI = rsi[rsi.length - 1];
            confirmations.indicators.rsi = {
                value: currentRSI,
                isConfirming: pattern.direction === 'bullish' ? 
                    currentRSI <= this.indicators.rsi.oversold : 
                    currentRSI >= this.indicators.rsi.overbought
            };
            
            // Add to overall score
            confirmations.overallScore += confirmations.indicators.rsi.isConfirming ? 1 : 0;
        }
        
        // Calculate MACD
        const macd = this.calculateMACD(
            recentData,
            this.indicators.macd.fastPeriod,
            this.indicators.macd.slowPeriod,
            this.indicators.macd.signalPeriod
        );
        if (macd) {
            const currentHistogram = macd.histogram[macd.histogram.length - 1];
            const previousHistogram = macd.histogram[macd.histogram.length - 2];
            
            // Check for histogram direction change (positive for bullish, negative for bearish)
            confirmations.indicators.macd = {
                value: currentHistogram,
                isConfirming: pattern.direction === 'bullish' ?
                    (currentHistogram > previousHistogram) : // Histogram is increasing (bullish)
                    (currentHistogram < previousHistogram)   // Histogram is decreasing (bearish)
            };
            
            // Add to overall score
            confirmations.overallScore += confirmations.indicators.macd.isConfirming ? 1 : 0;
        }
        
        // Calculate Stochastic
        const stochastic = this.calculateStochastic(
            recentData,
            this.indicators.stochastic.kPeriod,
            this.indicators.stochastic.dPeriod,
            this.indicators.stochastic.slowing
        );
        if (stochastic) {
            const currentK = stochastic.k[stochastic.k.length - 1];
            const currentD = stochastic.d[stochastic.d.length - 1];
            
            confirmations.indicators.stochastic = {
                valueK: currentK,
                valueD: currentD,
                isConfirming: pattern.direction === 'bullish' ?
                    (currentK <= this.indicators.stochastic.oversold && currentK > currentD) : // K is below oversold and crossing above D (bullish)
                    (currentK >= this.indicators.stochastic.overbought && currentK < currentD)  // K is above overbought and crossing below D (bearish)
            };
            
            // Add to overall score
            confirmations.overallScore += confirmations.indicators.stochastic.isConfirming ? 1 : 0;
        }
        
        // Calculate overall validity of pattern
        // Pattern is considered valid if at least 2 out of 3 indicators confirm it
        confirmations.isPotentiallyValid = confirmations.overallScore >= 2;
        
        // Calculate confidence score (0-100%)
        confirmations.confidenceScore = Math.round((confirmations.overallScore / 3) * 100);
        
        return confirmations;
    }
}

// Export the ConfirmationIndicators class
if (typeof module !== 'undefined') {
    module.exports = ConfirmationIndicators;
}

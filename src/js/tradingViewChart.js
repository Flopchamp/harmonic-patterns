/**
 * TradingView Chart Integration
 * 
 * This file handles the integration with TradingView's charting library
 * and displays harmonic patterns on the chart.
 */

class TradingViewChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.widget = null;
        this.symbol = 'EURUSD';
        this.interval = '60'; // Default to 1h
        this.activePatterns = []; // Store active pattern drawings
        this.chartReady = false;
    }

    initialize() {        // Create a TradingView Advanced Chart widget
        const widgetOptions = {
            "autosize": false,
            "symbol": this.symbol,
            "interval": this.interval,
            "timezone": "Etc/UTC",
            "theme": "light",
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "allow_symbol_change": true,
            "container_id": this.containerId,
            "save_image": false,
            "studies": [
                "MASimple@tv-basicstudies"
            ],
            "show_popup_button": true,
            "popup_width": "1000",
            "popup_height": "650",
            "hide_side_toolbar": false,
            "withdateranges": true,
            "hide_legend": false,
            "details": true,
            "hotlist": true,
            "calendar": true,
            "drawings_access": { "type": "all" },
            "watchlist": [],
            "height": 700,
            "width": "100%"
        };try {
            // Clear any existing content in the container
            document.getElementById(this.containerId).innerHTML = '';
            
            // Use the TradingView Advanced Chart Widget
            this.widget = new TradingView.widget(widgetOptions);
            
            // Add a listener for when the chart is ready
            const readyCheck = setInterval(() => {
                if (typeof this.widget === 'object' && document.getElementById(this.containerId).querySelector('iframe')) {
                    clearInterval(readyCheck);
                    console.log('Chart is ready');
                    this.chartReady = true;
                    
                    // Dispatch an event that the chart is ready
                    const chartReadyEvent = new CustomEvent('chartReady');
                    document.dispatchEvent(chartReadyEvent);
                }
            }, 500);
        } catch (error) {
            console.error('Error initializing TradingView chart:', error);
        }
    }    // Change the symbol being displayed
    setSymbol(symbol) {
        if (this.widget && this.chartReady) {
            this.symbol = symbol;
            
            try {
                // For advanced chart widget, reinitialize with the new symbol
                const container = document.getElementById(this.containerId);
                container.innerHTML = '';
                  const widgetOptions = {
                    "autosize": false,
                    "symbol": symbol,
                    "interval": this.interval,
                    "timezone": "Etc/UTC",
                    "theme": "light",
                    "style": "1",
                    "locale": "en",
                    "enable_publishing": false,
                    "allow_symbol_change": true,
                    "container_id": this.containerId,
                    "save_image": false,
                    "height": 700,
                    "width": "100%"
                };
                
                this.widget = new TradingView.widget(widgetOptions);
                console.log(`Symbol changed to ${symbol}`);
                
                // Clear previously drawn patterns
                this.clearPatterns();
            } catch (error) {
                console.error('Error changing symbol:', error);
            }
        } else {
            // If chart isn't ready yet, store the symbol to be used when it initializes
            this.symbol = symbol;
        }
    }

    // Change the timeframe
    setInterval(interval) {
        if (this.widget && this.chartReady) {
            this.interval = interval;
            
            try {
                // For advanced chart widget, reinitialize with the new interval
                const container = document.getElementById(this.containerId);
                container.innerHTML = '';
                
                const widgetOptions = {
                    "autosize": true,
                    "symbol": this.symbol,
                    "interval": interval,
                    "timezone": "Etc/UTC",
                    "theme": "light",
                    "style": "1",
                    "locale": "en",
                    "enable_publishing": false,
                    "allow_symbol_change": true,
                    "container_id": this.containerId,
                    "save_image": false
                };
                
                this.widget = new TradingView.widget(widgetOptions);
                console.log(`Interval changed to ${interval}`);
                
                // Clear previously drawn patterns
                this.clearPatterns();
            } catch (error) {
                console.error('Error changing interval:', error);
            }
        } else {
            // If chart isn't ready yet, store the interval to be used when it initializes
            this.interval = interval;
        }
    }

    // Clear all patterns from the chart
    clearPatterns() {
        if (this.widget && this.chartReady) {
            this.activePatterns.forEach(id => {
                this.widget.chart().removeEntity(id);
            });
            this.activePatterns = [];
        }
    }

    // Draw a harmonic pattern on the chart
    drawPattern(pattern) {
        if (!this.widget || !this.chartReady) return;

        const chart = this.widget.chart();

        // Set color based on pattern direction
        const lineColor = pattern.direction === 'bullish' ? '#26a69a' : '#ef5350';
        
        // Get the points from the pattern
        const { points, timestamp } = pattern;
        
        // If it's an XABCD pattern
        if (points.x !== undefined) {
            // Create points array for the pattern lines
            // We need to convert our price points to time-price coordinates
            // This is simplified - in a real implementation, you would need to get the actual timestamps
            const coordinates = [
                { time: timestamp - 4 * 60 * 60 * 1000, price: points.x },
                { time: timestamp - 3 * 60 * 60 * 1000, price: points.a },
                { time: timestamp - 2 * 60 * 60 * 1000, price: points.b },
                { time: timestamp - 1 * 60 * 60 * 1000, price: points.c },
                { time: timestamp, price: points.d }
            ];

            // Draw the pattern lines
            const lineId = chart.createMultipointShape(
                coordinates.map(coord => ({ time: coord.time, price: coord.price })),
                {
                    shape: 'polyline',
                    lock: true,
                    disableSelection: false,
                    disableSave: false,
                    disableUndo: false,
                    overrides: {
                        linecolor: lineColor,
                        linewidth: 2,
                        linestyle: 0, // Solid line
                        showMiddlePoint: true,
                        showLastPoint: true,
                        leftEnd: 0, // Normal end
                        rightEnd: 0  // Normal end
                    },
                    zOrder: 'top',
                    text: pattern.pattern.toUpperCase()
                }
            );

            this.activePatterns.push(lineId);

            // Add labels to each point
            const labels = ['X', 'A', 'B', 'C', 'D'];
            coordinates.forEach((coord, index) => {
                const textId = chart.createShape(
                    { time: coord.time, price: coord.price },
                    {
                        shape: 'text',
                        lock: true,
                        disableSelection: false,
                        disableSave: false,
                        disableUndo: false,
                        overrides: {
                            text: labels[index],
                            fontsize: 14,
                            bold: true,
                            color: lineColor
                        },
                        zOrder: 'top'
                    }
                );
                this.activePatterns.push(textId);
            });

            // Add potential reversal zone (PRZ) at point D
            const przId = chart.createShape(
                { time: timestamp, price: points.d },
                {
                    shape: 'circle',
                    lock: true,
                    disableSelection: false,
                    disableSave: false,
                    disableUndo: false,
                    overrides: {
                        color: lineColor,
                        size: 5,
                        borderWidth: 1,
                        borderColor: '#000000',
                        text: 'PRZ'
                    },
                    zOrder: 'top'
                }
            );
            this.activePatterns.push(przId);

            // Draw stop loss level
            const slId = chart.createShape(
                { time: timestamp, price: pattern.stopLoss },
                {
                    shape: 'horizontal_line',
                    lock: true,
                    disableSelection: false,
                    disableSave: false,
                    disableUndo: false,
                    overrides: {
                        linecolor: '#ff5252',
                        linewidth: 1,
                        linestyle: 1,  // Dashed line
                        text: 'SL',
                        textcolor: '#ff5252'
                    },
                    zOrder: 'top'
                }
            );
            this.activePatterns.push(slId);

            // Draw target price level
            const tpId = chart.createShape(
                { time: timestamp, price: pattern.targetPrice },
                {
                    shape: 'horizontal_line',
                    lock: true,
                    disableSelection: false,
                    disableSave: false,
                    disableUndo: false,
                    overrides: {
                        linecolor: '#4caf50',
                        linewidth: 1,
                        linestyle: 1,  // Dashed line
                        text: 'TP',
                        textcolor: '#4caf50'
                    },
                    zOrder: 'top'
                }
            );
            this.activePatterns.push(tpId);
        } else {
            // It's an ABCD pattern
            const coordinates = [
                { time: timestamp - 3 * 60 * 60 * 1000, price: points.a },
                { time: timestamp - 2 * 60 * 60 * 1000, price: points.b },
                { time: timestamp - 1 * 60 * 60 * 1000, price: points.c },
                { time: timestamp, price: points.d }
            ];

            // Similar drawing logic for ABCD pattern...
            const lineId = chart.createMultipointShape(
                coordinates.map(coord => ({ time: coord.time, price: coord.price })),
                {
                    shape: 'polyline',
                    lock: true,
                    disableSelection: false,
                    disableSave: false,
                    disableUndo: false,
                    overrides: {
                        linecolor: lineColor,
                        linewidth: 2,
                        linestyle: 0, // Solid line
                        showMiddlePoint: true,
                        showLastPoint: true,
                        leftEnd: 0, // Normal end
                        rightEnd: 0  // Normal end
                    },
                    zOrder: 'top',
                    text: pattern.pattern.toUpperCase()
                }
            );

            this.activePatterns.push(lineId);

            // Add labels to each point
            const labels = ['A', 'B', 'C', 'D'];
            coordinates.forEach((coord, index) => {
                const textId = chart.createShape(
                    { time: coord.time, price: coord.price },
                    {
                        shape: 'text',
                        lock: true,
                        disableSelection: false,
                        disableSave: false,
                        disableUndo: false,
                        overrides: {
                            text: labels[index],
                            fontsize: 14,
                            bold: true,
                            color: lineColor
                        },
                        zOrder: 'top'
                    }
                );
                this.activePatterns.push(textId);
            });

            // Add stop loss and target price lines similar to XABCD
            // ... (similar to the code above)
        }
    }

    // Method to display pattern details tooltip
    showPatternDetails(pattern, event) {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'pattern-tooltip';
        
        // Build tooltip content
        tooltip.innerHTML = `
            <h4>${pattern.pattern.toUpperCase()} Pattern (${pattern.direction})</h4>
            <p>Symbol: ${pattern.symbol}</p>
            <p>PRZ: ${pattern.prz.toFixed(5)}</p>
            <p>Stop Loss: ${pattern.stopLoss.toFixed(5)}</p>
            <p>Target: ${pattern.targetPrice.toFixed(5)}</p>
        `;
        
        // Position the tooltip near the mouse
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY + 10}px`;
        
        // Add to document
        document.body.appendChild(tooltip);
        
        // Remove tooltip when mouse moves away
        setTimeout(() => {
            document.body.removeChild(tooltip);
        }, 3000);
    }
}

// Export the TradingViewChart class
if (typeof module !== 'undefined') {
    module.exports = TradingViewChart;
}

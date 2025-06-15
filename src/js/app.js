/**
 * Main Application File
 * 
 * This file coordinates between the scanner, chart, and UI components.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing application...');
    
    // Add loading indicator
    const chartContainer = document.getElementById('tradingview-chart-container');
    chartContainer.innerHTML = '<div class="loading-indicator">Loading chart...</div>';
    
    // Initialize WebSocket connection for API status updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    
    // WebSocket event handlers
    ws.onopen = () => console.log('WebSocket connected');
    ws.onclose = () => console.log('WebSocket disconnected');
    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'apiStatus') {
                updateApiStatusDisplay(data);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };    // Function to update API status display
    function updateApiStatusDisplay(data) {
        const apiUsageBar = document.getElementById('api-usage-bar');
        const apiRateInfo = document.getElementById('api-rate-info');
        const apiNotice = document.getElementById('api-notice');
        const apiQueueBadge = document.getElementById('api-queue-badge');
        
        // Update usage bar
        const minuteUsagePercent = Math.min(100, data.minuteUsage * 100);
        apiUsageBar.style.width = minuteUsagePercent + '%';
        
        // Handle queue badge display
        if (data.queueLength > 0) {
            apiQueueBadge.style.display = 'inline';
            apiQueueBadge.textContent = `${data.queueLength} in queue`;
            apiQueueBadge.className = 'badge badge-pill badge-warning ml-2';
        } else {
            apiQueueBadge.style.display = 'none';
        }
        
        // Construct detailed status message
        let statusMsg = '';
        if (data.minuteUsage >= 1) {
            statusMsg = `${data.minuteRequests}/${data.minuteLimit} per min (reset in ${data.nextResetInSeconds}s)`;
        } else {
            statusMsg = `${data.minuteRequests}/${data.minuteLimit} per min, ${data.dayRequests}/${data.dayLimit} per day`;
        }
        
        // Update status text and colors
        if (minuteUsagePercent >= 80) {
            apiUsageBar.className = 'progress-bar bg-danger';
            apiNotice.className = 'api-notice alert alert-danger text-center';
            apiRateInfo.textContent = `API Rate Limited: ${statusMsg}`;
        } else if (minuteUsagePercent >= 50) {
            apiUsageBar.className = 'progress-bar bg-warning';
            apiNotice.className = 'api-notice alert alert-warning text-center';
            apiRateInfo.textContent = `API Usage High: ${statusMsg}`;
        } else {
            apiUsageBar.className = 'progress-bar bg-success';
            apiNotice.className = 'api-notice alert alert-success text-center';
            apiRateInfo.textContent = `API Status OK: ${statusMsg}`;
        }
        
        // Add pulse animation effect when queue is processing
        if (data.isProcessing && data.queueLength > 0) {
            apiUsageBar.classList.add('pulse-animation');
        } else {
            apiUsageBar.classList.remove('pulse-animation');
        }
    }
    
    // Initialize the scanner
    const scanner = new Scanner();
    console.log('Scanner initialized');
    
    // Initialize the TradingView chart
    const tvChart = new TradingViewChart('tradingview-chart-container');
    tvChart.initialize();
    console.log('TradingView chart initialization started');
    
    // Reference to the patterns table
    const patternsTable = document.getElementById('patterns-list');
    
    // UI elements
    const marketSelect = document.getElementById('market-type');
    const timeframeSelect = document.getElementById('timeframe');
    const patternSelect = document.getElementById('pattern-type');
    
    // Event listener for market selection change
    marketSelect.addEventListener('change', function() {
        console.log(`Market changed to ${this.value}`);
        scanner.setMarket(this.value);
        scanner.runScan(); // Run a new scan when market changes
    });
    
    // Event listener for timeframe selection change
    timeframeSelect.addEventListener('change', function() {
        console.log(`Timeframe changed to ${this.value}`);
        scanner.setTimeframe(this.value);
        
        // Map the selected timeframe to TradingView interval format
        const tvInterval = {
            '1m': '1',
            '5m': '5',
            '15m': '15',
            '30m': '30',
            '1h': '60',
            '4h': '240',
            '1d': 'D'
        }[this.value];
        
        tvChart.setInterval(tvInterval);
        scanner.runScan(); // Run a new scan when timeframe changes
    });
    
    // Event listener for pattern type selection change
    patternSelect.addEventListener('change', function() {
        console.log(`Pattern filter changed to ${this.value}`);
        updatePatternsTable(scanner.filterResultsByPattern(this.value));
    });
    
    // Listen for scan completion events
    document.addEventListener('scanComplete', function(event) {
        console.log('Scan complete event received');
        const results = event.detail.results;
        updatePatternsTable(results);
    });
      // Function to update the patterns table with scan results
    function updatePatternsTable(results) {
        // Clear existing table rows
        patternsTable.innerHTML = '';
        
        // Add header row for confidence score if not present
        const tableHeader = document.querySelector('#patterns-table thead tr');
        if (!document.querySelector('#confidence-header')) {
            const confidenceHeader = document.createElement('th');
            confidenceHeader.id = 'confidence-header';
            confidenceHeader.textContent = 'Confidence';
            tableHeader.insertBefore(confidenceHeader, tableHeader.querySelector('th:last-child'));
        }
        
        // Add new rows for each pattern
        results.forEach(pattern => {
            const row = document.createElement('tr');
            
            // Add symbol cell
            const symbolCell = document.createElement('td');
            symbolCell.textContent = pattern.symbol;
            row.appendChild(symbolCell);
            
            // Add pattern type cell
            const patternCell = document.createElement('td');
            patternCell.textContent = pattern.pattern.toUpperCase();
            row.appendChild(patternCell);
            
            // Add timeframe cell
            const timeframeCell = document.createElement('td');
            timeframeCell.textContent = scanner.currentTimeframe;
            row.appendChild(timeframeCell);
            
            // Add direction cell
            const directionCell = document.createElement('td');
            directionCell.textContent = pattern.direction.charAt(0).toUpperCase() + pattern.direction.slice(1);
            directionCell.className = pattern.direction;
            row.appendChild(directionCell);
            
            // Add confidence score cell
            const confidenceCell = document.createElement('td');
            if (pattern.confirmation && pattern.confirmation.confidenceScore !== undefined) {
                confidenceCell.textContent = pattern.confirmation.confidenceScore + '%';
                
                // Add visual indicator based on confidence score
                if (pattern.confirmation.confidenceScore >= 66) {
                    confidenceCell.className = 'text-success font-weight-bold';
                } else if (pattern.confirmation.confidenceScore >= 33) {
                    confidenceCell.className = 'text-warning';
                } else {
                    confidenceCell.className = 'text-danger';
                }
            } else {
                confidenceCell.textContent = 'N/A';
                confidenceCell.className = 'text-muted';
            }
            row.appendChild(confidenceCell);
            
            // Add action button cell
            const actionCell = document.createElement('td');
            const viewButton = document.createElement('button');
            viewButton.className = 'btn btn-sm btn-primary';
            viewButton.textContent = 'View';
            viewButton.addEventListener('click', function() {
                // Change the chart symbol to the pattern's symbol
                tvChart.setSymbol(pattern.symbol);
                
                // Clear any existing patterns
                tvChart.clearPatterns();
                
                // Draw the pattern on the chart
                tvChart.drawPattern(pattern);
                
                // Show confirmation indicators if available
                if (pattern.confirmation) {
                    const indicators = pattern.confirmation.indicators;
                    let indicatorText = `
                        <div class="pattern-confirmation">
                            <h5>Confirmation Indicators</h5>
                            <ul>
                    `;
                    
                    if (indicators.rsi) {
                        indicatorText += `<li>RSI: ${indicators.rsi.value.toFixed(2)} 
                            <span class="${indicators.rsi.isConfirming ? 'text-success' : 'text-danger'}">
                                (${indicators.rsi.isConfirming ? '✓' : '✗'})
                            </span></li>`;
                    }
                    
                    if (indicators.macd) {
                        indicatorText += `<li>MACD Histogram: ${indicators.macd.value.toFixed(4)}
                            <span class="${indicators.macd.isConfirming ? 'text-success' : 'text-danger'}">
                                (${indicators.macd.isConfirming ? '✓' : '✗'})
                            </span></li>`;
                    }
                    
                    if (indicators.stochastic) {
                        indicatorText += `<li>Stochastic: K=${indicators.stochastic.valueK.toFixed(2)} D=${indicators.stochastic.valueD.toFixed(2)}
                            <span class="${indicators.stochastic.isConfirming ? 'text-success' : 'text-danger'}">
                                (${indicators.stochastic.isConfirming ? '✓' : '✗'})
                            </span></li>`;
                    }
                    
                    indicatorText += `
                            </ul>
                            <p class="confidence-score">Overall Confidence: 
                                <span class="${
                                    pattern.confirmation.confidenceScore >= 66 ? 'text-success' : 
                                    pattern.confirmation.confidenceScore >= 33 ? 'text-warning' : 'text-danger'
                                }">${pattern.confirmation.confidenceScore}%</span>
                            </p>
                        </div>
                    `;
                    
                    // Display indicators in a modal or info panel
                    const indicatorsContainer = document.createElement('div');
                    indicatorsContainer.className = 'indicators-info';
                    indicatorsContainer.innerHTML = indicatorText;
                    
                    // Add to DOM - you might want to add this to a modal or specific container
                    const chartContainer = document.getElementById('tradingview-chart-container');
                    const existingInfo = document.querySelector('.indicators-info');
                    if (existingInfo) existingInfo.remove();
                    chartContainer.appendChild(indicatorsContainer);
                }
            });
            actionCell.appendChild(viewButton);
            row.appendChild(actionCell);
            
            // Add click event to the row to show pattern details
            row.addEventListener('click', function(event) {
                if (!event.target.matches('button')) {
                    tvChart.showPatternDetails(pattern, event);
                }
            });
            
            // Add the row to the table
            patternsTable.appendChild(row);
        });
        
        // Show a message if no patterns found
        if (results.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 5;
            cell.textContent = 'No patterns detected in the current scan';
            cell.className = 'text-center';
            row.appendChild(cell);
            patternsTable.appendChild(row);
        }
    }
      // Start the scanner with more frequent updates
    scanner.startScanning(0.5); // Scan every 30 seconds
});

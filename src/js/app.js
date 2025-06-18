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
      // Initialize the scanner with enhanced 1-minute scanning
    const scanner = new Scanner();
    console.log('✅ Enhanced Pattern Scanner v2.0 initialized');
    console.log('🎯 Supports: Harmonic + Chart + Candlestick patterns');
    console.log('🌍 Markets: Forex, Crypto, Metals, Stocks');
    console.log('⏱️  Default: 1-minute scanning interval');
    
    // Set default to 1-minute timeframe for frequent scanning
    scanner.setTimeframe('1m');
    
    // Start automatic scanning every minute
    scanner.startScanning(1); // 1 minute interval
    
    // Listen for scan completion events
    document.addEventListener('scanComplete', function(event) {
        const results = event.detail.results;
        console.log(`📊 Scan complete: ${results.length} patterns found`);
        
        // Update the patterns table with new results
        updatePatternsTable(results);
        
        // Update statistics display
        updateScanStatistics(scanner.getScanStatistics());
    });
    
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
    if (marketSelect) {
        marketSelect.addEventListener('change', handleMarketChange);
    }
    
    // Event listener for timeframe selection change
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', handleTimeframeChange);
    }
    
    // Event listener for pattern filter change
    if (patternSelect) {
        patternSelect.addEventListener('change', handlePatternFilter);
    }
    
    // Manual scan trigger button
    const manualScanBtn = document.getElementById('manual-scan-btn');
    if (manualScanBtn) {
        manualScanBtn.addEventListener('click', () => {
            console.log('🔍 Manual scan triggered...');
            scanner.runScan();
        });
    }
    
    // Start/Stop scanning button
    const toggleScanBtn = document.getElementById('toggle-scan-btn');
    if (toggleScanBtn) {
        toggleScanBtn.addEventListener('click', () => {
            if (scanner.scanInterval) {
                scanner.stopScanning();
                toggleScanBtn.textContent = 'Start Auto Scan';
                toggleScanBtn.className = 'btn btn-success';
            } else {
                scanner.startScanning(1);
                toggleScanBtn.textContent = 'Stop Auto Scan';
                toggleScanBtn.className = 'btn btn-danger';
            }
        });
    }
    
    // Multi-timeframe analysis button
    const multiTfBtn = document.getElementById('multi-tf-btn');
    if (multiTfBtn) {
        multiTfBtn.addEventListener('click', async () => {
            const symbol = document.getElementById('symbol-input')?.value || 'EURUSD';
            console.log(`🔍 Running multi-timeframe analysis for ${symbol}...`);
            
            const results = await scanner.runMultiTimeframeAnalysis(symbol);
            console.log('Multi-timeframe results:', results);
            
            // Display results in console for now (could be enhanced with UI)
            Object.entries(results).forEach(([tf, patterns]) => {
                console.log(`${tf}: ${patterns.length} patterns`);
                patterns.forEach(p => {
                    console.log(`  - ${p.pattern} (${p.direction}) PRZ: ${p.prz?.toFixed(4)}`);
                });
            });
        });
    }
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
    }    // Enhanced function to update patterns table with detailed information
    function updatePatternsTable(patterns) {
        if (!patternsTable) return;
        
        // Clear existing patterns
        patternsTable.innerHTML = '';
        
        if (patterns.length === 0) {
            patternsTable.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        🔍 No patterns detected in current scan
                    </td>
                </tr>
            `;
            return;
        }
        
        // Sort patterns by confidence and timestamp
        const sortedPatterns = patterns.sort((a, b) => {
            const confidenceA = a.confidence || 0.5;
            const confidenceB = b.confidence || 0.5;
            if (confidenceA !== confidenceB) return confidenceB - confidenceA;
            return b.timestamp - a.timestamp;
        });
        
        sortedPatterns.forEach((pattern, index) => {
            const row = document.createElement('tr');
            
            // Add visual indicators based on pattern strength
            const confidenceClass = getConfidenceClass(pattern.confidence);
            const patternTypeIcon = getPatternTypeIcon(pattern.pattern);
            const directionIcon = getDirectionIcon(pattern.direction);
            
            row.innerHTML = `
                <td>
                    <span class="badge badge-${confidenceClass}">${index + 1}</span>
                    ${patternTypeIcon}
                </td>
                <td>
                    <strong>${pattern.symbol}</strong>
                    <small class="text-muted d-block">${pattern.market.toUpperCase()}</small>
                </td>
                <td>
                    <span class="pattern-name">${pattern.pattern.toUpperCase()}</span>
                    <small class="text-muted d-block">${pattern.timeframe}</small>
                </td>
                <td>
                    <span class="direction-${pattern.direction}">
                        ${directionIcon} ${pattern.direction.toUpperCase()}
                    </span>
                </td>
                <td>
                    <strong>${pattern.prz ? pattern.prz.toFixed(4) : 'N/A'}</strong>
                    <small class="text-muted d-block">PRZ Level</small>
                </td>
                <td>
                    <span class="text-danger">${pattern.stopLoss ? pattern.stopLoss.toFixed(4) : 'N/A'}</span>
                    <small class="text-muted d-block">Stop Loss</small>
                </td>
                <td>
                    <span class="text-success">${pattern.takeProfit ? pattern.takeProfit.toFixed(4) : 'N/A'}</span>
                    <small class="text-muted d-block">Take Profit</small>
                </td>
                <td>
                    <div class="confidence-bar">
                        <div class="confidence-fill confidence-${confidenceClass}" 
                             style="width: ${(pattern.confidence || 0.5) * 100}%"></div>
                    </div>
                    <small class="text-muted">${((pattern.confidence || 0.5) * 100).toFixed(0)}%</small>
                </td>
            `;
            
            // Add click handler for pattern details
            row.addEventListener('click', () => showPatternDetails(pattern));
            row.style.cursor = 'pointer';
            
            patternsTable.appendChild(row);
        });
    }
    
    // Update scan statistics display
    function updateScanStatistics(stats) {
        // Update scan counter
        const scanCounter = document.getElementById('scan-counter');
        if (scanCounter) {
            scanCounter.textContent = `Scan #${stats.totalScans}`;
        }
        
        // Update patterns found counter
        const patternsCounter = document.getElementById('patterns-counter');
        if (patternsCounter) {
            patternsCounter.textContent = `${stats.patternsFound} total patterns`;
        }
        
        // Update last scan time
        const lastScanTime = document.getElementById('last-scan-time');
        if (lastScanTime && stats.lastScanTime) {
            lastScanTime.textContent = new Date(stats.lastScanTime).toLocaleTimeString();
        }
        
        // Update success rate
        const successRate = document.getElementById('success-rate');
        if (successRate) {
            const rate = ((stats.totalScans - stats.errorCount) / stats.totalScans * 100).toFixed(1);
            successRate.textContent = `${rate}% success`;
        }
    }
    
    // Helper function to get confidence class for styling
    function getConfidenceClass(confidence) {
        const conf = confidence || 0.5;
        if (conf >= 0.8) return 'success';
        if (conf >= 0.6) return 'warning';
        return 'secondary';
    }
    
    // Helper function to get pattern type icon
    function getPatternTypeIcon(patternType) {
        const harmonicPatterns = ['gartley', 'butterfly', 'bat', 'crab', 'abcd'];
        const chartPatterns = ['head_and_shoulders', 'triangle', 'flag', 'support', 'resistance'];
        
        if (harmonicPatterns.includes(patternType)) return '🔹';
        if (chartPatterns.includes(patternType)) return '📊';
        return '🕯️'; // Candlestick patterns
    }
    
    // Helper function to get direction icon
    function getDirectionIcon(direction) {
        const icons = {
            'bullish': '📈',
            'bearish': '📉',
            'reversal': '🔄',
            'continuation': '➡️'
        };
        return icons[direction] || '📊';
    }
    
    // Show detailed pattern information in modal or expanded view
    function showPatternDetails(pattern) {
        console.log('📊 Pattern Details:', {
            symbol: pattern.symbol,
            pattern: pattern.pattern.toUpperCase(),
            direction: pattern.direction,
            timeframe: pattern.timeframe,
            prz: pattern.prz,
            stopLoss: pattern.stopLoss,
            takeProfit: pattern.takeProfit,
            confidence: pattern.confidence,
            riskRewardRatio: pattern.riskRewardRatio,
            timestamp: new Date(pattern.timestamp).toLocaleString()
        });
        
        // You can implement a modal here to show more details
        alert(`Pattern: ${pattern.pattern.toUpperCase()}\nSymbol: ${pattern.symbol}\nDirection: ${pattern.direction}\nPRZ: ${pattern.prz?.toFixed(4)}\nConfidence: ${((pattern.confidence || 0.5) * 100).toFixed(1)}%`);
    }
    
    // Enhanced market change handler
    function handleMarketChange() {
        const selectedMarket = marketSelect.value;
        console.log(`🌍 Market changed to: ${selectedMarket.toUpperCase()}`);
        
        scanner.setMarket(selectedMarket);
        
        // Clear current results and run immediate scan
        patternsTable.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Scanning...</span>
                    </div>
                    <div>Scanning ${selectedMarket.toUpperCase()} market...</div>
                </td>
            </tr>
        `;
        
        // Run immediate scan for new market
        setTimeout(() => scanner.runScan(), 100);
    }
    
    // Enhanced timeframe change handler
    function handleTimeframeChange() {
        const selectedTimeframe = timeframeSelect.value;
        console.log(`⏱️ Timeframe changed to: ${selectedTimeframe}`);
        
        scanner.setTimeframe(selectedTimeframe);
        
        // Run immediate scan for new timeframe
        setTimeout(() => scanner.runScan(), 100);
    }
    
    // Enhanced pattern filter handler
    function handlePatternFilter() {
        const selectedPattern = patternSelect.value;
        console.log(`🔍 Pattern filter: ${selectedPattern}`);
        
        const currentResults = scanner.getResults();
        const filteredResults = scanner.filterResultsByPattern(selectedPattern);
        
        updatePatternsTable(filteredResults);
    }
});

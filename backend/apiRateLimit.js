/**
 * API Rate Limiter
 * 
 * This file manages API rate limits for external services like Alpha Vantage
 * to prevent exceeding quotas and ensure optimal data retrieval.
 */

class ApiRateLimiter {
    constructor(requestsPerMinute, requestsPerDay) {
        this.requestsPerMinute = requestsPerMinute || 5;  // Default Alpha Vantage limit
        this.requestsPerDay = requestsPerDay || 500;      // Default Alpha Vantage limit
        
        this.minuteRequests = 0;
        this.dayRequests = 0;
        this.lastMinuteReset = Date.now();
        this.lastDayReset = Date.now();
        
        // Queue for pending requests
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        // Start the queue processor
        setInterval(() => this.processQueue(), 15000); // Check queue every 15 seconds
        
        // Reset counters
        setInterval(() => this.resetMinuteCounter(), 60000); // Reset minute counter every 60 seconds
        setInterval(() => this.resetDayCounter(), 86400000); // Reset day counter every 24 hours
    }
    
    resetMinuteCounter() {
        this.minuteRequests = 0;
        this.lastMinuteReset = Date.now();
        console.log('API rate limit: Minute counter reset');
    }
    
    resetDayCounter() {
        this.dayRequests = 0;
        this.lastDayReset = Date.now();
        console.log('API rate limit: Day counter reset');
    }
    
    canMakeRequest() {
        // Auto-reset if the time has elapsed
        const now = Date.now();
        if (now - this.lastMinuteReset >= 60000) {
            this.resetMinuteCounter();
        }
        if (now - this.lastDayReset >= 86400000) {
            this.resetDayCounter();
        }
        
        return (this.minuteRequests < this.requestsPerMinute) && 
               (this.dayRequests < this.requestsPerDay);
    }
      async makeRequest(requestFn, fallbackFn) {
        if (this.canMakeRequest()) {
            // Increment counters before making request
            this.minuteRequests++;
            this.dayRequests++;
            
            console.log(`API rate limit: ${this.minuteRequests}/${this.requestsPerMinute} per minute, ${this.dayRequests}/${this.requestsPerDay} per day`);
            
            // Broadcast rate limit status update
            this.broadcastStatus();
            
            try {
                // Make the actual API request
                return await requestFn();
            } catch (error) {
                console.error('API request failed:', error.message);
                // If request fails, use fallback
                return fallbackFn ? fallbackFn() : null;
            }
        } else {
            console.log('API rate limit reached, using fallback data');
            // Use fallback if rate limit reached
            return fallbackFn ? fallbackFn() : null;
        }
    }
      // Method to broadcast status to all connected WebSocket clients
    broadcastStatus() {
        // If the WebSocket server is available, broadcast status
        if (global.wss) {
            const status = {
                type: 'apiStatus',
                minuteUsage: this.minuteRequests / this.requestsPerMinute,
                dayUsage: this.dayRequests / this.requestsPerDay,
                minuteRequests: this.minuteRequests,
                dayRequests: this.dayRequests,
                minuteLimit: this.requestsPerMinute,
                dayLimit: this.requestsPerDay,
                queueLength: this.requestQueue.length,
                isProcessing: this.isProcessingQueue,
                nextResetInSeconds: Math.max(0, 60 - Math.floor((Date.now() - this.lastMinuteReset) / 1000)),
                timestamp: Date.now()
            };
            
            global.wss.clients.forEach(client => {
                if (client.readyState === 1) { // OPEN
                    client.send(JSON.stringify(status));
                }
            });
        }
    }
    
    queueRequest(requestFn, fallbackFn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                requestFn,
                fallbackFn,
                resolve,
                reject,
                addedAt: Date.now()
            });
            
            console.log(`Request queued. Queue length: ${this.requestQueue.length}`);
            
            // Start processing the queue if not already running
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }
      async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        try {
            while (this.requestQueue.length > 0) {
                if (!this.canMakeRequest()) {
                    // Calculate time until next reset
                    const now = Date.now();
                    const timeUntilMinuteReset = 60000 - (now - this.lastMinuteReset);
                    
                    console.log(`Rate limit reached. Pausing queue processing for ${Math.round(timeUntilMinuteReset/1000)}s.`);
                    this.broadcastStatus(); // Broadcast updated status including queue length
                    
                    // Wait until we can make a request again
                    await new Promise(resolve => setTimeout(resolve, Math.min(timeUntilMinuteReset + 100, 10000)));
                    continue;
                }
                
                const request = this.requestQueue.shift();
                const waitTime = Date.now() - request.addedAt;
                
                console.log(`Processing queued request (waited ${Math.round(waitTime/1000)}s). Remaining queue: ${this.requestQueue.length}`);
                
                try {
                    const result = await this.makeRequest(request.requestFn, request.fallbackFn);
                    request.resolve(result);
                } catch (error) {
                    console.error('Error processing queued request:', error);
                    request.reject(error);
                }
                
                // Broadcast updated status after each request
                this.broadcastStatus();
                
                // Add a small delay between requests to be nice to the API
                if (this.requestQueue.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        } catch (error) {
            console.error('Error in queue processing:', error);
        } finally {
            this.isProcessingQueue = false;
            this.broadcastStatus(); // Final status broadcast
        }
    }
}

module.exports = ApiRateLimiter;

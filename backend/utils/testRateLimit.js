/**
 * API Rate Limiter Test Script
 * 
 * This script tests the API rate limiter by simulating multiple requests in rapid succession.
 * It helps verify that the queue system works correctly and the status is broadcast to clients.
 */

const ApiRateLimiter = require('../apiRateLimit');

// Create a rate limiter with test settings (2 requests per minute for easy testing)
const testRateLimiter = new ApiRateLimiter(2, 10);

// Make the WebSocket server available globally (mock)
global.wss = {
    clients: [{
        readyState: 1, // OPEN
        send: (data) => {
            console.log('WebSocket broadcast:', JSON.parse(data));
        }
    }]
};

// Simulate successful API request
async function mockSuccessRequest() {
    console.log('Making successful request...');
    return { data: 'Success response data' };
}

// Simulate failed API request
async function mockFailedRequest() {
    console.log('Making failing request...');
    throw new Error('API request failed');
}

// Simulate fallback response
function mockFallbackResponse() {
    console.log('Using fallback response...');
    return { data: 'Fallback data', rateLimited: true };
}

// Run multiple requests to test rate limiting
async function runTest() {
    console.log('Starting API rate limiter test...');
    
    // Queue several requests in rapid succession
    const requests = [];
    for (let i = 0; i < 8; i++) {
        console.log(`Queueing request #${i+1}`);
        const promise = testRateLimiter.queueRequest(
            mockSuccessRequest,
            mockFallbackResponse
        );
        requests.push(promise);
        
        // Small delay to simulate requests coming in slightly staggered
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Wait for all requests to complete
    const results = await Promise.all(requests);
    console.log('All requests completed. Results:', results.length);
    
    // Check final state
    console.log('Final state:');
    console.log(`- Minute requests: ${testRateLimiter.minuteRequests}/${testRateLimiter.requestsPerMinute}`);
    console.log(`- Day requests: ${testRateLimiter.dayRequests}/${testRateLimiter.requestsPerDay}`);
    console.log(`- Queue length: ${testRateLimiter.requestQueue.length}`);
    console.log(`- Processing queue: ${testRateLimiter.isProcessingQueue}`);
}

// Run the test
runTest().catch(error => {
    console.error('Test error:', error);
});

/**
 * Data Cache Utility
 * 
 * This module provides caching functionality for API responses to reduce
 * the number of external API calls and improve performance.
 * 
 * Features:
 * - In-memory cache with configurable TTL (Time To Live)
 * - Cache invalidation based on time
 * - Storage of historical price data and symbols
 */

class DataCache {
    constructor(defaultTTL = 3600000) { // Default TTL: 1 hour in milliseconds
        this.cache = {};
        this.defaultTTL = defaultTTL;
    }

    /**
     * Set a value in the cache with an optional custom TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to store
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key, value, ttl = this.defaultTTL) {
        console.log(`Cache: Setting value for key "${key}"`);
        this.cache[key] = {
            value,
            expires: Date.now() + ttl
        };
    }

    /**
     * Get a value from the cache
     * @param {string} key - Cache key
     * @returns {any|null} - Cached value or null if expired/not found
     */
    get(key) {
        const item = this.cache[key];
        
        // If item doesn't exist or is expired
        if (!item || Date.now() > item.expires) {
            if (item) {
                console.log(`Cache: Key "${key}" has expired`);
                // Remove expired item
                delete this.cache[key];
            } else {
                console.log(`Cache: Key "${key}" not found`);
            }
            return null;
        }
        
        console.log(`Cache: Retrieved value for key "${key}"`);
        return item.value;
    }

    /**
     * Check if a key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean} - Whether key exists and is valid
     */
    has(key) {
        const item = this.cache[key];
        return item !== undefined && Date.now() <= item.expires;
    }

    /**
     * Delete a specific key from the cache
     * @param {string} key - Cache key
     */
    delete(key) {
        delete this.cache[key];
    }

    /**
     * Clear all expired items from the cache
     */
    clearExpired() {
        const now = Date.now();
        let count = 0;
        
        Object.keys(this.cache).forEach(key => {
            if (now > this.cache[key].expires) {
                delete this.cache[key];
                count++;
            }
        });
        
        console.log(`Cache: Cleared ${count} expired items`);
    }

    /**
     * Clear the entire cache
     */
    clear() {
        this.cache = {};
        console.log('Cache: Cleared all items');
    }

    /**
     * Get or fetch data - tries to get from cache first, if not available calls fetcher function
     * @param {string} key - Cache key
     * @param {Function} fetcher - Async function to fetch data if not in cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     * @returns {Promise<any>} - Cached or freshly fetched data
     */
    async getOrFetch(key, fetcher, ttl = this.defaultTTL) {
        // Try to get from cache first
        const cachedValue = this.get(key);
        if (cachedValue !== null) {
            return cachedValue;
        }
        
        // Not in cache, fetch fresh data
        console.log(`Cache: Fetching fresh data for key "${key}"`);
        try {
            const freshData = await fetcher();
            this.set(key, freshData, ttl);
            return freshData;
        } catch (error) {
            console.error(`Cache: Error fetching data for key "${key}":`, error);
            throw error;
        }
    }

    /**
     * Get stats about the current cache
     * @returns {Object} - Cache statistics
     */
    getStats() {
        const now = Date.now();
        const total = Object.keys(this.cache).length;
        let expired = 0;
        
        Object.values(this.cache).forEach(item => {
            if (now > item.expires) {
                expired++;
            }
        });
        
        return {
            total,
            expired,
            active: total - expired,
            defaultTTL: this.defaultTTL
        };
    }
}

// Create and export a singleton instance
const dataCache = new DataCache();

// Set up automatic clearing of expired items (every 5 minutes)
setInterval(() => {
    dataCache.clearExpired();
}, 300000);

module.exports = dataCache;

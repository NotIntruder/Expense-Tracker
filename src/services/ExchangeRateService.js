/**
 * Exchange Rate Service
 * Handles currency conversion with API integration and offline fallback
 */

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// API Configuration - returns all rates with USD as base
const API_URL = 'https://api.exchangerate-api.com/v6/latest';

// Static fallback rates (approximate, January 2026)
const STATIC_RATES = {
    'USD': {
        'EUR': 0.92, 'GBP': 0.79, 'INR': 83.00, 'JPY': 148.00,
        'CNY': 7.10, 'CAD': 1.35, 'AUD': 1.52, 'CHF': 0.88,
        'BRL': 4.95, 'USD': 1.00
    },
    'EUR': {
        'USD': 1.09, 'GBP': 0.86, 'INR': 90.00, 'JPY': 161.00,
        'CNY': 7.70, 'CAD': 1.47, 'AUD': 1.66, 'CHF': 0.96,
        'BRL': 5.38, 'EUR': 1.00
    },
    'GBP': {
        'USD': 1.27, 'EUR': 1.16, 'INR': 105.00, 'JPY': 188.00,
        'CNY': 9.00, 'CAD': 1.71, 'AUD': 1.93, 'CHF': 1.12,
        'BRL': 6.27, 'GBP': 1.00
    },
    'INR': {
        'USD': 0.012, 'EUR': 0.011, 'GBP': 0.0095, 'JPY': 1.78,
        'CNY': 0.085, 'CAD': 0.016, 'AUD': 0.018, 'CHF': 0.011,
        'BRL': 0.060, 'INR': 1.00
    },
    'JPY': {
        'USD': 0.0068, 'EUR': 0.0062, 'GBP': 0.0053, 'INR': 0.56,
        'CNY': 0.048, 'CAD': 0.0091, 'AUD': 0.010, 'CHF': 0.0059,
        'BRL': 0.033, 'JPY': 1.00
    },
    'CNY': {
        'USD': 0.14, 'EUR': 0.13, 'GBP': 0.11, 'INR': 11.70,
        'JPY': 20.80, 'CAD': 0.19, 'AUD': 0.21, 'CHF': 0.12,
        'BRL': 0.70, 'CNY': 1.00
    }
};

// Map currency symbols to codes
const SYMBOL_TO_CODE = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '₹': 'INR',
    '¥': 'JPY',
    'C$': 'CAD',
    'A$': 'AUD',
    'Fr': 'CHF',
    'R$': 'BRL'
};

export class ExchangeRateService {
    constructor() {
        this.cache = {
            rates: null,
            baseCurrency: null,
            timestamp: null
        };
    }

    /**
     * Get currency code from symbol
     * @param {string} symbol - Currency symbol
     * @returns {string} - Currency code
     */
    getCodeFromSymbol(symbol) {
        return SYMBOL_TO_CODE[symbol] || symbol;
    }

    /**
     * Fetch exchange rates from API (always USD-based)
     * @returns {Promise<Object>} - Rates object
     */
    async fetchRates() {
        try {
            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // API returns rates with USD as base
            const rates = data.rates;

            // Cache the USD-based rates
            this.cache = {
                rates: rates,
                baseCurrency: 'USD',
                timestamp: Date.now()
            };

            return rates;
        } catch (error) {
            console.warn('Failed to fetch exchange rates:', error);
            return null;
        }
    }

    /**
     * Get cached rates if still valid
     * @param {string} baseCurrency - Base currency code
     * @returns {Object|null} - Cached rates or null
     */
    getCachedRates(baseCurrency) {
        if (!this.cache.rates ||
            !this.cache.timestamp ||
            this.cache.baseCurrency !== baseCurrency) {
            return null;
        }

        const age = Date.now() - this.cache.timestamp;
        if (age > CACHE_DURATION) {
            return null; // Cache expired
        }

        return this.cache.rates;
    }

    /**
     * Get rates (always USD-based from API)
     * @returns {Promise<Object>} - Rates object with USD as base
     */
    async getRates() {
        // Check cache first
        const cached = this.getCachedRates('USD');
        if (cached) {
            return cached;
        }

        // Try to fetch from API
        const fetched = await this.fetchRates();
        if (fetched) {
            return fetched;
        }

        // Fallback to static rates
        console.warn('Using static fallback rates');
        return STATIC_RATES['USD'];
    }

    /**
     * Convert amount between currencies using USD-based rates
     * @param {number} amount - Amount to convert
     * @param {string} fromCurrency - Source currency (symbol or code)
     * @param {string} toCurrency - Target currency (symbol or code)
     * @returns {Promise<number>} - Converted amount
     */
    async convert(amount, fromCurrency, toCurrency) {
        // Convert symbols to codes
        const fromCode = this.getCodeFromSymbol(fromCurrency);
        const toCode = this.getCodeFromSymbol(toCurrency);

        // Same currency, no conversion needed
        if (fromCode === toCode) {
            return amount;
        }

        try {
            // Get USD-based rates
            const rates = await this.getRates();

            // Cross-conversion using USD as intermediary
            // Formula: (amount / fromRate) * toRate
            const fromRate = rates[fromCode];
            const toRate = rates[toCode];

            if (!fromRate || !toRate) {
                console.warn(`No rate found for ${fromCode} or ${toCode}, using 1:1`);
                return amount;
            }

            return (amount / fromRate) * toRate;
        } catch (error) {
            console.error('Conversion error:', error);
            return amount; // Return original on error
        }
    }

    /**
     * Convert synchronously using cached or static rates (USD-based)
     * @param {number} amount - Amount to convert
     * @param {string} fromCurrency - Source currency
     * @param {string} toCurrency - Target currency
     * @returns {number} - Converted amount
     */
    convertStatic(amount, fromCurrency, toCurrency) {
        const fromCode = this.getCodeFromSymbol(fromCurrency);
        const toCode = this.getCodeFromSymbol(toCurrency);

        if (fromCode === toCode) {
            return amount;
        }

        // Get USD-based rates (cached API rates or static fallback)
        const rates = this.cache.rates || STATIC_RATES['USD'];

        // Cross-conversion using USD as intermediary
        const fromRate = rates[fromCode];
        const toRate = rates[toCode];

        if (!fromRate || !toRate) {
            return amount;
        }

        return (amount / fromRate) * toRate;
    }

    /**
     * Preload rates from API (for CLI startup)
     * @returns {Promise<boolean>} - Success status
     */
    async preloadRates() {
        try {
            const rates = await this.fetchRates();
            return rates !== null;
        } catch (error) {
            console.warn('Could not preload rates, using static fallback');
            return false;
        }
    }

    /**
     * Get cache status
     * @returns {Object} - Cache information
     */
    getCacheStatus() {
        if (!this.cache.timestamp) {
            return { cached: false, age: null, base: null };
        }

        const age = Date.now() - this.cache.timestamp;
        const ageHours = Math.floor(age / (1000 * 60 * 60));

        return {
            cached: true,
            age: ageHours,
            base: this.cache.baseCurrency,
            expired: age > CACHE_DURATION
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache = {
            rates: null,
            baseCurrency: null,
            timestamp: null
        };
    }
}

// Create singleton instance
export const exchangeRateService = new ExchangeRateService();

/**
 * Input Validation Utilities
 * Functions for validating user input
 */

import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '../config/constants.js';
import { parseDate, isNotFutureDate } from './dateUtils.js';

/**
 * Validate monetary amount
 * @param {string} amount - Amount string to validate
 * @returns {{isValid: boolean, value: number|null, error: string|null}}
 */
export function validateAmount(amount) {
    if (!amount || amount.trim() === '') {
        return {
            isValid: false,
            value: null,
            error: 'Amount cannot be empty'
        };
    }

    // Validate format: digits with optional 1-2 decimal places
    const trimmed = amount.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
        return {
            isValid: false,
            value: null,
            error: 'Amount must be a valid number (max 2 decimal places, no letters)'
        };
    }

    const numValue = parseFloat(trimmed);

    if (isNaN(numValue)) {
        return {
            isValid: false,
            value: null,
            error: 'Amount must be a valid number'
        };
    }

    // Check for Infinity
    if (!isFinite(numValue)) {
        return {
            isValid: false,
            value: null,
            error: 'Amount must be a finite number'
        };
    }

    if (numValue <= 0) {
        return {
            isValid: false,
            value: null,
            error: 'Amount must be greater than zero'
        };
    }

    if (numValue > 999999999) {
        return {
            isValid: false,
            value: null,
            error: 'Amount is too large'
        };
    }

    // Round to 2 decimal places - Knowing this will cause Minor inaccuracy for some values
    const roundedValue = Math.round(numValue * 100) / 100;

    return {
        isValid: true,
        value: roundedValue,
        error: null
    };
}

/**
 * Validate date
 * @param {string} dateString - Date string to validate
 * @param {boolean} allowFuture - Whether to allow future dates
 * @returns {{isValid: boolean, value: Date|null, error: string|null}}
 */
export function validateDate(dateString, allowFuture = false) {
    if (!dateString || dateString.trim() === '') {
        return {
            isValid: false,
            value: null,
            error: 'Date cannot be empty'
        };
    }

    const date = parseDate(dateString);

    if (!date) {
        return {
            isValid: false,
            value: null,
            error: 'Invalid date format. Use DD/MM/YYYY or YYYY-MM-DD'
        };
    }

    if (!allowFuture && !isNotFutureDate(date)) {
        return {
            isValid: false,
            value: null,
            error: 'Date cannot be in the future'
        };
    }

    return {
        isValid: true,
        value: date,
        error: null
    };
}

/**
 * Validate expense category
 * @param {string} category - Category to validate
 * @returns {{isValid: boolean, value: string|null, error: string|null}}
 */
export function validateCategory(category) {
    if (!category || category.trim() === '') {
        return {
            isValid: false,
            value: null,
            error: 'Category cannot be empty'
        };
    }

    const normalizedCategory = category.trim();
    const matchedCategory = EXPENSE_CATEGORIES.find(
        cat => cat.toLowerCase() === normalizedCategory.toLowerCase()
    );

    if (!matchedCategory) {
        return {
            isValid: false,
            value: null,
            error: `Invalid category. Choose from: ${EXPENSE_CATEGORIES.join(', ')}`
        };
    }

    return {
        isValid: true,
        value: matchedCategory,
        error: null
    };
}

/**
 * Validate income source
 * @param {string} source - Source to validate
 * @returns {{isValid: boolean, value: string|null, error: string|null}}
 */
export function validateSource(source) {
    if (!source || source.trim() === '') {
        return {
            isValid: false,
            value: null,
            error: 'Source cannot be empty'
        };
    }

    const normalizedSource = source.trim();
    const matchedSource = INCOME_SOURCES.find(
        src => src.toLowerCase() === normalizedSource.toLowerCase()
    );

    if (!matchedSource) {
        return {
            isValid: false,
            value: null,
            error: `Invalid source. Choose from: ${INCOME_SOURCES.join(', ')}`
        };
    }

    return {
        isValid: true,
        value: matchedSource,
        error: null
    };
}

/**
 * Validate description (optional field)
 * @param {string} description - Description to validate
 * @returns {{isValid: boolean, value: string, error: string|null}}
 */
export function validateDescription(description) {
    const trimmed = (description || '').trim();

    if (trimmed.length > 500) {
        return {
            isValid: false,
            value: trimmed,
            error: 'Description is too long (max 500 characters)'
        };
    }

    return {
        isValid: true,
        value: trimmed,
        error: null
    };
}

/**
 * Validate record ID
 * @param {string} id - ID to validate
 * @returns {{isValid: boolean, value: string|null, error: string|null}}
 */
export function validateId(id) {
    if (!id || id.trim() === '') {
        return {
            isValid: false,
            value: null,
            error: 'ID cannot be empty'
        };
    }

    return {
        isValid: true,
        value: id.trim(),
        error: null
    };
}

/**
 * Date Utilities
 * Functions for parsing, formatting, and validating dates
 */

/**
 * Parse date string in multiple formats
 * @param {string} dateString - Date in DD/MM/YYYY or YYYY-MM-DD format
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
export function parseDate(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        return null;
    }

    // Try DD/MM/YYYY format
    const ddmmyyyyMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        const date = new Date(year, month - 1, day);
        if (isValidDate(date)) {
            return date;
        }
    }

    // Try YYYY-MM-DD format
    const yyyymmddMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmddMatch) {
        const [, year, month, day] = yyyymmddMatch;
        const date = new Date(year, month - 1, day);
        if (isValidDate(date)) {
            return date;
        }
    }

    return null;
}

/**
 * Format date to DD/MM/YYYY
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
    if (!(date instanceof Date) || !isValidDate(date)) {
        return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Format date to YYYY-MM-DD for storage
 * @param {Date|string} date - Date object or ISO date string
 * @returns {string} - ISO format date string
 */
export function formatDateISO(date) {
    // If it's already a string in ISO format, validate and return it
    if (typeof date === 'string') {
        // Validate it's a valid date string
        const testDate = new Date(date);
        if (isValidDate(testDate)) {
            // For YYYY-MM-DD format strings, return as-is
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return date;
            }
            // For other date strings, format properly
            const day = String(testDate.getDate()).padStart(2, '0');
            const month = String(testDate.getMonth() + 1).padStart(2, '0');
            const year = testDate.getFullYear();
            return `${year}-${month}-${day}`;
        }
        return '';
    }

    // Handle Date objects
    if (!(date instanceof Date) || !isValidDate(date)) {
        return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${year}-${month}-${day}`;
}

/**
 * Check if date is valid
 * @param {Date} date - Date object to validate
 * @returns {boolean} - True if valid
 */
function isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if date is not in the future
 * @param {Date} date - Date to check
 * @returns {boolean} - True if date is today or in the past
 */
export function isNotFutureDate(date) {
    if (!isValidDate(date)) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create copy to avoid mutating original date
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate <= today;
}

/**
 * Check if date is within range
 * @param {Date|string} date - Date to check (can be Date object or ISO string)
 * @param {Date|string|null} startDate - Range start (inclusive)
 * @param {Date|string|null} endDate - Range end (inclusive)
 * @returns {boolean} - True if within range
 */
export function isDateInRange(date, startDate, endDate) {
    // Convert string to Date if needed
    const checkDate = typeof date === 'string' ? new Date(date) : new Date(date);

    if (isNaN(checkDate.getTime())) {
        return false;
    }

    checkDate.setHours(0, 0, 0, 0);

    if (startDate) {
        const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
        if (!isNaN(start.getTime())) {
            start.setHours(0, 0, 0, 0);
            if (checkDate < start) {
                return false;
            }
        }
    }

    if (endDate) {
        const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);
        if (!isNaN(end.getTime())) {
            end.setHours(0, 0, 0, 0);
            if (checkDate > end) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Get current date
 * @returns {Date} - Current date
 */
export function getCurrentDate() {
    return new Date();
}

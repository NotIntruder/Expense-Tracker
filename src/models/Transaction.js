/**
 * Transaction Model
 * Base class for all financial transactions
 */

import { v4 as uuidv4 } from 'uuid';
import { formatDateISO } from '../utils/dateUtils.js';

export class Transaction {
    constructor(amount, date, description = '', currency = '$', id = null) {
        this.id = id || uuidv4();
        this.amount = amount;
        this.date = formatDateISO(date);
        this.description = description;
        this.currency = currency;
        this.createdAt = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            amount: this.amount,
            date: this.date,
            description: this.description,
            currency: this.currency,
            createdAt: this.createdAt
        };
    }

    static fromJSON(json) {
        const transaction = new Transaction(
            json.amount,
            json.date,
            json.description || '',
            json.currency || '$',
            json.id
        );
        transaction.createdAt = json.createdAt;
        return transaction;
    }

    validate() {
        const errors = [];

        if (typeof this.amount !== 'number') {
            errors.push('Amount must be a number');
        } else if (isNaN(this.amount)) {
            errors.push('Amount cannot be NaN');
        } else if (!isFinite(this.amount)) {
            errors.push('Amount must be finite');
        } else if (this.amount <= 0) {
            errors.push('Amount must be a positive number');
        }

        if (!this.date) {
            errors.push('Date is required');
        } else {
            const dateObj = this.date instanceof Date ? this.date : new Date(this.date);
            if (isNaN(dateObj.getTime())) {
                errors.push('Date must be a valid date');
            }
        }

        if (this.description !== undefined && this.description !== null && typeof this.description !== 'string') {
            errors.push('Description must be a string');
        }

        if (this.description && this.description.length > 500) {
            errors.push('Description is too long (max 500 characters)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

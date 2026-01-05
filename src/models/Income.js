/**
 * Income Model
 * Represents an income transaction
 */

import { Transaction } from './Transaction.js';
import { INCOME_SOURCES } from '../config/constants.js';

export class Income extends Transaction {
    constructor(amount, date, source, description = '', currency = '$', id = null) {
        super(amount, date, description, currency, id);
        this.source = source;
        this.type = 'income';
    }

    toJSON() {
        return {
            ...super.toJSON(),
            source: this.source,
            type: this.type
        };
    }

    static fromJSON(json) {
        const income = new Income(
            json.amount,
            json.date,
            json.source,
            json.description || '',
            json.currency || '$',
            json.id
        );
        income.createdAt = json.createdAt;
        return income;
    }

    validate() {
        const baseValidation = super.validate();
        const errors = [...baseValidation.errors];

        if (!this.source) {
            errors.push('Source is required');
        } else if (typeof this.source !== 'string') {
            errors.push('Source must be a string');
        } else if (!INCOME_SOURCES.includes(this.source)) {
            errors.push(`Invalid source. Must be one of: ${INCOME_SOURCES.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

/**
 * Expense Model
 * Represents an expense transaction
 */

import { Transaction } from './Transaction.js';
import { EXPENSE_CATEGORIES } from '../config/constants.js';

export class Expense extends Transaction {
    constructor(amount, date, category, description = '', currency = '$', id = null) {
        super(amount, date, description, currency, id);
        this.category = category;
        this.type = 'expense';
    }

    toJSON() {
        return {
            ...super.toJSON(),
            category: this.category,
            type: this.type
        };
    }

    static fromJSON(json) {
        const expense = new Expense(
            json.amount,
            json.date,
            json.category,
            json.description || '',
            json.currency || '$',
            json.id
        );
        expense.createdAt = json.createdAt;
        return expense;
    }

    validate() {
        const baseValidation = super.validate();
        const errors = [...baseValidation.errors];

        if (!this.category) {
            errors.push('Category is required');
        } else if (typeof this.category !== 'string') {
            errors.push('Category must be a string');
        } else if (!EXPENSE_CATEGORIES.includes(this.category)) {
            errors.push(`Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

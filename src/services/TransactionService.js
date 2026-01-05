/**
 * Transaction Service
 * Business logic for managing transactions
 */

import { StorageService } from './StorageService.js';
import { Expense } from '../models/Expense.js';
import { Income } from '../models/Income.js';
import { isDateInRange } from '../utils/dateUtils.js';

export class TransactionService {
    constructor(storage = null) {
        this.storage = storage || new StorageService();
    }

    addExpense(amount, date, category, description = '', currency = '$') {
        try {
            const expense = new Expense(amount, date, category, description, currency);

            const validation = expense.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: validation.errors.join(', '),
                    expense: null
                };
            }

            this.storage.addExpense(expense.toJSON());

            return {
                success: true,
                message: 'Expense added successfully',
                expense: expense.toJSON()
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to add expense: ${error.message}`,
                expense: null
            };
        }
    }

    addIncome(amount, date, source, description = '', currency = '$') {
        try {
            const income = new Income(amount, date, source, description, currency);

            const validation = income.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: validation.errors.join(', '),
                    income: null
                };
            }

            this.storage.addIncome(income.toJSON());

            return {
                success: true,
                message: 'Income added successfully',
                income: income.toJSON()
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to add income: ${error.message}`,
                income: null
            };
        }
    }

    getTransactions(filters = {}) {
        const expenses = this.storage.getExpenses();
        const income = this.storage.getIncome();

        let transactions = [
            ...expenses.map(e => ({ ...e, type: 'expense' })),
            ...income.map(i => ({ ...i, type: 'income' }))
        ];

        if (filters.type === 'expense') {
            transactions = transactions.filter(t => t.type === 'expense');
        } else if (filters.type === 'income') {
            transactions = transactions.filter(t => t.type === 'income');
        }

        if (filters.startDate || filters.endDate) {
            transactions = transactions.filter(t => {
                return isDateInRange(t.date, filters.startDate, filters.endDate);
            });
        }

        if (filters.category) {
            transactions = transactions.filter(t =>
                t.type === 'expense' && t.category === filters.category
            );
        }

        if (filters.source) {
            transactions = transactions.filter(t =>
                t.type === 'income' && t.source === filters.source
            );
        }

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        return transactions;
    }

    getSummary(filters = {}) {
        const transactions = this.getTransactions(filters);

        let totalIncome = 0;
        let totalExpenses = 0;
        let expenseCount = 0;
        let incomeCount = 0;
        const byCategory = {};
        const bySource = {};

        transactions.forEach(t => {
            if (t.type === 'expense') {
                totalExpenses += t.amount;
                expenseCount++;
                const cat = t.category || 'Other';
                byCategory[cat] = (byCategory[cat] || 0) + t.amount;
            } else {
                totalIncome += t.amount;
                incomeCount++;
                const src = t.source || 'Other';
                bySource[src] = (bySource[src] || 0) + t.amount;
            }
        });

        return {
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses,
            byCategory,
            bySource,
            transactionCount: transactions.length,
            expenseCount,
            incomeCount
        };
    }

    getExpenseById(id) {
        const expenses = this.storage.getExpenses();
        return expenses.find(e => e.id === id) || null;
    }

    getIncomeById(id) {
        const income = this.storage.getIncome();
        return income.find(i => i.id === id) || null;
    }

    getTransactionById(id) {
        const expense = this.getExpenseById(id);
        if (expense) return { ...expense, type: 'expense' };

        const income = this.getIncomeById(id);
        if (income) return { ...income, type: 'income' };

        return null;
    }

    findTransactionById(partialId) {
        const expenses = this.storage.getExpenses();
        const income = this.storage.getIncome();

        // Search expenses with partial ID match
        const expense = expenses.find(e => e.id && e.id.startsWith(partialId));
        if (expense) {
            return { type: 'expense', transaction: expense };
        }

        // Search income with partial ID match
        const incomeItem = income.find(i => i.id && i.id.startsWith(partialId));
        if (incomeItem) {
            return { type: 'income', transaction: incomeItem };
        }

        return null;
    }

    deleteExpense(id) {
        try {
            const expense = this.getExpenseById(id);
            if (!expense) {
                return { success: false, message: 'Expense not found' };
            }

            this.storage.deleteExpense(id);
            return { success: true, message: 'Expense deleted successfully' };
        } catch (error) {
            return { success: false, message: `Failed to delete expense: ${error.message}` };
        }
    }

    deleteIncome(id) {
        try {
            const income = this.getIncomeById(id);
            if (!income) {
                return { success: false, message: 'Income not found' };
            }

            this.storage.deleteIncome(id);
            return { success: true, message: 'Income deleted successfully' };
        } catch (error) {
            return { success: false, message: `Failed to delete income: ${error.message}` };
        }
    }

    deleteTransaction(id) {
        const transaction = this.getTransactionById(id);
        if (!transaction) {
            return { success: false, message: 'Transaction not found' };
        }

        if (transaction.type === 'expense') {
            return this.deleteExpense(id);
        } else {
            return this.deleteIncome(id);
        }
    }

    updateExpense(id, updates) {
        try {
            const expense = this.getExpenseById(id);
            if (!expense) {
                return { success: false, message: 'Expense not found' };
            }

            const updatedExpense = new Expense(
                updates.amount !== undefined ? updates.amount : expense.amount,
                updates.date !== undefined ? new Date(updates.date) : new Date(expense.date),
                updates.category !== undefined ? updates.category : expense.category,
                updates.description !== undefined ? updates.description : expense.description,
                updates.currency !== undefined ? updates.currency : (expense.currency || '$'), // CURRENCY UPDATE SUPPORT
                expense.id
            );

            const validation = updatedExpense.validate();
            if (!validation.isValid) {
                return { success: false, message: validation.errors.join(', ') };
            }

            this.storage.updateExpense(id, updatedExpense.toJSON());
            return { success: true, message: 'Expense updated successfully', expense: updatedExpense.toJSON() };
        } catch (error) {
            return { success: false, message: `Failed to update expense: ${error.message}` };
        }
    }

    updateIncome(id, updates) {
        try {
            const income = this.getIncomeById(id);
            if (!income) {
                return { success: false, message: 'Income not found' };
            }

            const updatedIncome = new Income(
                updates.amount !== undefined ? updates.amount : income.amount,
                updates.date !== undefined ? new Date(updates.date) : new Date(income.date),
                updates.source !== undefined ? updates.source : income.source,
                updates.description !== undefined ? updates.description : income.description,
                updates.currency !== undefined ? updates.currency : (income.currency || '$'), // CURRENCY UPDATE SUPPORT
                income.id
            );

            const validation = updatedIncome.validate();
            if (!validation.isValid) {
                return { success: false, message: validation.errors.join(', ') };
            }

            this.storage.updateIncome(id, updatedIncome.toJSON());
            return { success: true, message: 'Income updated successfully', income: updatedIncome.toJSON() };
        } catch (error) {
            return { success: false, message: `Failed to update income: ${error.message}` };
        }
    }

    updateTransaction(id, updates) {
        const transaction = this.getTransactionById(id);
        if (!transaction) {
            return { success: false, message: 'Transaction not found' };
        }

        if (transaction.type === 'expense') {
            return this.updateExpense(id, updates);
        } else {
            return this.updateIncome(id, updates);
        }
    }
}

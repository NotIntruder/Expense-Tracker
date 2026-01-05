/**
 * Electron Preload Script
 * ========================
 * 
 * This script runs in the renderer process before the web page loads.
 * It acts as a secure bridge between the main process (Node.js) and
 * the renderer process (browser/HTML).
 * 
 * Security:
 * - Runs with contextIsolation enabled
 * - Only exposes specific, safe APIs to the renderer
 * - Prevents direct Node.js access from the web page
 * 
 * Purpose:
 * - Expose IPC communication methods to the renderer
 * - Sanitize data between main and renderer processes
 * - Provide a clean API for the frontend to use
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose safe API to the renderer process
 * Available in renderer as: window.expenseTracker
 */
contextBridge.exposeInMainWorld('expenseTracker', {
    /**
     * Get all transactions with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Object>} Result object with transactions data
     */
    getTransactions: (filters) => ipcRenderer.invoke('get-transactions', filters),

    /**
     * Get financial summary
     * @returns {Promise<Object>} Result object with summary data
     */
    getSummary: () => ipcRenderer.invoke('get-summary'),

    /**
     * Add a new expense
     * @param {Object} expenseData - Expense details (amount, date, category, description)
     * @returns {Promise<Object>} Result object with success status
     */
    addExpense: (expenseData) => ipcRenderer.invoke('add-expense', expenseData),

    /**
     * Add a new income
     * @param {Object} incomeData - Income details (amount, date, source, description)
     * @returns {Promise<Object>} Result object with success status
     */
    addIncome: (incomeData) => ipcRenderer.invoke('add-income', incomeData),

    /**
     * Update an existing transaction
     * @param {Object} updateData - Update details (id, type, updates)
     * @returns {Promise<Object>} Result object with success status
     */
    updateTransaction: (updateData) => ipcRenderer.invoke('update-transaction', updateData),

    /**
     * Delete a transaction
     * @param {string} transactionId - ID of transaction to delete
     * @returns {Promise<Object>} Result object with success status
     */
    deleteTransaction: (transactionId) => ipcRenderer.invoke('delete-transaction', transactionId),

    /**
     * Get user settings
     * @returns {Promise<Object>} Result object with settings data
     */
    getSettings: () => ipcRenderer.invoke('get-settings'),

    /**
     * Save user settings
     * @param {Object} settings - Settings object (e.g., { currency: '₹' })
     * @returns {Promise<Object>} Result object with success status
     */
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings)
});

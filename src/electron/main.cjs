/**
 * Electron Main Process
 * ======================
 * 
 * This is the main entry point for the Electron desktop application.
 * It handles:
 * - Creating and managing the browser window
 * - Setting up IPC (Inter-Process Communication) handlers
 * - Integrating with existing backend services (TransactionService, StorageService)
 * - Application lifecycle management
 * 
 * Architecture:
 * - Main Process (Node.js): This file - handles backend logic and IPC
 * - Renderer Process (Browser): HTML/CSS/JS in renderer/ directory
 * - Preload Script: Secure bridge between main and renderer
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let TransactionService, StorageService;
let exchangeRateServiceInstance = null;

// Window reference
let mainWindow = null;

/**
 * Create the main application window
 * @returns {BrowserWindow} The created window instance
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            // Security: Enable context isolation
            contextIsolation: true,
            // Enable Node integration in preload script only
            nodeIntegration: false,
            // Load preload script for secure IPC
            preload: path.join(__dirname, 'preload.cjs')
        },
        // Modern window styling
        backgroundColor: '#f9fafb',
        show: false, // Don't show until ready
        icon: path.join(__dirname, '../../assets/icon.png') // Optional: Add app icon
    });

    // Remove default menu bar
    mainWindow.setMenu(null);

    // Load the index.html file
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Show window when ready to prevent flickering
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development mode (optional)
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    return mainWindow;
}

/**
 * Initialize backend services
 * Dynamically imports ES modules for use in CommonJS context
 */
async function initializeServices() {
    try {
        // Dynamic import for ES modules
        // Note: paths are relative to this file (main.cjs in src/electron)

        // Correct path: ../services (go up one level to src, then into services)
        const transactionServiceModule = await import('../services/TransactionService.js');
        TransactionService = transactionServiceModule.TransactionService;

        // Import ExchangeRateService
        const exchangeRateModule = await import('../services/ExchangeRateService.js');
        exchangeRateServiceInstance = exchangeRateModule.exchangeRateService;

        // Preload exchange rates
        await exchangeRateServiceInstance.preloadRates();

        console.log('✅ Backend services loaded successfully');
    } catch (error) {
        console.error('❌ Error loading backend services:', error);
        throw error;
    }
}

/**
 * Setup IPC handlers for communication between main and renderer processes
 * All handlers include comprehensive error handling
 */
function setupIPCHandlers() {
    /**
     * Get all transactions with optional filters
     * @param {Object} filters - Filter criteria (type, startDate, endDate, category, source)
     * @returns {Promise<Object>} Result with success status and data/error
     */
    ipcMain.handle('get-transactions', async (event, filters = {}) => {
        try {
            const service = new TransactionService();
            const transactions = service.getTransactions(filters);

            // Convert amounts to user's preferred currency
            const userSettings = service.storage.getSettings();
            const userCurrency = userSettings.currency || '$';

            const convertedTransactions = transactions.map(t => {
                // Determine original currency (default to $)
                const fromCurrency = t.currency || '$';

                // Convert amount if currencies differ
                let convertedAmount = t.amount;
                if (fromCurrency !== userCurrency) {
                    convertedAmount = exchangeRateServiceInstance.convertStatic(
                        t.amount,
                        fromCurrency,
                        userCurrency
                    );
                }

                return {
                    ...t,
                    amount: convertedAmount,
                    originalAmount: t.amount, // Keep original for reference
                    originalCurrency: fromCurrency,
                    currency: userCurrency // Display currency
                };
            });

            return { success: true, data: convertedTransactions };
        } catch (error) {
            console.error('Error getting transactions:', error);
            return { success: false, error: error.message || 'Failed to load transactions' };
        }
    });

    /**
     * Get financial summary
     * @returns {Promise<Object>} Result with success status and summary data
     */
    ipcMain.handle('get-summary', async (event) => {
        try {
            const service = new TransactionService();
            // Get ALL transactions for summary
            const transactions = service.getTransactions({});

            const userSettings = service.storage.getSettings();
            const userCurrency = userSettings.currency || '$';

            let totalIncome = 0;
            let totalExpenses = 0;
            const byCategory = {};
            const bySource = {};

            transactions.forEach(t => {
                const fromCurrency = t.currency || '$';
                let amount = t.amount;

                // Convert if needed
                if (fromCurrency !== userCurrency) {
                    amount = exchangeRateServiceInstance.convertStatic(
                        t.amount,
                        fromCurrency,
                        userCurrency
                    );
                }

                if (t.type === 'expense') {
                    totalExpenses += amount;
                    const cat = t.category || 'Other';
                    byCategory[cat] = (byCategory[cat] || 0) + amount;
                } else {
                    totalIncome += amount;
                    const src = t.source || 'Other';
                    bySource[src] = (bySource[src] || 0) + amount;
                }
            });

            const summary = {
                totalIncome,
                totalExpenses,
                balance: totalIncome - totalExpenses,
                byCategory,
                bySource,
                transactionCount: transactions.length,
                currency: userCurrency
            };

            return { success: true, data: summary };
        } catch (error) {
            console.error('Error getting summary:', error);
            return { success: false, error: error.message || 'Failed to load summary' };
        }
    });

    /**
     * Add a new expense
     * @param {Object} expenseData - Expense details
     * @param {number} expenseData.amount - Transaction amount
     * @param {string} expenseData.date - Transaction date
     * @param {string} expenseData.category - Expense category
     * @param {string} expenseData.description - Optional description
     * @returns {Promise<Object>} Result with success status
     */
    ipcMain.handle('add-expense', async (event, expenseData) => {
        try {
            const service = new TransactionService();
            const result = service.addExpense(
                expenseData.amount,
                expenseData.date,
                expenseData.category,
                expenseData.description || '',
                expenseData.currency // Pass currency from frontend
            );
            return result;
        } catch (error) {
            console.error('Error adding expense:', error);
            return { success: false, message: error.message || 'Failed to add expense' };
        }
    });

    /**
     * Add a new income
     * @param {Object} incomeData - Income details
     * @param {number} incomeData.amount - Transaction amount
     * @param {string} incomeData.date - Transaction date
     * @param {string} incomeData.source - Income source
     * @param {string} incomeData.description - Optional description
     * @param {string} incomeData.currency - Currency code
     * @returns {Promise<Object>} Result with success status
     */
    ipcMain.handle('add-income', async (event, incomeData) => {
        try {
            const service = new TransactionService();
            const result = service.addIncome(
                incomeData.amount,
                incomeData.date,
                incomeData.source,
                incomeData.description || '',
                incomeData.currency // Pass currency from frontend
            );
            return result;
        } catch (error) {
            console.error('Error adding income:', error);
            return { success: false, message: error.message || 'Failed to add income' };
        }
    });

    /**
     * Update an existing transaction
     * @param {Object} updateData - Update details
     * @param {string} updateData.id - Transaction ID
     * @param {string} updateData.type - Transaction type ('expense' or 'income')
     * @param {Object} updateData.updates - Fields to update
     * @returns {Promise<Object>} Result with success status
     */
    ipcMain.handle('update-transaction', async (event, updateData) => {
        try {
            const service = new TransactionService();
            const result = updateData.type === 'expense'
                ? service.updateExpense(updateData.id, updateData.updates)
                : service.updateIncome(updateData.id, updateData.updates);
            return result;
        } catch (error) {
            console.error('Error updating transaction:', error);
            return { success: false, message: error.message || 'Failed to update transaction' };
        }
    });

    /**
     * Delete a transaction
     * @param {string} transactionId - ID of transaction to delete
     * @returns {Promise<Object>} Result with success status
     */
    ipcMain.handle('delete-transaction', async (event, transactionId) => {
        try {
            const service = new TransactionService();
            const result = service.deleteTransaction(transactionId);
            return result;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            return { success: false, message: error.message || 'Failed to delete transaction' };
        }
    });

    /**
     * Get user settings (e.g., currency preference)
     * @returns {Promise<Object>} Result with success status and settings data
     */
    ipcMain.handle('get-settings', async (event) => {
        try {
            const service = new TransactionService();
            const settings = service.storage.getSettings();
            return { success: true, data: settings };
        } catch (error) {
            console.error('Error getting settings:', error);
            return { success: false, error: error.message || 'Failed to load settings' };
        }
    });

    /**
     * Save user settings
     * @param {Object} settings - Settings to save (e.g., { currency: '₹' })
     * @returns {Promise<Object>} Result with success status
     */
    ipcMain.handle('save-settings', async (event, settings) => {
        try {
            const service = new TransactionService();
            service.storage.saveSettings(settings);
            return { success: true, message: 'Settings saved successfully' };
        } catch (error) {
            console.error('Error saving settings:', error);
            return { success: false, message: error.message || 'Failed to save settings' };
        }
    });
}

/**
 * Application initialization
 * Called when Electron has finished initializing
 */
app.whenReady().then(async () => {
    try {
        // Initialize backend services first
        await initializeServices();

        // Setup IPC handlers
        setupIPCHandlers();

        // Create the main window
        createWindow();

        // On macOS, re-create window when dock icon is clicked
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    } catch (error) {
        console.error('❌ Fatal error during app initialization:', error);
        app.quit();
    }
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

/**
 * Handle any uncaught errors gracefully
 */
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

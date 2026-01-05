/**
 * Expense Tracker Application
 * Main entry point with interactive console menu
 */

import readlineSync from 'readline-sync';
import chalk from 'chalk';
import { TransactionService } from './services/TransactionService.js';
import {
    validateAmount,
    validateDate,
    validateCategory,
    validateSource,
    validateDescription,
    validateId
} from './utils/inputValidator.js';
import {
    displayHeader,
    displaySuccess,
    displayError,
    displayInfo,
    displayTransactions,
    displaySummary,
    clearScreen,
    displaySeparator,
    formatCurrency,
    displaySectionHeader,
    displayAppHeader,
    displayDivider
} from './utils/displayUtils.js';
import { formatDate, parseDate } from './utils/dateUtils.js';
import { MESSAGES, MENU_OPTIONS, EXPENSE_CATEGORIES, INCOME_SOURCES, CURRENCY_OPTIONS, DEFAULT_CURRENCY } from './config/constants.js';
import { exchangeRateService } from './services/ExchangeRateService.js';

class ExpenseTrackerApp {
    constructor() {
        this.transactionService = new TransactionService();
        this.running = true;
        this.currencySymbol = DEFAULT_CURRENCY;
        this.initializeCurrency();
    }

    /**
     * Convert transaction amounts for display in current currency
     * @param {Array} transactions - Array of transactions
     * @returns {Array} - Transactions with converted amounts
     */
    convertTransactionsForDisplay(transactions) {
        return transactions.map(t => {
            const originalCurrency = t.currency || this.currencySymbol;
            if (originalCurrency === this.currencySymbol) {
                return t; // No conversion needed
            }
            const convertedAmount = exchangeRateService.convertStatic(
                t.amount,
                originalCurrency,
                this.currencySymbol
            );
            return { ...t, amount: convertedAmount };
        });
    }

    /**
     * Convert summary amounts for display in current currency
     * @param {Object} summary - Summary object
     * @param {Array} transactions - All transactions for conversion
     * @returns {Object} - Summary with converted amounts
     */
    convertSummaryForDisplay(summary, transactions) {
        let totalIncome = 0;
        let totalExpenses = 0;
        const byCategory = {};
        const bySource = {};

        transactions.forEach(t => {
            const originalCurrency = t.currency || this.currencySymbol;
            let amount = t.amount;

            if (originalCurrency !== this.currencySymbol) {
                amount = exchangeRateService.convertStatic(t.amount, originalCurrency, this.currencySymbol);
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

        return {
            totalIncome: Math.round(totalIncome * 100) / 100,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            balance: Math.round((totalIncome - totalExpenses) * 100) / 100,
            byCategory,
            bySource,
            expenseCount: summary.expenseCount,
            incomeCount: summary.incomeCount
        };
    }

    /**
     * Initialize currency from settings or prompt user to select
     */
    initializeCurrency() {
        const settings = this.transactionService.storage.getSettings();

        if (settings.currency) {
            this.currencySymbol = settings.currency;
        } else {
            // First time setup - ask user to select currency
            this.selectCurrency(true);
        }
    }

    /**
     * Allow user to select currency
     * @param {boolean} isFirstTime - Whether this is first-time setup
     */
    selectCurrency(isFirstTime = false) {
        clearScreen(true);

        if (isFirstTime) {
            console.log(chalk.cyan.bold('\n  ⚙️  INITIAL SETUP\n'));
            console.log(chalk.white('  Please select your preferred currency:\n'));
        } else {
            displaySectionHeader('CHANGE CURRENCY', '💱');
        }

        // Display currency options
        CURRENCY_OPTIONS.forEach((curr, index) => {
            const currentIndicator = curr.symbol === this.currencySymbol ? chalk.green(' ← Current') : '';
            console.log(`  ${chalk.cyan(index + 1)}. ${curr.symbol} - ${curr.name}${currentIndicator}`);
        });

        const choice = readlineSync.question(chalk.yellow(`\n  Select currency (1-${CURRENCY_OPTIONS.length}): `));
        const index = parseInt(choice) - 1;

        if (index >= 0 && index < CURRENCY_OPTIONS.length) {
            this.currencySymbol = CURRENCY_OPTIONS[index].symbol;
            this.transactionService.storage.saveSettings({ currency: this.currencySymbol });
            console.log(chalk.green(`\n  ✅ Currency set to ${CURRENCY_OPTIONS[index].name}\n`));

            if (!isFirstTime) {
                readlineSync.question(chalk.gray('  Press Enter to continue...'));
                clearScreen(true);
            }
        } else {
            console.log(chalk.red('\n  ❌ Invalid choice. Using default currency.\n'));
            if (!isFirstTime) {
                readlineSync.question(chalk.gray('  Press Enter to continue...'));
                clearScreen(true);
            }
        }
    }

    /**
     * Start the application
     */
    start() {
        clearScreen(true);
        console.log(chalk.gray('  Welcome! Let\'s manage your finances efficiently.\n'));

        while (this.running) {
            this.showMainMenu();
            const choice = readlineSync.question(chalk.yellow('\n  Enter your choice: '));
            this.handleMenuChoice(choice);
        }
    }

    /**
     * Display main menu
     */
    showMainMenu() {
        displayDivider();
        console.log(chalk.bold.white('\n  📋 MAIN MENU\n'));
        console.log(chalk.cyan(`  ${MENU_OPTIONS.ADD_EXPENSE}`) + '. ➕  Add Expense');
        console.log(chalk.cyan(`  ${MENU_OPTIONS.ADD_INCOME}`) + '. 💰  Add Income');
        console.log(chalk.cyan(`  ${MENU_OPTIONS.VIEW_RECORDS}`) + '. 📊  View Records');
        console.log(chalk.cyan(`  ${MENU_OPTIONS.VIEW_SUMMARY}`) + '. 📈  View Summary');
        console.log(chalk.cyan(`  ${MENU_OPTIONS.EDIT_RECORD}`) + '. ✏️   Edit Record');
        console.log(chalk.cyan(`  ${MENU_OPTIONS.DELETE_RECORD}`) + '. 🗑️   Delete Record');
        console.log(chalk.cyan(`  7`) + '. ⚙️   Settings');
        console.log(chalk.red(`  ${MENU_OPTIONS.EXIT}`) + '. 🚪  Exit');
        displayDivider();
    }

    /**
     * Handle menu choice
     * @param {string} choice - User's menu choice
     */
    handleMenuChoice(choice) {
        switch (choice) {
            case MENU_OPTIONS.ADD_EXPENSE:
                this.addExpense();
                break;
            case MENU_OPTIONS.ADD_INCOME:
                this.addIncome();
                break;
            case MENU_OPTIONS.VIEW_RECORDS:
                this.viewRecords();
                break;
            case MENU_OPTIONS.VIEW_SUMMARY:
                this.viewSummary();
                break;
            case MENU_OPTIONS.EDIT_RECORD:
                this.editRecord();
                break;
            case MENU_OPTIONS.DELETE_RECORD:
                this.deleteRecord();
                break;
            case '7':
                this.selectCurrency(false);
                break;
            case MENU_OPTIONS.EXIT:
                this.exit();
                break;
            default:
                console.log(chalk.red('\n  ❌ Invalid option. Please try again.\n'));
                readlineSync.question(chalk.gray('  Press Enter to continue...'));
                clearScreen(true);
        }
    }

    /**
     * Add a new expense
     */
    addExpense() {
        clearScreen(true);
        displaySectionHeader('ADD NEW EXPENSE', '➕');

        // Get and validate amount
        const amountInput = readlineSync.question(chalk.white('  Enter amount: '));
        const amountValidation = validateAmount(amountInput);
        if (!amountValidation.isValid) {
            console.log(chalk.red(`  ❌ ${amountValidation.error}`));
            this.pressEnterToContinue();
            return;
        }

        // Get and validate date
        const dateInput = readlineSync.question(chalk.white('  Enter date (DD/MM/YYYY or press Enter for today): '));
        const dateValidation = validateDate(dateInput || formatDate(new Date()));
        if (!dateValidation.isValid) {
            console.log(chalk.red(`  ❌ ${dateValidation.error}`));
            this.pressEnterToContinue();
            return;
        }

        // Get and validate category
        console.log(chalk.gray(`\n  Available: ${EXPENSE_CATEGORIES.join(', ')}`));
        const categoryInput = readlineSync.question(chalk.white('  Enter category: '));
        const categoryValidation = validateCategory(categoryInput);
        if (!categoryValidation.isValid) {
            console.log(chalk.red(`  ❌ ${categoryValidation.error}`));
            this.pressEnterToContinue();
            return;
        }

        // Get description (optional)
        const descriptionInput = readlineSync.question(chalk.white('  Enter description (optional): '));
        const descriptionValidation = validateDescription(descriptionInput);
        if (!descriptionValidation.isValid) {
            console.log(chalk.red(`  ❌ ${descriptionValidation.error}`));
            this.pressEnterToContinue();
            return;
        }

        // Add expense
        const result = this.transactionService.addExpense(
            amountValidation.value,
            dateValidation.value,
            categoryValidation.value,
            descriptionValidation.value,
            this.currencySymbol // Use current display currency
        );

        if (result.success) {
            console.log(chalk.green('\n  ✅ Expense added successfully!\n'));
            console.log(chalk.gray(`     Amount:      ${formatCurrency(amountValidation.value, this.currencySymbol)}`));
            console.log(chalk.gray(`     Date:        ${formatDate(dateValidation.value)}`));
            console.log(chalk.gray(`     Category:    ${categoryValidation.value}`));
            if (descriptionValidation.value) {
                console.log(chalk.gray(`     Description: ${descriptionValidation.value}`));
            }
        } else {
            console.log(chalk.red(`  ❌ ${result.message}`));
        }

        this.pressEnterToContinue();
    }

    /**
     * Add a new income
     */
    addIncome() {
        clearScreen(true);
        displaySectionHeader('ADD NEW INCOME', '💰');

        // Get and validate amount
        const amountInput = readlineSync.question(chalk.white('  Enter amount: '));
        const amountValidation = validateAmount(amountInput);
        if (!amountValidation.isValid) {
            console.log(chalk.red(`  ❌ ${amountValidation.error}`));
            this.pressEnterToContinue();
            return;
        }

        // Get and validate date
        const dateInput = readlineSync.question(chalk.white('  Enter date (DD/MM/YYYY or press Enter for today): '));
        const dateValidation = validateDate(dateInput || formatDate(new Date()));
        if (!dateValidation.isValid) {
            console.log(chalk.red(`  ❌ ${dateValidation.error}`));
            this.pressEnterToContinue();
            return;
        }

        // Get and validate source
        console.log(chalk.gray(`\n  Available: ${INCOME_SOURCES.join(', ')}`));
        const sourceInput = readlineSync.question(chalk.white('  Enter source: '));
        const sourceValidation = validateSource(sourceInput);
        if (!sourceValidation.isValid) {
            console.log(chalk.red(`  ❌ ${sourceValidation.error}`));
            this.pressEnterToContinue();
            return;
        }

        // Get description (optional)
        const descriptionInput = readlineSync.question(chalk.white('  Enter description (optional): '));
        const descriptionValidation = validateDescription(descriptionInput);
        if (!descriptionValidation.isValid) {
            console.log(chalk.red(`  ❌ ${descriptionValidation.error}`));
            this.pressEnterToContinue();
            return;
        }

        // Add income
        const result = this.transactionService.addIncome(
            amountValidation.value,
            dateValidation.value,
            sourceValidation.value,
            descriptionValidation.value,
            this.currencySymbol // Use current display currency
        );

        if (result.success) {
            console.log(chalk.green('\n  ✅ Income added successfully!\n'));
            console.log(chalk.gray(`     Amount:      ${formatCurrency(amountValidation.value, this.currencySymbol)}`));
            console.log(chalk.gray(`     Date:        ${formatDate(dateValidation.value)}`));
            console.log(chalk.gray(`     Source:      ${sourceValidation.value}`));
            if (descriptionValidation.value) {
                console.log(chalk.gray(`     Description: ${descriptionValidation.value}`));
            }
        } else {
            console.log(chalk.red(`  ❌ ${result.message}`));
        }

        this.pressEnterToContinue();
    }

    /**
     * View records with optional filtering
     */
    viewRecords() {
        clearScreen(true);
        displaySectionHeader('VIEW RECORDS', '📊');

        console.log(chalk.white('  Filter options:\n'));
        console.log('  1. View all transactions');
        console.log('  2. View only expenses');
        console.log('  3. View only income');
        console.log('  4. Filter by date range');
        console.log('  5. Filter by category (expenses)');
        console.log('  6. Filter by source (income)');

        const filterChoice = readlineSync.question(chalk.yellow('\n  Select filter (or press Enter for all): '));

        if (filterChoice && !['1', '2', '3', '4', '5', '6'].includes(filterChoice)) {
            console.log(chalk.red('  ❌ Invalid filter option'));
            this.pressEnterToContinue();
            return;
        }

        const filters = {};
        let filterApplied = false;

        switch (filterChoice) {
            case '2':
                filters.type = 'expense';
                filterApplied = true;
                break;
            case '3':
                filters.type = 'income';
                filterApplied = true;
                break;
            case '4':
                filterApplied = this.getDateRangeFilter(filters);
                break;
            case '5':
                filterApplied = this.getCategoryFilter(filters);
                break;
            case '6':
                filterApplied = this.getSourceFilter(filters);
                break;
        }

        if (filterChoice && ['4', '5', '6'].includes(filterChoice) && !filterApplied) {
            this.pressEnterToContinue();
            return;
        }

        try {
            clearScreen(true);
            displaySectionHeader('TRANSACTION RECORDS', '📊');

            const transactions = this.transactionService.getTransactions(filters);

            if (transactions.length === 0) {
                console.log(chalk.yellow('  ℹ️  No records found with the selected filters.\n'));
            } else {
                const type = filters.type || 'all';
                // Convert amounts to display currency
                const convertedTransactions = this.convertTransactionsForDisplay(transactions);
                displayTransactions(convertedTransactions, type, 20, this.currencySymbol); // Show max 20 at a time
                console.log(chalk.gray(`  Total records: ${transactions.length}`));
            }
        } catch (error) {
            console.log(chalk.red(`  ❌ Error: ${error.message}`));
        }

        this.pressEnterToContinue();
    }

    /**
     * Get date range filter
     * @param {object} filters - Filters object to update
     * @returns {boolean} - Success status
     */
    getDateRangeFilter(filters) {
        console.log();
        const startDateInput = readlineSync.question(chalk.white('  Enter start date (DD/MM/YYYY, press Enter to skip): '));
        if (startDateInput) {
            const startDateValidation = validateDate(startDateInput, true);
            if (!startDateValidation.isValid) {
                console.log(chalk.red(`  ❌ ${startDateValidation.error}`));
                return false;
            }
            filters.startDate = startDateValidation.value;
        }

        const endDateInput = readlineSync.question(chalk.white('  Enter end date (DD/MM/YYYY, press Enter to skip): '));
        if (endDateInput) {
            const endDateValidation = validateDate(endDateInput, true);
            if (!endDateValidation.isValid) {
                console.log(chalk.red(`  ❌ ${endDateValidation.error}`));
                return false;
            }
            filters.endDate = endDateValidation.value;
        }

        return true;
    }

    /**
     * Get category filter
     * @param {object} filters - Filters object to update
     * @returns {boolean} - Success status
     */
    getCategoryFilter(filters) {
        console.log(chalk.gray(`\n  Available: ${EXPENSE_CATEGORIES.join(', ')}`));
        const categoryInput = readlineSync.question(chalk.white('  Enter category: '));
        const categoryValidation = validateCategory(categoryInput);
        if (!categoryValidation.isValid) {
            console.log(chalk.red(`  ❌ ${categoryValidation.error}`));
            return false;
        }
        filters.category = categoryValidation.value;
        filters.type = 'expense';
        return true;
    }

    /**
     * Get source filter
     * @param {object} filters - Filters object to update
     * @returns {boolean} - Success status
     */
    getSourceFilter(filters) {
        console.log(chalk.gray(`\n  Available: ${INCOME_SOURCES.join(', ')}`));
        const sourceInput = readlineSync.question(chalk.white('  Enter source: '));
        const sourceValidation = validateSource(sourceInput);
        if (!sourceValidation.isValid) {
            console.log(chalk.red(`  ❌ ${sourceValidation.error}`));
            return false;
        }
        filters.source = sourceValidation.value;
        filters.type = 'income';
        return true;
    }

    /**
     * View financial summary
     */
    viewSummary() {
        clearScreen(true);

        try {
            const transactions = this.transactionService.getTransactions();
            const summary = this.transactionService.getSummary();
            // Convert summary amounts to display currency
            const convertedSummary = this.convertSummaryForDisplay(summary, transactions);
            displaySummary(convertedSummary, this.currencySymbol);
        } catch (error) {
            console.log(chalk.red(`  ❌ Error: ${error.message}`));
        }

        this.pressEnterToContinue();
    }

    /**
     * Edit an existing record
     */
    editRecord() {
        clearScreen(true);
        displaySectionHeader('EDIT RECORD', '✏️');

        // Show recent transactions
        try {
            const recentTransactions = this.transactionService.getTransactions();
            if (recentTransactions.length === 0) {
                console.log(chalk.yellow('  ℹ️  No records available to edit.\n'));
                this.pressEnterToContinue();
                return;
            }

            console.log(chalk.gray('  Recent transactions:\n'));
            const convertedTransactions = this.convertTransactionsForDisplay(recentTransactions.slice(0, 10));
            displayTransactions(convertedTransactions, 'all', 0, this.currencySymbol);
        } catch (error) {
            console.log(chalk.red(`  ❌ Error: ${error.message}`));
            this.pressEnterToContinue();
            return;
        }

        // Get transaction ID
        const idInput = readlineSync.question(chalk.white('  Enter transaction ID to edit (first 4-8 characters): '));
        if (!idInput) {
            console.log(chalk.yellow('  ℹ️  Operation cancelled.'));
            this.pressEnterToContinue();
            return;
        }

        const idValidation = validateId(idInput);
        if (!idValidation.isValid) {
            console.log(chalk.red(`  ❌ ${idValidation.error}`));
            this.pressEnterToContinue();
            return;
        }

        // Find transaction
        const result = this.transactionService.findTransactionById(idValidation.value);
        if (!result) {
            console.log(chalk.red('  ❌ Transaction not found'));
            this.pressEnterToContinue();
            return;
        }

        const { type, transaction } = result;
        console.log(chalk.green(`\n  ✓ Found ${type}:`));
        console.log(chalk.white(`    ${formatCurrency(transaction.amount, this.currencySymbol)} - ${transaction.category || transaction.source}`));
        console.log(chalk.gray(`    Date: ${formatDate(new Date(transaction.date))}`));
        if (transaction.description) {
            console.log(chalk.gray(`    Description: ${transaction.description}`));
        }

        // Get updates
        console.log(chalk.yellow('\n  Enter new values (press Enter to keep current):\n'));
        const updates = {};

        const amountInput = readlineSync.question(chalk.white(`  Amount [${formatCurrency(transaction.amount, this.currencySymbol)}]: `));
        if (amountInput) {
            const amountValidation = validateAmount(amountInput);
            if (!amountValidation.isValid) {
                console.log(chalk.red(`  ❌ ${amountValidation.error}`));
                this.pressEnterToContinue();
                return;
            }
            updates.amount = amountValidation.value;
        }

        const dateInput = readlineSync.question(chalk.white(`  Date [${formatDate(new Date(transaction.date))}]: `));
        if (dateInput) {
            const dateValidation = validateDate(dateInput);
            if (!dateValidation.isValid) {
                console.log(chalk.red(`  ❌ ${dateValidation.error}`));
                this.pressEnterToContinue();
                return;
            }
            updates.date = dateValidation.value;
        }

        if (type === 'expense') {
            console.log(chalk.gray(`  Available: ${EXPENSE_CATEGORIES.join(', ')}`));
            const categoryInput = readlineSync.question(chalk.white(`  Category [${transaction.category}]: `));
            if (categoryInput) {
                const categoryValidation = validateCategory(categoryInput);
                if (!categoryValidation.isValid) {
                    console.log(chalk.red(`  ❌ ${categoryValidation.error}`));
                    this.pressEnterToContinue();
                    return;
                }
                updates.category = categoryValidation.value;
            }
        } else {
            console.log(chalk.gray(`  Available: ${INCOME_SOURCES.join(', ')}`));
            const sourceInput = readlineSync.question(chalk.white(`  Source [${transaction.source}]: `));
            if (sourceInput) {
                const sourceValidation = validateSource(sourceInput);
                if (!sourceValidation.isValid) {
                    console.log(chalk.red(`  ❌ ${sourceValidation.error}`));
                    this.pressEnterToContinue();
                    return;
                }
                updates.source = sourceValidation.value;
            }
        }

        const descriptionInput = readlineSync.question(chalk.white(`  Description [${transaction.description || 'None'}]: `));
        if (descriptionInput) {
            const descriptionValidation = validateDescription(descriptionInput);
            if (!descriptionValidation.isValid) {
                console.log(chalk.red(`  ❌ ${descriptionValidation.error}`));
                this.pressEnterToContinue();
                return;
            }
            updates.description = descriptionValidation.value;
        }

        // Confirm update
        console.log();
        const confirm = readlineSync.keyInYNStrict(chalk.yellow('  Confirm update?'));
        if (!confirm) {
            console.log(chalk.yellow('\n  ℹ️  Operation cancelled.'));
            this.pressEnterToContinue();
            return;
        }

        // Update
        const updateResult = type === 'expense'
            ? this.transactionService.updateExpense(transaction.id, updates)
            : this.transactionService.updateIncome(transaction.id, updates);

        if (updateResult.success) {
            console.log(chalk.green('\n  ✅ Record updated successfully!'));
        } else {
            console.log(chalk.red(`\n  ❌ ${updateResult.message}`));
        }

        this.pressEnterToContinue();
    }

    /**
     * Delete a record
     */
    deleteRecord() {
        clearScreen(true);
        displaySectionHeader('DELETE RECORD', '🗑️');

        // Show recent transactions
        try {
            const recentTransactions = this.transactionService.getTransactions();
            if (recentTransactions.length === 0) {
                console.log(chalk.yellow('  ℹ️  No records available to delete.\n'));
                this.pressEnterToContinue();
                return;
            }

            console.log(chalk.gray('  Recent transactions:\n'));
            const convertedTransactions = this.convertTransactionsForDisplay(recentTransactions.slice(0, 10));
            displayTransactions(convertedTransactions, 'all', 0, this.currencySymbol);
        } catch (error) {
            console.log(chalk.red(`  ❌ Error: ${error.message}`));
            this.pressEnterToContinue();
            return;
        }

        // Get transaction ID
        const idInput = readlineSync.question(chalk.white('  Enter transaction ID to delete (first 4-8 characters): '));
        if (!idInput) {
            console.log(chalk.yellow('  ℹ️  Operation cancelled.'));
            this.pressEnterToContinue();
            return;
        }

        const idValidation = validateId(idInput);
        if (!idValidation.isValid) {
            console.log(chalk.red(`  ❌ ${idValidation.error}`));
            this.pressEnterToContinue();
            return;
        }

        // Find transaction
        const result = this.transactionService.findTransactionById(idValidation.value);
        if (!result) {
            console.log(chalk.red('  ❌ Transaction not found'));
            this.pressEnterToContinue();
            return;
        }

        const { type, transaction } = result;
        console.log(chalk.red(`\n  ⚠️  About to delete ${type}:`));
        console.log(chalk.white(`     ${formatCurrency(transaction.amount, this.currencySymbol)} - ${transaction.category || transaction.source}`));
        console.log(chalk.gray(`     Date: ${formatDate(new Date(transaction.date))}`));
        if (transaction.description) {
            console.log(chalk.gray(`     Description: ${transaction.description}`));
        }

        // Confirm deletion
        console.log();
        const confirm = readlineSync.keyInYNStrict(chalk.red('  This action cannot be undone. Confirm deletion?'));
        if (!confirm) {
            console.log(chalk.yellow('\n  ℹ️  Operation cancelled.'));
            this.pressEnterToContinue();
            return;
        }

        // Delete
        const deleteResult = this.transactionService.deleteTransaction(transaction.id);

        if (deleteResult.success) {
            console.log(chalk.green('\n  ✅ Record deleted successfully!'));
        } else {
            console.log(chalk.red(`\n  ❌ ${deleteResult.message}`));
        }

        this.pressEnterToContinue();
    }

    /**
     * Exit application
     */
    exit() {
        clearScreen();
        console.log(chalk.cyan.bold('\n' + '═'.repeat(60)));
        console.log(chalk.cyan.bold('       👋 Thank you for using Expense Tracker!'));
        console.log(chalk.cyan.bold('═'.repeat(60) + '\n'));
        console.log(chalk.gray('  Your data has been saved.\n'));
        this.running = false;
    }

    /**
     * Wait for user to press Enter and return to main menu
     */
    pressEnterToContinue() {
        readlineSync.question(chalk.gray('\n  Press Enter to continue...'));
        clearScreen(true);
    }
}

// Start the application (async to preload exchange rates)
(async () => {
    // Preload exchange rates BEFORE creating app instance
    console.log(chalk.gray('  Loading exchange rates...'));
    await exchangeRateService.preloadRates();
    console.log(chalk.gray('  Exchange rates loaded.\n'));

    // Now create app and start - rates are guaranteed to be available
    const app = new ExpenseTrackerApp();
    app.start();
})();

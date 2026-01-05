/**
 * Display Utilities
 * Helper functions for formatting and displaying data in CLI
 */

import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currencySymbol - Currency symbol
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount, currencySymbol = '$') {
    return `${currencySymbol}${amount.toFixed(2)}`;
}

/**
 * Display a header with styling
 * @param {string} text - Header text
 */
export function displayHeader(text) {
    console.log(chalk.cyan.bold(`\n${text}`));
}

/**
 * Display success message
 * @param {string} message - Message to display
 */
export function displaySuccess(message) {
    console.log(chalk.green(`\n${message}\n`));
}

/**
 * Display error message
 * @param {string} message - Message to display
 */
export function displayError(message) {
    console.log(chalk.red(`\n❌ ${message}\n`));
}

/**
 * Display warning/info message
 * @param {string} message - Message to display
 */
export function displayInfo(message) {
    console.log(chalk.yellow(`\n${message}\n`));
}

/**
 * Display a section header
 * @param {string} title - Section title
 * @param {string} icon - Icon to display
 */
export function displaySectionHeader(title, icon = '📋') {
    console.log('\n' + chalk.cyan('═'.repeat(60)));
    console.log(chalk.cyan.bold(`  ${icon} ${title}`));
    console.log(chalk.cyan('═'.repeat(60)) + '\n');
}

/**
 * Display transactions in a table
 * @param {Array} transactions - Transactions to display
 * @param {string} type - Type filter
 * @param {number} limit - Max number to display
 * @param {string} currencySymbol - Currency symbol
 */
export function displayTransactions(transactions, type = 'all', limit = 0, currencySymbol = '$') {
    if (!transactions || transactions.length === 0) {
        displayInfo('ℹ️  No records found.');
        return;
    }

    const table = new Table({
        head: [
            chalk.cyan('ID'),
            chalk.cyan('Type'),
            chalk.cyan('Amount'),
            chalk.cyan('Date'),
            chalk.cyan('Category/Source'),
            chalk.cyan('Description')
        ],
        colWidths: [10, 10, 15, 12, 18, 22],
        style: { head: [], border: [] }
    });

    const displayedTransactions = limit > 0 ? transactions.slice(0, limit) : transactions;

    displayedTransactions.forEach((t, index) => {
        const typeLabel = t.type === 'expense'
            ? chalk.red('Expense')
            : chalk.green('Income');
        const amountStr = t.type === 'expense'
            ? chalk.red(`-${formatCurrency(t.amount, currencySymbol)}`)
            : chalk.green(`+${formatCurrency(t.amount, currencySymbol)}`);
        const categoryOrSource = t.category || t.source || '-';
        const description = t.description || '-';
        const truncatedDesc = description.length > 18
            ? description.substring(0, 18) + '...'
            : description;
        const shortId = t.id ? t.id.substring(0, 8) : (index + 1).toString();

        table.push([
            chalk.gray(shortId),
            typeLabel,
            amountStr,
            t.date,
            categoryOrSource,
            truncatedDesc
        ]);
    });

    console.log(table.toString());

    if (limit > 0 && transactions.length > limit) {
        console.log(chalk.gray(`\n  ... and ${transactions.length - limit} more records\n`));
    } else {
        console.log();
    }
}

/**
 * Display financial summary
 * @param {object} summary - Summary data
 * @param {string} currencySymbol - Currency symbol
 */
export function displaySummary(summary, currencySymbol = '$') {
    console.log(chalk.bold.cyan('\n' + '═'.repeat(60)));
    console.log(chalk.bold.cyan('                    FINANCIAL SUMMARY'));
    console.log(chalk.bold.cyan('═'.repeat(60) + '\n'));

    const table = new Table({
        style: { head: [], border: [] }
    });

    const balance = summary.balance || (summary.totalIncome - summary.totalExpenses);
    const balanceColor = balance >= 0 ? chalk.green : chalk.red;

    table.push(
        [chalk.cyan('Total Income:'), chalk.green(formatCurrency(summary.totalIncome, currencySymbol))],
        [chalk.cyan('Total Expenses:'), chalk.red(formatCurrency(summary.totalExpenses, currencySymbol))],
        [chalk.cyan('─'.repeat(30)), ''],
        [chalk.cyan.bold('Balance:'), balanceColor.bold(formatCurrency(balance, currencySymbol))]
    );

    console.log(table.toString());

    if (summary.byCategory && Object.keys(summary.byCategory).length > 0) {
        console.log(chalk.cyan.bold('\n📊 Expenses by Category:\n'));
        const categoryTable = new Table({
            head: [chalk.cyan('Category'), chalk.cyan('Amount'), chalk.cyan('Percentage')],
            style: { head: [], border: [] }
        });

        const sortedCategories = Object.entries(summary.byCategory)
            .sort((a, b) => b[1] - a[1]);

        sortedCategories.forEach(([category, amount]) => {
            const percentage = summary.totalExpenses > 0
                ? ((amount / summary.totalExpenses) * 100).toFixed(1)
                : 0;
            categoryTable.push([
                category,
                chalk.red(formatCurrency(amount, currencySymbol)),
                `${percentage}%`
            ]);
        });

        console.log(categoryTable.toString());
    }

    if (summary.bySource && Object.keys(summary.bySource).length > 0) {
        console.log(chalk.cyan.bold('\n📊 Income by Source:\n'));
        const sourceTable = new Table({
            head: [chalk.cyan('Source'), chalk.cyan('Amount'), chalk.cyan('Percentage')],
            style: { head: [], border: [] }
        });

        const sortedSources = Object.entries(summary.bySource)
            .sort((a, b) => b[1] - a[1]);

        sortedSources.forEach(([source, amount]) => {
            const percentage = summary.totalIncome > 0
                ? ((amount / summary.totalIncome) * 100).toFixed(1)
                : 0;
            sourceTable.push([
                source,
                chalk.green(formatCurrency(amount, currencySymbol)),
                `${percentage}%`
            ]);
        });

        console.log(sourceTable.toString());
    }

    console.log();
}

/**
 * Display welcome banner
 */
export function displayWelcome() {
    console.log(chalk.cyan.bold('\n' + '═'.repeat(60)));
    console.log(chalk.cyan.bold('               💰 EXPENSE TRACKER APPLICATION 💰'));
    console.log(chalk.cyan.bold('═'.repeat(60)));
}

/**
 * Display a divider line
 */
export function displayDivider() {
    console.log(chalk.gray('─'.repeat(60)));
}

/**
 * Display a short divider
 */
export function displayShortDivider() {
    console.log(chalk.gray('─'.repeat(50)));
}

/**
 * Clear the console screen
 */
export function clearScreen() {
    console.clear();
}

/**
 * Display a separator line
 */
export function displaySeparator() {
    console.log(chalk.gray('─'.repeat(60)));
}

/**
 * Display the application header
 */
export function displayAppHeader() {
    console.log(chalk.cyan.bold('\n' + '═'.repeat(60)));
    console.log(chalk.cyan.bold('               💰 EXPENSE TRACKER APPLICATION 💰'));
    console.log(chalk.cyan.bold('═'.repeat(60)));
}

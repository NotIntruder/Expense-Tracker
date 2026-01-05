/**
 * Storage Service
 * Handles reading and writing data to JSON file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DATA_FILE_PATH } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StorageService {
    constructor() {
        this.dataFilePath = path.resolve(__dirname, '../..', DATA_FILE_PATH);
        this.ensureDataFileExists();
    }

    /**
     * Ensure data file and directory exist
     */
    ensureDataFileExists() {
        try {
            const dir = path.dirname(this.dataFilePath);

            // Create directory if it doesn't exist
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Create file if it doesn't exist
            if (!fs.existsSync(this.dataFilePath)) {
                this.writeData({ expenses: [], income: [] });
            }
        } catch (error) {
            throw new Error(`Failed to initialize storage: ${error.message}`);
        }
    }

    /**
     * Read data from file
     * @returns {{expenses: Array, income: Array, settings: Object}} - Data object
     */
    readData() {
        try {
            // Check file size to prevent memory issues
            const stats = fs.statSync(this.dataFilePath);
            const maxSize = 10 * 1024 * 1024; // 10MB limit

            if (stats.size > maxSize) {
                const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
                throw new Error(`Data file too large (${sizeMB}MB). Maximum is 10MB.`);
            }

            const fileContent = fs.readFileSync(this.dataFilePath, 'utf8');

            if (!fileContent.trim()) {
                return { expenses: [], income: [], settings: {} };
            }

            const data = JSON.parse(fileContent);

            // Ensure data structure is correct
            return {
                expenses: Array.isArray(data.expenses) ? data.expenses : [],
                income: Array.isArray(data.income) ? data.income : [],
                // Fix: typeof null === 'object' so need extra checks
                settings: (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings))
                    ? data.settings
                    : {}
            };
        } catch (error) {
            if (error instanceof SyntaxError) {
                // Corrupted JSON - backup and reset
                this.backupCorruptedFile();
                return { expenses: [], income: [], settings: {} };
            }
            throw new Error(`Failed to read data: ${error.message}`);
        }
    }

    /**
     * Write data to file using atomic write operation
     * @param {{expenses: Array, income: Array, settings: Object}} data - Data to write
     */
    writeData(data) {
        try {
            const jsonData = JSON.stringify(data, null, 2);

            // Check file size before writing (10MB limit for personal use)
            const dataSize = Buffer.byteLength(jsonData, 'utf8');
            const maxSize = 10 * 1024 * 1024; // 10MB
            
            if (dataSize > maxSize) {
                const sizeMB = (dataSize / 1024 / 1024).toFixed(2);
                throw new Error(`Data file too large (${sizeMB}MB). Maximum is 10MB. Consider archiving old transactions.`);
            }

            // Atomic write: write to temp file first, then rename
            const tempPath = this.dataFilePath + '.tmp';
            const backupPath = this.dataFilePath + '.backup';

            // Write to temp file
            fs.writeFileSync(tempPath, jsonData, 'utf8');

            // Create timestamped backup before overwriting (keep last 3)
            if (fs.existsSync(this.dataFilePath)) {
                this.rotateBackups();
                fs.copyFileSync(this.dataFilePath, backupPath);
            }

            // Atomic rename (on most OS this is atomic)
            fs.renameSync(tempPath, this.dataFilePath);

            // Clean up immediate backup after successful write
            // (timestamped backups are kept)
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
        } catch (error) {
            // Clean up temp file if it exists
            const tempPath = this.dataFilePath + '.tmp';
            if (fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                } catch (cleanupError) {
                    // Ignore cleanup errors
                }
            }
            throw new Error(`Failed to write data: ${error.message}`);
        }
    }

    /**
     * Rotate backups - keep only the last 3 timestamped backups
     */
    rotateBackups() {
        try {
            const dir = path.dirname(this.dataFilePath);
            const baseName = path.basename(this.dataFilePath);
            
            // Find all backup files
            const backupFiles = fs.readdirSync(dir)
                .filter(f => f.startsWith(baseName + '.backup.') && f.endsWith('.json'))
                .map(f => ({
                    name: f,
                    path: path.join(dir, f),
                    time: fs.statSync(path.join(dir, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time); // Newest first

            // Keep only last 3, delete older ones
            if (backupFiles.length >= 3) {
                backupFiles.slice(2).forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (err) {
                        console.warn(`Failed to delete old backup: ${file.name}`);
                    }
                });
            }

            // Create new timestamped backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const newBackupPath = `${this.dataFilePath}.backup.${timestamp}.json`;
            if (fs.existsSync(this.dataFilePath)) {
                fs.copyFileSync(this.dataFilePath, newBackupPath);
            }
        } catch (error) {
            console.warn('Failed to rotate backups:', error.message);
            // Don't throw - backup rotation failure shouldn't prevent writes
        }
    }

    /**
     * Backup corrupted file
     */
    backupCorruptedFile() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `${this.dataFilePath}.corrupted.${timestamp}.bak`;

            if (fs.existsSync(this.dataFilePath)) {
                fs.copyFileSync(this.dataFilePath, backupPath);
                console.warn(`⚠️  Corrupted data file backed up to: ${backupPath}`);
            }

            // Reset file
            this.writeData({ expenses: [], income: [], settings: {} });
        } catch (error) {
            console.error('Failed to backup corrupted file:', error.message);
        }
    }

    /**
     * Get user settings
     * @returns {Object} - Settings object
     */
    getSettings() {
        const data = this.readData();
        return data.settings || {};
    }

    /**
     * Update user settings
     * @param {Object} settings - Settings object to save
     */
    saveSettings(settings) {
        const data = this.readData();
        data.settings = { ...data.settings, ...settings };
        this.writeData(data);
        return true; // Return success status
    }

    /**
     * Get all expenses
     * @returns {Array} - Array of expense objects
     */
    getExpenses() {
        const data = this.readData();
        return data.expenses;
    }

    /**
     * Get all income
     * @returns {Array} - Array of income objects
     */
    getIncome() {
        const data = this.readData();
        return data.income;
    }

    /**
     * Add expense
     * @param {object} expense - Expense object
     */
    addExpense(expense) {
        const data = this.readData();
        data.expenses.push(expense);
        this.writeData(data);
    }

    /**
     * Add income
     * @param {object} income - Income object
     */
    addIncome(income) {
        const data = this.readData();
        data.income.push(income);
        this.writeData(data);
    }

    /**
     * Update expense
     * @param {string} id - Expense ID
     * @param {object} updatedExpense - Updated expense object
     * @returns {boolean} - True if updated successfully
     */
    updateExpense(id, updatedExpense) {
        const data = this.readData();
        const index = data.expenses.findIndex(e => e.id === id);

        if (index === -1) {
            return false;
        }

        data.expenses[index] = updatedExpense;
        this.writeData(data);
        return true;
    }

    /**
     * Update income
     * @param {string} id - Income ID
     * @param {object} updatedIncome - Updated income object
     * @returns {boolean} - True if updated successfully
     */
    updateIncome(id, updatedIncome) {
        const data = this.readData();
        const index = data.income.findIndex(i => i.id === id);

        if (index === -1) {
            return false;
        }

        data.income[index] = updatedIncome;
        this.writeData(data);
        return true;
    }

    /**
     * Delete expense
     * @param {string} id - Expense ID
     * @returns {boolean} - True if deleted successfully
     */
    deleteExpense(id) {
        const data = this.readData();
        const initialLength = data.expenses.length;
        data.expenses = data.expenses.filter(e => e.id !== id);

        if (data.expenses.length === initialLength) {
            return false;
        }

        this.writeData(data);
        return true;
    }

    /**
     * Delete income
     * @param {string} id - Income ID
     * @returns {boolean} - True if deleted successfully
     */
    deleteIncome(id) {
        const data = this.readData();
        const initialLength = data.income.length;
        data.income = data.income.filter(i => i.id !== id);

        if (data.income.length === initialLength) {
            return false;
        }

        this.writeData(data);
        return true;
    }
}

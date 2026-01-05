/**
 * Application Constants
 */

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Education',
  'Other'
];

export const INCOME_SOURCES = [
  'Salary',
  'Freelance',
  'Investment',
  'Gift',
  'Business',
  'Other'
];

export const CURRENCY_OPTIONS = [
  { symbol: '$', name: 'US Dollar (USD)', code: 'USD' },
  { symbol: '€', name: 'Euro (EUR)', code: 'EUR' },
  { symbol: '£', name: 'British Pound (GBP)', code: 'GBP' },
  { symbol: '₹', name: 'Indian Rupee (INR)', code: 'INR' },
  { symbol: '¥', name: 'Japanese Yen (JPY)', code: 'JPY' },
  { symbol: '¥', name: 'Chinese Yuan (CNY)', code: 'CNY' },
  { symbol: 'C$', name: 'Canadian Dollar (CAD)', code: 'CAD' },
  { symbol: 'A$', name: 'Australian Dollar (AUD)', code: 'AUD' },
  { symbol: 'Fr', name: 'Swiss Franc (CHF)', code: 'CHF' },
  { symbol: 'R$', name: 'Brazilian Real (BRL)', code: 'BRL' }
];

export const DATE_FORMAT = 'DD/MM/YYYY';
export const DEFAULT_CURRENCY = '$';

export const DATA_FILE_PATH = './data/transactions.json';

export const MENU_OPTIONS = {
  ADD_EXPENSE: '1',
  ADD_INCOME: '2',
  VIEW_RECORDS: '3',
  VIEW_SUMMARY: '4',
  EDIT_RECORD: '5',
  DELETE_RECORD: '6',
  EXIT: '0'
};

export const MESSAGES = {
  WELCOME: 'Welcome to Expense Tracker!',
  GOODBYE: 'Thank you for using Expense Tracker. Goodbye!',
  INVALID_OPTION: 'Invalid option. Please try again.',
  NO_RECORDS: 'No records found.',
  CONFIRM_DELETE: 'Are you sure you want to delete this record?',
  DELETED: 'Record deleted successfully.',
  CANCELLED: 'Operation cancelled.'
};

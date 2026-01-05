# Expense Tracker

A Node.js application for tracking personal expenses and income. Available as both a command-line tool and desktop app.
Authored by NotIntruder for DevRooms as a Application Project.

## Features

- Track expenses and income with categories
- View transaction history with filters
- Financial summaries with category breakdowns
- Edit and delete transactions
- Multi-currency support (10 currencies)
- Data visualization with charts (desktop app)

## Installation

```bash
npm install
```

## Running the Application

### Console Version

```bash
npm start
```

Navigate using the numbered menu. On first run, you'll select your preferred currency.

**Menu Options:**
- 1: Add Expense
- 2: Add Income  
- 3: View Records (with filters)
- 4: View Summary
- 5: Edit Record
- 6: Delete Record
- 7: Settings (change currency)
- 0: Exit

### Desktop App (GUI)

```bash
npm run electron:dev
```

The desktop app features:
- Dashboard with summary cards
- Interactive pie and bar charts
- Transaction table with search
- Forms for adding transactions
- Real-time currency switching

Both versions use the same data file (`data/transactions.json`).

## Building Desktop App

```bash
npm run electron:build
```

Output will be in the `dist/` folder.

## Data Storage

All data is stored locally in `data/transactions.json`. The file is created automatically on first run.

**Structure:**
- `expenses`: Array of expense transactions
- `income`: Array of income transactions  
- `settings`: User preferences (currency)

## Categories

**Expenses:** Food, Transport, Utilities, Entertainment, Healthcare, Shopping, Education, Other

**Income:** Salary, Freelance, Investment, Gift, Business, Other

## Currencies

USD ($), EUR (€), GBP (£), INR (₹), JPY (¥), CNY (¥), CAD (C$), AUD (A$), CHF (Fr), BRL (R$)

Change currency anytime via Settings menu (console) or Settings tab (desktop).

## Input Formats

**Amounts:** Positive numbers only, up to 2 decimal places

**Dates:** DD/MM/YYYY or YYYY-MM-DD (cannot be future dates)

**Descriptions:** Optional, max 500 characters

## Error Handling

The app validates all inputs and provides clear error messages. If the data file becomes corrupted, it's automatically backed up and reset.

## Project Structure

```
expense-tracker/
├── src/
│   ├── index.js           # Console app
│   ├── electron/          # Desktop app
│   ├── models/            # Data models
│   ├── services/          # Business logic
│   ├── utils/             # Helpers
│   └── config/            # Settings
├── data/                  # JSON storage
└── package.json
```

## Requirements

- Node.js 14 or higher
- npm 6 or higher

## Testing

Run automated tests:

```bash
npm test
```

## Troubleshooting

**"Module not found" errors:** Run `npm install` again

**Data file issues:** Check `data/` folder exists and has write permissions

**Electron not starting:** Ensure all dependencies installed with `npm install`

## License

MIT

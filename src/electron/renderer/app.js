/**
 * Expense Tracker Renderer
 * Handles UI interactions and IPC communication
 */

// State
let currentState = {
    view: 'dashboard',
    transactions: [],
    currency: '$'
};

// DOM Elements
const views = {
    dashboard: document.getElementById('dashboard-view'),
    transactions: document.getElementById('transactions-view'),
    add: document.getElementById('add-view'),
    settings: document.getElementById('settings-view')
};

const navItems = document.querySelectorAll('.nav-item');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading(true);

        // Load settings first
        const settingsResult = await window.expenseTracker.getSettings();
        if (settingsResult.success && settingsResult.data.currency) {
            currentState.currency = settingsResult.data.currency;
        }

        // Update currency displays
        updateCurrencyDisplays();

        // Initialize charts if available
        if (window.initCharts) {
            window.initCharts();
        }

        // Load initial data
        await loadDashboardData();

        // Setup Event Listeners
        setupNavigation();
        setupForms();
        setupFilters();
        setupSettings();
        setupModalListeners(); // Added: Event listeners for modal closing

        showLoading(false);
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize app', 'error');
        showLoading(false);
    }
});

// Navigation
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            const viewName = e.currentTarget.dataset.view;
            switchView(viewName);

            // Refresh data based on view
            if (viewName === 'dashboard') {
                await loadDashboardData();
            } else if (viewName === 'transactions') {
                await loadTransactions();
            }
        });
    });
}

function switchView(viewName) {
    // Update nav
    navItems.forEach(item => {
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update content
    Object.keys(views).forEach(key => {
        if (key === viewName) {
            views[key].classList.add('active');
        } else {
            views[key].classList.remove('active');
        }
    });

    currentState.view = viewName;
}

// Data Loading
async function loadDashboardData() {
    try {
        showLoading(true);
        const summary = await window.expenseTracker.getSummary();
        if (summary.success) {
            updateDashboardUI(summary.data);
            if (window.updateCharts) {
                window.updateCharts(summary.data);
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadTransactions() {
    try {
        const filters = getFilters();
        const result = await window.expenseTracker.getTransactions(filters);

        if (result.success) {
            let transactions = result.data;
            
            // Apply description search filter if present
            const searchTerm = document.getElementById('search-description').value.trim().toLowerCase();
            if (searchTerm) {
                transactions = transactions.filter(t => {
                    const desc = (t.description || '').toLowerCase();
                    const catOrSrc = (t.category || t.source || '').toLowerCase();
                    return desc.includes(searchTerm) || catOrSrc.includes(searchTerm);
                });
            }

            currentState.transactions = transactions;
            renderTransactionsTable(transactions);
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        showToast('Failed to load transactions', 'error');
    }
}

// UI Updates
function updateDashboardUI(data) {
    document.getElementById('total-income').textContent = formatCurrency(data.totalIncome);
    document.getElementById('total-expenses').textContent = formatCurrency(data.totalExpenses);
    document.getElementById('current-balance').textContent = formatCurrency(data.balance);
    document.getElementById('header-currency').textContent = currentState.currency;
}

function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = '';

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-records">No records found</td></tr>';
        return;
    }

    transactions.forEach(t => {
        const tr = document.createElement('tr');
        const isExpense = t.type === 'expense';
        const amountClass = isExpense ? 'amount-expense' : 'amount-income';
        const sign = isExpense ? '-' : '+';

        tr.innerHTML = `
            <td>${formatDate(t.date)}</td>
            <td><span class="badge ${isExpense ? 'badge-expense' : 'badge-income'}">${t.type}</span></td>
            <td class="${amountClass}">${sign}${formatCurrency(t.amount)}</td>
            <td>${t.category || t.source || '-'}</td>
            <td>${t.description || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon edit-btn" data-id="${t.id}" title="Edit">✏️</button>
                <button class="btn-icon delete-btn" data-id="${t.id}" title="Delete">🗑️</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    // Add event listeners for buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDelete(e.currentTarget.dataset.id));
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleEdit(e.currentTarget.dataset.id));
    });
}

// Forms
function setupForms() {
    // Add Transaction Form
    const addForm = document.getElementById('add-transaction-form');
    const typeBtns = document.querySelectorAll('.type-btn');
    let addType = 'expense';

    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            addType = btn.dataset.type;

            // Toggle Category/Source fields
            if (addType === 'expense') {
                document.getElementById('category-group').classList.remove('hidden');
                document.getElementById('category').required = true;
                document.getElementById('source-group').classList.add('hidden');
                document.getElementById('source').required = false;
            } else {
                document.getElementById('category-group').classList.add('hidden');
                document.getElementById('category').required = false;
                document.getElementById('source-group').classList.remove('hidden');
                document.getElementById('source').required = true;
            }
        });
    });

    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);

        const amount = parseFloat(document.getElementById('amount').value);
        const date = document.getElementById('date').value;
        const description = document.getElementById('description').value;

        // Client-side validation
        if (isNaN(amount) || amount <= 0) {
            showToast('Amount must be a positive number', 'error');
            showLoading(false);
            return;
        }

        if (amount > 999999999) {
            showToast('Amount is too large', 'error');
            showLoading(false);
            return;
        }

        if (!date) {
            showToast('Date is required', 'error');
            showLoading(false);
            return;
        }

        // Check if date is not in the future
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            showToast('Date cannot be in the future', 'error');
            showLoading(false);
            return;
        }

        if (description.length > 500) {
            showToast('Description is too long (max 500 characters)', 'error');
            showLoading(false);
            return;
        }

        try {
            let result;
            if (addType === 'expense') {
                const category = document.getElementById('category').value;
                if (!category) {
                    showToast('Category is required', 'error');
                    showLoading(false);
                    return;
                }
                result = await window.expenseTracker.addExpense({
                    amount, date, category, description,
                    currency: currentState.currency
                });
            } else {
                const source = document.getElementById('source').value;
                if (!source) {
                    showToast('Source is required', 'error');
                    showLoading(false);
                    return;
                }
                result = await window.expenseTracker.addIncome({
                    amount, date, source, description,
                    currency: currentState.currency
                });
            }

            if (result.success) {
                showToast('Transaction added successfully', 'success');
                addForm.reset();
                // Reset type to expense default
                typeBtns[0].click();
            } else {
                showToast(result.message || 'Failed to add transaction', 'error');
            }
        } catch (error) {
            console.error('Add error:', error);
            showToast('An error occurred', 'error');
        } finally {
            showLoading(false);
        }
    });

    // Edit Form
    const editForm = document.getElementById('edit-form');
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);

        const id = document.getElementById('edit-id').value;
        const type = document.getElementById('edit-type').value;
        const amount = parseFloat(document.getElementById('edit-amount').value);
        const currency = document.getElementById('edit-currency').value;
        const date = document.getElementById('edit-date').value;
        const description = document.getElementById('edit-description').value;

        if (!amount || amount <= 0) {
            showToast('Amount must be greater than zero', 'error');
            showLoading(false);
            return;
        }

        if (!date) {
            showToast('Date is required', 'error');
            showLoading(false);
            return;
        }

        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            showToast('Date cannot be in the future', 'error');
            showLoading(false);
            return;
        }

        const updates = { amount, currency, date, description };

        if (type === 'expense') {
            updates.category = document.getElementById('edit-category').value;
        } else {
            updates.source = document.getElementById('edit-source').value;
        }

        try {
            const result = await window.expenseTracker.updateTransaction({
                id, type, updates
            });

            if (result.success) {
                showToast('Transaction updated successfully', 'success');
                document.getElementById('edit-modal').classList.add('hidden');
                loadTransactions(); // Refresh list
            } else {
                showToast(result.message || 'Failed to update', 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            showToast('Failed to update transaction', 'error');
        } finally {
            showLoading(false);
        }
    });
}

// Filters
function setupFilters() {
    const filterInputs = [
        'filter-type', 'filter-start-date', 'filter-end-date',
        'filter-category', 'filter-source', 'search-description'
    ];

    filterInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Use 'input' event for text fields, 'change' for select/date
            const eventType = id === 'search-description' ? 'input' : 'change';
            element.addEventListener(eventType, loadTransactions);
        }
    });

    // Toggle Category/Source filter based on Type
    document.getElementById('filter-type').addEventListener('change', (e) => {
        const type = e.target.value;
        const catSelect = document.getElementById('filter-category');
        const srcSelect = document.getElementById('filter-source');

        if (type === 'expense') {
            catSelect.classList.remove('hidden');
            srcSelect.classList.add('hidden');
        } else if (type === 'income') {
            catSelect.classList.add('hidden');
            srcSelect.classList.remove('hidden');
        } else {
            catSelect.classList.remove('hidden');
            srcSelect.classList.add('hidden'); // Default show category
        }
    });

    document.getElementById('clear-filters-btn').addEventListener('click', () => {
        filterInputs.forEach(id => document.getElementById(id).value = '');
        // Reset specific defaults
        document.getElementById('filter-type').value = 'all';
        loadTransactions();
    });
}

function getFilters() {
    return {
        type: document.getElementById('filter-type').value !== 'all' ? document.getElementById('filter-type').value : undefined,
        startDate: document.getElementById('filter-start-date').value || undefined,
        endDate: document.getElementById('filter-end-date').value || undefined,
        category: document.getElementById('filter-category').value || undefined,
        source: document.getElementById('filter-source').value || undefined
    };
}

// Settings
function setupSettings() {
    const currencySelect = document.getElementById('currency-select');

    // Set initial value
    currencySelect.value = currentState.currency;

    currencySelect.addEventListener('change', async (e) => {
        const newCurrency = e.target.value;
        showLoading(true);
        try {
            const result = await window.expenseTracker.saveSettings({ currency: newCurrency });
            if (result.success) {
                currentState.currency = newCurrency;
                updateCurrencyDisplays();
                showToast('Currency updated.', 'success');
                // Refresh dashboard to show new symbol
                loadDashboardData();
            } else {
                showToast('Failed to save settings', 'error');
            }
        } catch (error) {
            console.error('Settings error:', error);
            showToast('Error saving settings', 'error');
        } finally {
            showLoading(false);
        }
    });
}

// Actions
function handleEdit(id) {
    const t = currentState.transactions.find(tr => tr.id === id);
    if (!t) return;

    document.getElementById('edit-id').value = t.id;
    document.getElementById('edit-type').value = t.type;
    // CRITICAL FIX: Use original amount for editing
    document.getElementById('edit-amount').value = (t.originalAmount !== undefined) ? t.originalAmount : t.amount;

    // Set Currency
    const currencySelect = document.getElementById('edit-currency');
    // Use originalCurrency if available (which it should be if converted), otherwise fallback
    currencySelect.value = t.originalCurrency || t.currency || '$';

    // Format date for input type="date"
    document.getElementById('edit-date').value = t.date.split('T')[0];
    document.getElementById('edit-description').value = t.description || '';

    const catGroup = document.getElementById('edit-category-group');
    const srcGroup = document.getElementById('edit-source-group');

    if (t.type === 'expense') {
        catGroup.classList.remove('hidden');
        srcGroup.classList.add('hidden');
        document.getElementById('edit-category').value = t.category;
    } else {
        catGroup.classList.add('hidden');
        srcGroup.classList.remove('hidden');
        document.getElementById('edit-source').value = t.source;
    }

    const editModal = document.getElementById('edit-modal');
    if (editModal) {
        editModal.classList.remove('hidden');
    } else {
        console.error('Edit modal element not found');
        showToast('Error opening edit modal', 'error');
    }
}

async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        showLoading(true);
        try {
            const result = await window.expenseTracker.deleteTransaction(id);
            if (result.success) {
                showToast('Transaction deleted', 'success');
                loadTransactions();
            } else {
                showToast(result.message || 'Failed to delete', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Error deleting transaction', 'error');
        } finally {
            showLoading(false);
        }
    }
}

// Helpers
function formatCurrency(amount) {
    return `${currentState.currency}${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString();
}

function showLoading(show) {
    if (show) loadingOverlay.classList.remove('hidden');
    else loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

function updateCurrencyDisplays() {
    // Update global for charts
    window.currentCurrency = currentState.currency;

    document.querySelectorAll('.current-currency').forEach(el => {
        el.textContent = currentState.currency;
    });
}

// Initialize - Main logic is at the top
// setupModalListeners is called in the main DOMContentLoaded event

function setupModalListeners() {
    try {
        // Edit Modal Close Buttons
        const editModal = document.getElementById('edit-modal');
        if (!editModal) {
            console.error('Edit modal not found in DOM');
            return;
        }

        // Overlay click
        const overlay = editModal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                editModal.classList.add('hidden');
            });
        }

        // Close button (X) - using ID
        const closeBtn = document.getElementById('edit-modal-close-x');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                editModal.classList.add('hidden');
            });
        } else {
            console.warn('Close button (X) not found');
        }

        // Cancel button - using ID
        const cancelBtn = document.getElementById('edit-modal-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                editModal.classList.add('hidden');
            });
        } else {
            console.warn('Cancel button not found');
        }
    } catch (e) {
        console.error('Error in setupModalListeners:', e);
    }
}

window.closeEditModal = () => {
    document.getElementById('edit-modal').classList.add('hidden');
};

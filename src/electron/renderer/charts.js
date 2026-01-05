/**
 * Chart.js Integration for Expense Tracker
 * Handles all data visualization using Chart.js
 */

let expensePieChart = null;
let incomeExpenseBarChart = null;

/**
 * Initialize all charts
 * Called when the app loads
 */
function initializeCharts() {
    try {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded. Charts will not be available.');
            showChartError();
            return;
        }

        initializeExpensePieChart();
        initializeIncomeExpenseBarChart();
    } catch (error) {
        console.error('Error initializing charts:', error);
        showChartError();
    }
}

/**
 * Show error message when charts fail to load
 */
function showChartError() {
    const chartContainers = document.querySelectorAll('.chart-card canvas');
    chartContainers.forEach(canvas => {
        const parent = canvas.parentElement;
        if (parent) {
            parent.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #a0aec0;">
                    <p>📊</p>
                    <p>Charts unavailable</p>
                    <p style="font-size: 12px;">Check internet connection</p>
                </div>
            `;
        }
    });
}

/**
 * Initialize the expense pie chart
 * Shows breakdown of expenses by category with percentages
 */
function initializeExpensePieChart() {
    try {
        const ctx = document.getElementById('expense-pie-chart');
        if (!ctx) {
            console.warn('Expense pie chart canvas not found');
            return;
        }

        expensePieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#ef4444', '#f97316', '#f59e0b', '#eab308',
                        '#84cc16', '#22c55e', '#10b981', '#14b8a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);

                                // Prevent division by zero
                                if (total === 0) {
                                    return `${label}: ${currentCurrency}0.00`;
                                }

                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${currentCurrency}${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating expense pie chart:', error);
    }
}

/**
 * Initialize the income vs expense bar chart
 * Compares total income and expenses
 */
function initializeIncomeExpenseBarChart() {
    try {
        const ctx = document.getElementById('income-expense-bar-chart');
        if (!ctx) {
            console.warn('Income expense bar chart canvas not found');
            return;
        }

        incomeExpenseBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expenses'],
                datasets: [{
                    label: 'Amount',
                    data: [0, 0],
                    backgroundColor: ['#10b981', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return currentCurrency + value.toFixed(0);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.label}: ${currentCurrency}${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating income expense bar chart:', error);
    }
}

/**
 * Update expense pie chart with new data
 * @param {Object} categoryData - Object with category names as keys and amounts as values
 */
function updateExpensePieChart(categoryData) {
    if (!expensePieChart) return;

    // Handle empty data
    if (!categoryData || Object.keys(categoryData).length === 0) {
        expensePieChart.data.labels = ['No expenses yet'];
        expensePieChart.data.datasets[0].data = [1];
        expensePieChart.data.datasets[0].backgroundColor = ['#e5e7eb'];
        expensePieChart.update();
        return;
    }

    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);

    expensePieChart.data.labels = labels;
    expensePieChart.data.datasets[0].data = data;
    expensePieChart.data.datasets[0].backgroundColor = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981', '#14b8a6'
    ];
    expensePieChart.update();
}

/**
 * Update income vs expense bar chart
 * @param {number} totalIncome - Total income amount
 * @param {number} totalExpenses - Total expenses amount
 */
function updateIncomeExpenseBarChart(totalIncome, totalExpenses) {
    if (!incomeExpenseBarChart) return;

    incomeExpenseBarChart.data.datasets[0].data = [totalIncome, totalExpenses];
    incomeExpenseBarChart.update();
}

// Expose functions to global scope for app.js
window.initCharts = initializeCharts;

window.updateCharts = function (summaryData) {
    if (!summaryData) return;

    updateExpensePieChart(summaryData.byCategory);
    updateIncomeExpenseBarChart(summaryData.totalIncome, summaryData.totalExpenses);
};

// Global currency variable (expected to be set by app.js)
window.currentCurrency = '$';

// =====================================================
// ANOKHI'S BANK - Frontend JavaScript
// =====================================================
// This file handles the UI and makes API calls to Netlify Functions
// which connect to the Supabase database.

// === CONSTANTS === //
const API_BASE = '/.netlify/functions';

// === STATE === //
// Local state mirrors database state for quick UI updates
let state = {
    balance: 0,
    transactions: [],
    isLoading: true
};

// === DOM ELEMENTS === //
const elements = {
    // Screens
    mainScreen: document.getElementById('mainScreen'),
    spendScreen: document.getElementById('spendScreen'),
    historyScreen: document.getElementById('historyScreen'),
    
    // Main screen
    balanceDisplay: document.getElementById('balanceDisplay'),
    spendMoneyBtn: document.getElementById('spendMoneyBtn'),
    viewHistoryBtn: document.getElementById('viewHistoryBtn'),
    nextAllowanceText: document.getElementById('nextAllowanceText'),
    
    // Spend screen
    spendAmount: document.getElementById('spendAmount'),
    spendDescription: document.getElementById('spendDescription'),
    confirmSpendBtn: document.getElementById('confirmSpendBtn'),
    backFromSpend: document.getElementById('backFromSpend'),
    
    // History screen
    historyList: document.getElementById('historyList'),
    emptyState: document.getElementById('emptyState'),
    backFromHistory: document.getElementById('backFromHistory'),
    
    // Toast
    toast: document.getElementById('toast')
};

// =====================================================
// INITIALIZATION
// =====================================================

/**
 * Initialize the app - load data from the database
 */
async function init() {
    // Show loading state
    elements.balanceDisplay.textContent = 'Loading...';
    
    // Setup event listeners
    setupEventListeners();
    
    // Update the next allowance display
    updateNextAllowanceDisplay();
    
    // Load balance from database
    await loadBalance();
}

// =====================================================
// API CALLS
// =====================================================

/**
 * Fetch the current balance from the database
 */
async function loadBalance() {
    try {
        const response = await fetch(`${API_BASE}/get-balance`);
        const data = await response.json();
        
        if (response.ok) {
            state.balance = data.balance;
            state.isLoading = false;
            updateBalanceDisplay();
        } else {
            showToast('⚠️ Could not load balance');
            elements.balanceDisplay.textContent = '$--';
        }
    } catch (error) {
        console.error('Error loading balance:', error);
        showToast('⚠️ Connection error');
        elements.balanceDisplay.textContent = '$--';
    }
}

/**
 * Fetch all transactions from the database
 */
async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE}/get-transactions`);
        const data = await response.json();
        
        if (response.ok) {
            state.transactions = data.transactions;
            renderHistory();
        } else {
            showToast('⚠️ Could not load history');
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        showToast('⚠️ Connection error');
    }
}

/**
 * Spend money - sends request to the API
 */
async function spendMoney() {
    const amount = parseFloat(elements.spendAmount.value);
    const description = elements.spendDescription.value.trim() || 'Spent money';
    
    // Validation
    if (!amount || amount <= 0) {
        showToast('⚠️ Please enter an amount');
        return;
    }
    
    if (amount > state.balance) {
        showToast('⚠️ Not enough money in bank');
        return;
    }
    
    // Disable button while processing
    elements.confirmSpendBtn.disabled = true;
    elements.confirmSpendBtn.textContent = 'Processing...';
    
    try {
        const response = await fetch(`${API_BASE}/spend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount, description })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update local state with new balance
            state.balance = data.newBalance;
            updateBalanceDisplay();
            
            // Clear form
            elements.spendAmount.value = '';
            elements.spendDescription.value = '';
            
            // Show success message
            showToast(`💸 Spent $${data.amountSpent.toFixed(2)}`);
            
            // Return to main screen
            showScreen('main');
        } else {
            showToast(`⚠️ ${data.error}`);
        }
    } catch (error) {
        console.error('Error spending money:', error);
        showToast('⚠️ Connection error');
    } finally {
        // Re-enable button
        elements.confirmSpendBtn.disabled = false;
        elements.confirmSpendBtn.textContent = '✓ Confirm Spending';
    }
}

// =====================================================
// UI UPDATES
// =====================================================

/**
 * Update the balance display
 */
function updateBalanceDisplay() {
    elements.balanceDisplay.textContent = `$${state.balance.toFixed(2)}`;
}

/**
 * Get current time in PST timezone
 */
function getPSTDate() {
    const now = new Date();
    const pstTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    return pstTime;
}

/**
 * Calculate and display when the next allowance will be added
 * Note: Allowance is now added automatically by the database (pg_cron)
 */
function updateNextAllowanceDisplay() {
    const pstNow = getPSTDate();
    const currentDay = pstNow.getDay();
    const currentHour = pstNow.getHours();
    
    // Calculate days until next Sunday
    let daysUntilSunday;
    
    if (currentDay === 0 && currentHour < 7) {
        // It's Sunday but before 7am
        daysUntilSunday = 0;
    } else if (currentDay === 0 && currentHour >= 7) {
        // It's Sunday after 7am - next allowance is in 7 days
        daysUntilSunday = 7;
    } else {
        // Calculate days until next Sunday
        daysUntilSunday = 7 - currentDay;
    }
    
    if (daysUntilSunday === 0) {
        elements.nextAllowanceText.textContent = 'Next allowance: Today at 7:00 AM';
    } else if (daysUntilSunday === 1) {
        elements.nextAllowanceText.textContent = 'Next allowance: Tomorrow at 7:00 AM';
    } else {
        elements.nextAllowanceText.textContent = `Next allowance: In ${daysUntilSunday} days (Sunday 7:00 AM)`;
    }
}

/**
 * Format a date for display
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Check if today
    if (transactionDate.getTime() === today.getTime()) {
        return `Today at ${date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        })}`;
    }
    
    // Check if yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (transactionDate.getTime() === yesterday.getTime()) {
        return `Yesterday at ${date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        })}`;
    }
    
    // Otherwise show full date
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Render the transaction history
 */
function renderHistory() {
    // Clear current history
    elements.historyList.innerHTML = '';
    
    // Check if there are transactions
    if (state.transactions.length === 0) {
        elements.emptyState.classList.add('visible');
        return;
    }
    
    elements.emptyState.classList.remove('visible');
    
    // Render each transaction
    state.transactions.forEach(transaction => {
        const transactionEl = document.createElement('div');
        transactionEl.className = 'transaction-item';
        
        const typeLabel = transaction.type === 'deposit' ? '➕ Added Money' : '💸 Spent Money';
        const amountClass = transaction.type === 'deposit' ? 'deposit' : 'withdrawal';
        const amountSign = transaction.type === 'deposit' ? '+' : '-';
        
        transactionEl.innerHTML = `
            <div class="transaction-header">
                <div class="transaction-type">${typeLabel}</div>
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}$${transaction.amount.toFixed(2)}
                </div>
            </div>
            <div class="transaction-description">${transaction.description}</div>
            <div class="transaction-footer">
                <div class="transaction-date">${formatDate(transaction.timestamp)}</div>
                <div class="transaction-balance">Balance: $${transaction.balanceAfter.toFixed(2)}</div>
            </div>
        `;
        
        elements.historyList.appendChild(transactionEl);
    });
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    
    // Hide after 2 seconds
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 2000);
}

/**
 * Navigate between screens
 * @param {string} screen - Screen to show: 'main', 'spend', or 'history'
 */
function showScreen(screen) {
    // Hide all screens
    elements.mainScreen.classList.remove('active');
    elements.spendScreen.classList.remove('active');
    elements.historyScreen.classList.remove('active');
    
    // Show requested screen
    switch(screen) {
        case 'main':
            elements.mainScreen.classList.add('active');
            // Refresh balance when returning to main screen
            loadBalance();
            break;
        case 'spend':
            elements.spendScreen.classList.add('active');
            // Focus on amount input
            setTimeout(() => elements.spendAmount.focus(), 100);
            break;
        case 'history':
            elements.historyScreen.classList.add('active');
            // Load transactions from database
            loadTransactions();
            break;
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// =====================================================
// EVENT LISTENERS
// =====================================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Main screen buttons
    elements.spendMoneyBtn.addEventListener('click', () => showScreen('spend'));
    elements.viewHistoryBtn.addEventListener('click', () => showScreen('history'));
    
    // Spend screen
    elements.confirmSpendBtn.addEventListener('click', spendMoney);
    elements.backFromSpend.addEventListener('click', () => showScreen('main'));
    
    // Allow Enter key to submit spending
    elements.spendAmount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            // If amount is filled, move to description or submit
            if (elements.spendAmount.value) {
                if (!elements.spendDescription.value) {
                    elements.spendDescription.focus();
                } else {
                    spendMoney();
                }
            }
        }
    });
    
    elements.spendDescription.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            spendMoney();
        }
    });
    
    // History screen
    elements.backFromHistory.addEventListener('click', () => showScreen('main'));
}

// =====================================================
// START THE APP
// =====================================================
// Wait for the page to load, then initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

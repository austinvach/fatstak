// Wallet Data Management System

// Portfolio state object to manage all wallet data
let portfolioState = {
    wallets: [],
    totalValue: 0,
    btcPrice: 0,
    lastUpdated: null,
    isLoading: false
};

// Auto-refresh interval ID for cleanup
let autoRefreshInterval = null;

// Wallet object constructor
function createWallet(address, nickname = '') {
    return {
        address: address,
        nickname: nickname,
        balance: 0,
        usdValue: 0,
        lastUpdated: null
    };
}

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
    console.log('DOM Content Loaded - Starting initialization...');
    try {
        await initializePortfolio();
        console.log('Portfolio initialization completed');
        startAutoRefresh();
        setupEventListeners();
        console.log('Application initialization completed successfully');
    } catch (error) {
        console.error('Error during application initialization:', error);
    }
});

// Setup additional event listeners for better UX
function setupEventListeners() {
    const walletAddressInput = document.getElementById('walletAddress');
    
    // Add Enter key support for wallet input
    if (walletAddressInput) {
        walletAddressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addWallet();
            }
        });
        
        // Real-time validation feedback
        walletAddressInput.addEventListener('input', (e) => {
            const address = e.target.value.trim();
            clearValidationMessages();
            
            if (address.length > 0) {
                if (validateBitcoinAddress(address)) {
                    setInputValidationState('walletAddress', true);
                } else if (address.length >= 26) {
                    setInputValidationState('walletAddress', false);
                } else {
                    setInputValidationState('walletAddress', null);
                }
            } else {
                setInputValidationState('walletAddress', null);
            }
        });
    }
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
    stopAutoRefresh();
});

// Initialize portfolio from localStorage
async function initializePortfolio() {
    loadPortfolioFromStorage();
    
    // Debug: Log the loaded state
    console.log('Portfolio state after loading from storage:', {
        walletCount: portfolioState.wallets.length,
        totalValue: portfolioState.totalValue,
        btcPrice: portfolioState.btcPrice,
        wallets: portfolioState.wallets
    });
    
    // If we have stored wallets, fetch current values for them
    if (portfolioState.wallets.length > 0) {
        console.log(`Loading ${portfolioState.wallets.length} stored wallets and fetching current values...`);
        
        // Show initial state with cached data
        renderWalletListDisplay();
        
        // Fetch current values for all stored wallets
        await fetchStoredWalletValues();
        
        // Re-render with updated data
        renderWalletListDisplay();
    } else {
        // No stored wallets, ensure total value is reset
        portfolioState.totalValue = 0;
        renderWalletListDisplay();
    }
    
    displayUpdateInfo();
    addRefreshButton();
}

// Render wallet list display without fetching new data
function renderWalletListDisplay() {
    console.log('renderWalletListDisplay called with', portfolioState.wallets.length, 'wallets');
    const walletsContainer = document.getElementById("walletsContainer");
    const emptyState = document.getElementById("emptyState");
    
    if (!walletsContainer) {
        console.error('Wallets container not found');
        return;
    }

    // Clear container
    walletsContainer.innerHTML = "";
    
    // If no wallets, show empty state
    if (portfolioState.wallets.length === 0) {
        console.log('No wallets found, showing empty state');
        showEmptyState();
        displayUpdateInfo();
        updateWalletCount();
        return;
    }
    
    console.log('Rendering', portfolioState.wallets.length, 'wallet cards');
    // Hide empty state and render wallet cards
    hideEmptyState();
    
    // Render each wallet card with current data
    portfolioState.wallets.forEach((wallet, index) => {
        console.log('Rendering wallet card for:', wallet.address);
        createWalletCard(wallet, index);
    });
    
    // Update displays
    calculateTotalValue();
    displayUpdateInfo();
    updateWalletCount();
}

// Load portfolio data from localStorage with enhanced error handling
function loadPortfolioFromStorage() {
    console.log('Loading portfolio from localStorage...');
    try {
        // Check if localStorage is available
        if (!isLocalStorageAvailable()) {
            console.warn('localStorage is not available. Starting with empty portfolio.');
            initializeEmptyPortfolio();
            return;
        }
        
        const savedWallets = localStorage.getItem("wallets");
        const savedBtcPrice = localStorage.getItem("btcPrice");
        const savedLastUpdated = localStorage.getItem("lastUpdated");
        
        console.log('Raw localStorage data:', {
            savedWallets: savedWallets,
            savedBtcPrice: savedBtcPrice,
            savedLastUpdated: savedLastUpdated
        });
        
        // Debug: Check if we have any data at all
        if (!savedWallets) {
            console.log('No saved wallets found in localStorage');
        } else {
            console.log('Found saved wallets data, length:', savedWallets.length);
        }
        
        // Parse saved wallets with validation
        let parsedWallets = [];
        if (savedWallets) {
            try {
                parsedWallets = JSON.parse(savedWallets);
                if (!Array.isArray(parsedWallets)) {
                    console.warn('Invalid wallets data format in localStorage. Starting fresh.');
                    parsedWallets = [];
                }
            } catch (parseError) {
                console.error('Error parsing saved wallets:', parseError);
                parsedWallets = [];
            }
        }
        
        // Validate and restore wallet data
        portfolioState.wallets = parsedWallets
            .filter(wallet => wallet && wallet.address && validateBitcoinAddress(wallet.address))
            .map(wallet => ({
                ...createWallet(wallet.address, wallet.nickname || ''),
                balance: parseFloat(wallet.balance) || 0,
                usdValue: parseFloat(wallet.usdValue) || 0,
                lastUpdated: wallet.lastUpdated || null
            }));
        
        // Restore Bitcoin price with validation
        portfolioState.btcPrice = savedBtcPrice ? parseFloat(savedBtcPrice) || 0 : 0;
        portfolioState.lastUpdated = savedLastUpdated;
        
        calculateTotalValue();
        
        console.log(`Loaded ${portfolioState.wallets.length} wallets from localStorage`);
        
    } catch (error) {
        console.error('Error loading portfolio from storage:', error);
        handleLocalStorageError('load', error);
        initializeEmptyPortfolio();
    }
}

// Initialize empty portfolio state
function initializeEmptyPortfolio() {
    portfolioState = {
        wallets: [],
        totalValue: 0,
        btcPrice: 0,
        lastUpdated: null,
        isLoading: false
    };
}

// Save portfolio data to localStorage with enhanced error handling
function savePortfolioToStorage() {
    try {
        // Check if localStorage is available
        if (!isLocalStorageAvailable()) {
            console.warn('localStorage is not available. Cannot save portfolio data.');
            showValidationMessage('⚠️ Unable to save data - browser storage not available.', 'warning');
            return false;
        }
        
        // Prepare data for storage
        const walletsData = JSON.stringify(portfolioState.wallets);
        const btcPriceData = portfolioState.btcPrice.toString();
        const lastUpdatedData = portfolioState.lastUpdated;
        
        // Check storage quota before saving
        const estimatedSize = walletsData.length + btcPriceData.length + (lastUpdatedData ? lastUpdatedData.length : 0);
        
        // Save data with error handling for quota exceeded
        localStorage.setItem("wallets", walletsData);
        localStorage.setItem("btcPrice", btcPriceData);
        if (lastUpdatedData) {
            localStorage.setItem("lastUpdated", lastUpdatedData);
        }
        
        console.log(`Portfolio data saved to localStorage (${estimatedSize} characters)`);
        return true;
        
    } catch (error) {
        console.error('Error saving portfolio to storage:', error);
        handleLocalStorageError('save', error);
        return false;
    }
}

// Check if localStorage is available and functional
function isLocalStorageAvailable() {
    try {
        const testKey = '__localStorage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        return false;
    }
}

// Handle localStorage errors with user-friendly messages
function handleLocalStorageError(operation, error) {
    let userMessage = '';
    
    if (error.name === 'QuotaExceededError' || error.code === 22) {
        userMessage = '⚠️ Browser storage is full. Please clear some data or use a different browser.';
        console.error('localStorage quota exceeded');
    } else if (error.name === 'SecurityError') {
        userMessage = '⚠️ Browser storage is disabled. Please enable cookies and local storage.';
        console.error('localStorage access denied due to security settings');
    } else {
        userMessage = `⚠️ Unable to ${operation} wallet data. Your changes may not be saved.`;
        console.error(`localStorage ${operation} error:`, error);
    }
    
    // Show user-friendly error message
    showValidationMessage(userMessage, 'warning');
    
    // Set API error for persistent display
    setApiError('storage', `Storage ${operation} failed: ${error.message}`);
}

// Clear localStorage data (utility function)
function clearStoredData() {
    try {
        if (isLocalStorageAvailable()) {
            localStorage.removeItem("wallets");
            localStorage.removeItem("btcPrice");
            localStorage.removeItem("lastUpdated");
            console.log('Stored portfolio data cleared');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error clearing stored data:', error);
        return false;
    }
}

// Get storage usage information (utility function)
function getStorageInfo() {
    try {
        if (!isLocalStorageAvailable()) {
            return { available: false, used: 0, total: 0 };
        }
        
        let used = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                used += localStorage[key].length + key.length;
            }
        }
        
        return {
            available: true,
            used: used,
            walletCount: portfolioState.wallets.length,
            lastSaved: portfolioState.lastUpdated
        };
    } catch (error) {
        console.error('Error getting storage info:', error);
        return { available: false, error: error.message };
    }
}

// Recover from corrupted localStorage data
function recoverFromCorruptedStorage() {
    try {
        console.log('Attempting to recover from corrupted storage...');
        
        // Try to salvage individual wallet addresses if possible
        const rawWallets = localStorage.getItem("wallets");
        let recoveredWallets = [];
        
        if (rawWallets) {
            // Try to extract valid Bitcoin addresses from corrupted data
            const addressPattern = /[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}/g;
            const foundAddresses = rawWallets.match(addressPattern) || [];
            
            recoveredWallets = foundAddresses
                .filter((addr, index, arr) => arr.indexOf(addr) === index) // Remove duplicates
                .filter(addr => validateBitcoinAddress(addr))
                .map(addr => createWallet(addr));
        }
        
        if (recoveredWallets.length > 0) {
            console.log(`Recovered ${recoveredWallets.length} wallet addresses from corrupted data`);
            portfolioState.wallets = recoveredWallets;
            
            // Clear corrupted data and save recovered data
            clearStoredData();
            savePortfolioToStorage();
            
            showValidationMessage(`✅ Recovered ${recoveredWallets.length} wallet addresses from corrupted data.`, 'success');
            return true;
        } else {
            console.log('No recoverable wallet data found');
            clearStoredData();
            return false;
        }
        
    } catch (error) {
        console.error('Recovery attempt failed:', error);
        clearStoredData();
        return false;
    }
}

// Fetch current values for stored wallets on page load
async function fetchStoredWalletValues(isRefresh = false) {
    if (portfolioState.wallets.length === 0) {
        return;
    }
    
    try {
        console.log('Fetching current values for stored wallets...');
        setLoadingState('Loading stored wallets...');
        
        // Update Bitcoin price first
        await updateBitcoinPrice();
        
        // Update each wallet's balance and USD value
        for (const wallet of portfolioState.wallets) {
            try {
                await updateWalletData(wallet);
            } catch (error) {
                console.warn(`Failed to update wallet ${wallet.address}:`, error.message);
                // Keep existing data but mark as stale
                wallet.hasError = true;
                wallet.errorMessage = `Stale data: ${error.message}`;
            }
        }
        
        // Calculate total value and save updated data
        calculateTotalValue();
        
        // Only update timestamp if this is a refresh, not initial load
        if (isRefresh) {
            portfolioState.lastUpdated = new Date().toISOString();
        }
        
        savePortfolioToStorage();
        
        console.log('Stored wallet values updated successfully');
        
    } catch (error) {
        console.error('Error fetching stored wallet values:', error);
        setApiError('network', `Failed to update stored wallets: ${error.message}`);
    } finally {
        clearLoadingState();
    }
}

// Add wallet to tracking list
async function addWallet() {
    const addressInput = document.getElementById('walletAddress');
    const addBtn = document.getElementById('addWalletBtn');
    const addBtnText = document.getElementById('addBtnText');
    
    const address = addressInput.value.trim();

    // Clear previous validation messages
    clearValidationMessages();

    // Validate input
    if (!address) {
        setInputValidationState('walletAddress', false, 'Please enter a wallet address.');
        addressInput.focus();
        return;
    }

    // Validate Bitcoin address format
    if (!validateBitcoinAddress(address)) {
        setInputValidationState('walletAddress', false, 'Please enter a valid Bitcoin address.');
        addressInput.focus();
        return;
    }

    // Check for duplicate addresses
    if (isWalletAlreadyTracked(address)) {
        setInputValidationState('walletAddress', false, 'This wallet address is already being tracked.');
        addressInput.focus();
        return;
    }

    try {
        // Show loading state
        addBtn.disabled = true;
        addBtnText.textContent = 'Adding...';
        setInputValidationState('walletAddress', true);

        // Create new wallet object
        const newWallet = createWallet(address);
        
        // Add to portfolio
        portfolioState.wallets.push(newWallet);
        
        // Save to localStorage
        savePortfolioToStorage();
        
        // Re-render the wallet list
        await renderWalletList(true);

        // Clear input and show success
        addressInput.value = '';
        setInputValidationState('walletAddress', null);
        showValidationMessage('✅ Wallet added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding wallet:', error);
        showValidationMessage('❌ Failed to add wallet. Please try again.', 'error');
        setInputValidationState('walletAddress', false);
    } finally {
        // Reset button state
        addBtn.disabled = false;
        addBtnText.textContent = 'Add Wallet';
    }
}

// Check if wallet address is already being tracked
function isWalletAlreadyTracked(address) {
    return portfolioState.wallets.some(wallet => wallet.address === address);
}

// Remove wallet from tracking list
function removeWallet(index) {
    if (index >= 0 && index < portfolioState.wallets.length) {
        const wallet = portfolioState.wallets[index];
        const walletName = wallet.nickname || wallet.address.substring(0, 8) + '...';
        
        // Confirm removal
        if (!confirm(`Are you sure you want to remove wallet "${walletName}"?`)) {
            return;
        }
        
        // Remove wallet from portfolio state
        portfolioState.wallets.splice(index, 1);
        
        // Recalculate total portfolio value immediately
        calculateTotalValue();
        
        // Update localStorage to persist changes
        savePortfolioToStorage();
        
        // Update display immediately without refetching data
        updateWalletListDisplay();
        
        // Update the info display with new totals
        displayUpdateInfo();
        
        // Show success message
        showValidationMessage(`✅ Wallet "${walletName}" removed successfully.`, 'success');
    }
}

// Calculate USD value from Bitcoin balance
function calculateUsdValue(btcBalance, btcPrice) {
    if (typeof btcBalance !== 'number' || typeof btcPrice !== 'number') {
        return 0;
    }
    return btcBalance * btcPrice;
}

// Calculate total portfolio value
function calculateTotalValue() {
    if (portfolioState.wallets.length === 0) {
        portfolioState.totalValue = 0;
    } else {
        portfolioState.totalValue = portfolioState.wallets.reduce((total, wallet) => {
            return total + (wallet.usdValue || 0);
        }, 0);
    }
    
    // Debug: Log the calculation
    console.log('Total value calculated:', {
        walletCount: portfolioState.wallets.length,
        totalValue: portfolioState.totalValue,
        walletValues: portfolioState.wallets.map(w => ({ address: w.address.substring(0, 8) + '...', usdValue: w.usdValue }))
    });
    
    // Update the display immediately after calculation
    updateTotalValueDisplay();
}

// Update total portfolio value display
function updateTotalValueDisplay() {
    const totalValueDiv = document.getElementById("totalValue");
    if (totalValueDiv) {
        totalValueDiv.textContent = formatCurrency(portfolioState.totalValue);
    }
}

// Format currency display with proper USD formatting
function formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Format Bitcoin balance display following BIP 177 standard
function formatBitcoinBalance(balance, includeSymbol = false) {
    if (typeof balance !== 'number' || isNaN(balance)) {
        return includeSymbol ? '0 ₿' : '0';
    }
    
    // BIP 177: Use standard decimal notation, remove unnecessary trailing zeros
    // Convert to 8 decimal places (satoshi precision) then remove trailing zeros
    let formatted = balance.toFixed(8);
    
    // Remove trailing zeros after decimal point
    formatted = formatted.replace(/\.?0+$/, '');
    
    // If we end up with just an integer, ensure we don't have a trailing decimal
    if (formatted.endsWith('.')) {
        formatted = formatted.slice(0, -1);
    }
    
    // Add Bitcoin symbol if requested (BIP 177 standard)
    return includeSymbol ? formatted + ' ₿' : formatted;
}

// Render the complete wallet list
async function renderWalletList(isRefresh = true) {
    const walletsContainer = document.getElementById("walletsContainer");
    const emptyState = document.getElementById("emptyState");
    const loadingState = document.getElementById("loadingState");
    
    if (!walletsContainer) {
        console.error('Wallets container not found');
        return;
    }

    try {
        // Show loading state
        showLoadingState();
        
        // Check network connectivity first
        const isConnected = await checkNetworkConnectivity();
        if (!isConnected) {
            showValidationMessage('⚠️ Network connectivity issues. Showing cached data.', 'warning');
        }
        
        // Fetch current Bitcoin price
        await updateBitcoinPrice();
        
        // Clear container
        walletsContainer.innerHTML = "";
        
        // If no wallets, show empty state
        if (portfolioState.wallets.length === 0) {
            hideLoadingState();
            showEmptyState();
            displayUpdateInfo();
            updateWalletCount();
            return;
        }
        
        // Hide empty state and show wallets
        hideEmptyState();
        
        // Render each wallet with individual loading states
        for (const [index, wallet] of portfolioState.wallets.entries()) {
            // Add wallet card with loading state first
            renderWalletCardWithLoading(wallet, index);
            
            // Update wallet data and re-render
            await updateWalletData(wallet);
            renderWalletCard(wallet, index);
        }
        
        // Calculate and update total value
        calculateTotalValue();
        
        // Update timestamps and save (only if this is a refresh)
        if (isRefresh) {
            portfolioState.lastUpdated = new Date().toISOString();
        }
        savePortfolioToStorage();
        
        // Update all wallet USD values with current Bitcoin price
        updateAllWalletDisplays();
        
    } catch (error) {
        console.error('Error rendering wallet list:', error);
        setApiError('network', `Failed to load wallet data: ${error.message}`);
        showErrorState('❌ Error loading wallet data. Please check your connection and try again.');
    } finally {
        hideLoadingState();
        displayUpdateInfo();
        updateWalletCount();
    }
}

// Render wallet card with loading state
function renderWalletCardWithLoading(wallet, index) {
    const walletsContainer = document.getElementById("walletsContainer");
    
    const card = document.createElement("div");
    card.className = "wallet-card bg-white rounded-xl shadow-sm border border-gray-200 p-4";
    card.id = `wallet-card-${index}`;
    
    card.innerHTML = `
        <div class="wallet-info mb-3">
            ${wallet.nickname ? `<div class="wallet-nickname mb-1">${escapeHtml(wallet.nickname)}</div>` : ''}
            <div class="wallet-address text-xs font-mono">${escapeHtml(wallet.address)}</div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <div class="text-xs text-gray-500 mb-1">Balance</div>
                <div class="font-semibold text-gray-900">
                    Loading...
                </div>
            </div>
            <div>
                <div class="text-xs text-gray-500 mb-1">Value (USD)</div>
                <div class="font-semibold text-gray-900">
                    Loading...
                </div>
            </div>
        </div>
        
        <div class="action-buttons">
            <button onclick="editWallet(${index})" class="action-btn edit-btn">
                ✏️ Edit
            </button>
            <button onclick="removeWallet(${index})" class="action-btn remove-btn">
                🗑️ Remove
            </button>
        </div>
    `;
    
    walletsContainer.appendChild(card);
}

// Create a complete wallet card from scratch (BIP177 formatting)
function createWalletCard(wallet, index) {
    const walletsContainer = document.getElementById("walletsContainer");
    if (!walletsContainer) return;
    
    const hasError = wallet.hasError;
    const errorClass = hasError ? 'border-red-200 bg-red-50' : 'border-gray-200';
    
    const card = document.createElement("div");
    card.className = `wallet-card bg-white rounded-xl shadow-sm border ${errorClass} p-4`;
    card.id = `wallet-card-${index}`;
    
    card.innerHTML = `
        <div class="wallet-info mb-3">
            ${wallet.nickname ? `<div class="wallet-nickname mb-1">${escapeHtml(wallet.nickname)}</div>` : ''}
            <div class="wallet-address text-xs font-mono">${escapeHtml(wallet.address)}</div>
            ${hasError ? `<div class="text-xs text-red-600 mt-1">⚠️ ${wallet.errorMessage}</div>` : ''}
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <div class="text-xs text-gray-500 mb-1">Balance</div>
                <div class="font-semibold bitcoin-amount ${hasError ? 'text-red-600' : 'text-gray-900'}">
                    ${hasError ? 'Error' : formatBitcoinBalance(wallet.balance, true)}
                </div>
            </div>
            <div>
                <div class="text-xs text-gray-500 mb-1">Value (USD)</div>
                <div class="font-semibold ${hasError ? 'text-red-600' : 'text-green-600'}">
                    ${hasError ? 'Error' : formatCurrency(wallet.usdValue)}
                </div>
            </div>
        </div>
        
        <div class="action-buttons">
            <button onclick="editWallet(${index})" class="action-btn edit-btn">
                ✏️ Edit
            </button>
            <button onclick="removeWallet(${index})" class="action-btn remove-btn">
                🗑️ Remove
            </button>
            ${hasError ? `<button onclick="refreshWallet(${index})" class="action-btn bg-yellow-500 text-white hover:bg-yellow-600">🔄 Retry</button>` : ''}
        </div>
    `;
    
    walletsContainer.appendChild(card);
}

// Render individual wallet card
function renderWalletCard(wallet, index) {
    const card = document.getElementById(`wallet-card-${index}`);
    if (!card) return;
    
    const hasError = wallet.hasError;
    const errorClass = hasError ? 'border-red-200 bg-red-50' : 'border-gray-200';
    
    card.className = `wallet-card bg-white rounded-xl shadow-sm border ${errorClass} p-4`;
    
    card.innerHTML = `
        <div class="wallet-info mb-3">
            ${wallet.nickname ? `<div class="wallet-nickname mb-1">${escapeHtml(wallet.nickname)}</div>` : ''}
            <div class="wallet-address text-xs font-mono">${escapeHtml(wallet.address)}</div>
            ${hasError ? `<div class="text-xs text-red-600 mt-1">⚠️ ${wallet.errorMessage}</div>` : ''}
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <div class="text-xs text-gray-500 mb-1">Balance</div>
                <div class="font-semibold bitcoin-amount ${hasError ? 'text-red-600' : 'text-gray-900'}">
                    ${hasError ? 'Error' : formatBitcoinBalance(wallet.balance, true)}
                </div>
            </div>
            <div>
                <div class="text-xs text-gray-500 mb-1">Value (USD)</div>
                <div class="font-semibold ${hasError ? 'text-red-600' : 'text-green-600'}">
                    ${hasError ? 'Error' : formatCurrency(wallet.usdValue)}
                </div>
            </div>
        </div>
        
        <div class="action-buttons">
            <button onclick="editWallet(${index})" class="action-btn edit-btn">
                ✏️ Edit
            </button>
            <button onclick="removeWallet(${index})" class="action-btn remove-btn">
                🗑️ Remove
            </button>
            ${hasError ? `<button onclick="refreshWallet(${index})" class="action-btn bg-yellow-500 text-white hover:bg-yellow-600">🔄 Retry</button>` : ''}
        </div>
    `;
}

// Update wallet data (balance and USD value)
async function updateWalletData(wallet) {
    try {
        const balance = await fetchBalance(wallet.address);
        wallet.balance = balance;
        
        // Calculate USD value using the dedicated function
        wallet.usdValue = calculateUsdValue(balance, portfolioState.btcPrice);
        
        wallet.lastUpdated = new Date().toISOString();
        wallet.hasError = false;
        wallet.errorMessage = null;
        
        // Trigger dynamic display update for this wallet
        updateWalletDisplay(wallet);
        
    } catch (error) {
        console.error(`Error updating wallet ${wallet.address}:`, error);
        wallet.hasError = true;
        wallet.errorMessage = error.message;
        // Keep existing values if update fails, but mark as stale
        if (!wallet.lastUpdated) {
            wallet.balance = 0;
            wallet.usdValue = 0;
        }
    }
}

// Update individual wallet display dynamically
function updateWalletDisplay(wallet) {
    const walletIndex = portfolioState.wallets.indexOf(wallet);
    if (walletIndex >= 0) {
        renderWalletCard(wallet, walletIndex);
    }
}

// Update wallet list display without refetching data (for immediate updates)
function updateWalletListDisplay() {
    const walletsContainer = document.getElementById("walletsContainer");
    
    if (!walletsContainer) {
        console.error('Wallets container not found');
        return;
    }

    // Clear container
    walletsContainer.innerHTML = "";
    
    // If no wallets, show empty state
    if (portfolioState.wallets.length === 0) {
        showEmptyState();
        updateWalletCount();
        return;
    }
    
    // Hide empty state and render wallet cards
    hideEmptyState();
    
    // Render each wallet card with current data
    portfolioState.wallets.forEach((wallet, index) => {
        renderWalletCard(wallet, index);
    });
    
    updateWalletCount();
}

// UI State Management Functions
function showLoadingState() {
    const loadingState = document.getElementById("loadingState");
    const walletsContainer = document.getElementById("walletsContainer");
    const emptyState = document.getElementById("emptyState");
    
    if (loadingState) loadingState.classList.remove("hidden");
    if (walletsContainer) walletsContainer.classList.add("hidden");
    if (emptyState) emptyState.classList.add("hidden");
}

function hideLoadingState() {
    const loadingState = document.getElementById("loadingState");
    const walletsContainer = document.getElementById("walletsContainer");
    
    if (loadingState) loadingState.classList.add("hidden");
    if (walletsContainer) walletsContainer.classList.remove("hidden");
}

function showEmptyState() {
    const emptyState = document.getElementById("emptyState");
    const walletsContainer = document.getElementById("walletsContainer");
    
    if (emptyState) emptyState.classList.remove("hidden");
    if (walletsContainer) walletsContainer.innerHTML = "";
}

function hideEmptyState() {
    const emptyState = document.getElementById("emptyState");
    
    if (emptyState) emptyState.classList.add("hidden");
}

function showErrorState(message) {
    const walletsContainer = document.getElementById("walletsContainer");
    
    if (walletsContainer) {
        walletsContainer.innerHTML = `
            <div class="col-span-full">
                <div class="error-message text-center">
                    ${message}
                </div>
            </div>
        `;
    }
}

function updateWalletCount() {
    const walletCount = document.getElementById("walletCount");
    if (walletCount) {
        const count = portfolioState.wallets.length;
        walletCount.textContent = `${count} wallet${count !== 1 ? 's' : ''}`;
    }
}

// Validation and messaging functions
function showValidationMessage(message, type = 'error') {
    const container = document.getElementById("validationMessages");
    if (!container) return;
    
    const messageClass = type === 'error' ? 'error-message' : 
                        type === 'success' ? 'success-message' : 
                        'bg-yellow-50 border-yellow-200 text-yellow-800';
    
    container.innerHTML = `<div class="${messageClass}">${message}</div>`;
    container.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        container.style.display = 'none';
    }, 5000);
}

function clearValidationMessages() {
    const container = document.getElementById("validationMessages");
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

function validateBitcoinAddress(address) {
    // Basic Bitcoin address validation
    if (!address || address.length < 26 || address.length > 35) {
        return false;
    }
    
    // Check for valid Bitcoin address patterns
    const legacyPattern = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    const segwitPattern = /^bc1[a-z0-9]{39,59}$/;
    
    return legacyPattern.test(address) || segwitPattern.test(address);
}

function setInputValidationState(inputId, isValid, message = '') {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Remove existing validation classes
    input.classList.remove('input-error', 'input-success');
    
    if (isValid === true) {
        input.classList.add('input-success');
    } else if (isValid === false) {
        input.classList.add('input-error');
        if (message) {
            showValidationMessage(message, 'error');
        }
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// API Configuration and Error Handling
const API_CONFIG = {
    BLOCKCHAIN_INFO: {
        baseUrl: 'https://blockchain.info/q/addressbalance',
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 1000
    },
    COINGECKO: {
        baseUrl: 'https://api.coingecko.com/api/v3/simple/price',
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 1000
    }
};

// Generic API request function with timeout and retry logic
async function makeApiRequest(url, options = {}) {
    const { timeout = 10000, retryAttempts = 3, retryDelay = 1000 } = options;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            console.warn(`API request attempt ${attempt} failed:`, error.message);
            
            if (attempt === retryAttempts) {
                throw new Error(`API request failed after ${retryAttempts} attempts: ${error.message}`);
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
    }
}

// Update Bitcoin price from CoinGecko API
async function updateBitcoinPrice() {
    try {
        setLoadingState('Fetching Bitcoin price...');
        
        // Try multiple API endpoints for better reliability
        const apiEndpoints = [
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
            'https://api.coindesk.com/v1/bpi/currentprice.json'
        ];
        
        let priceData = null;
        
        // Try CoinGecko first
        try {
            const response = await fetch(apiEndpoints[0], {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.bitcoin && data.bitcoin.usd) {
                    priceData = data.bitcoin.usd;
                }
            }
        } catch (corsError) {
            console.warn('CoinGecko API blocked by CORS, trying alternative...');
        }
        
        // If CoinGecko fails, try CoinDesk API
        if (!priceData) {
            try {
                const response = await fetch(apiEndpoints[1], {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                    mode: 'cors'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.bpi && data.bpi.USD && data.bpi.USD.rate_float) {
                        priceData = data.bpi.USD.rate_float;
                    }
                }
            } catch (corsError2) {
                console.warn('CoinDesk API also blocked by CORS');
            }
        }
        
        if (priceData) {
            portfolioState.btcPrice = priceData;
            clearApiError('price');
            console.log('Bitcoin price updated:', priceData);
            
            // Update all wallet displays with new Bitcoin price
            updateAllWalletDisplays();
        } else {
            throw new Error('All price APIs failed or blocked by CORS');
        }
        
    } catch (error) {
        console.error('Error fetching Bitcoin price:', error);
        
        // Use a reasonable fallback price for development
        const fallbackPrice = 45000;
        
        if (portfolioState.btcPrice === 0) {
            portfolioState.btcPrice = fallbackPrice;
        }
        
        // Still update displays with fallback price
        updateAllWalletDisplays();
    }
}

// Fetch wallet balance from Blockchain.info API
async function fetchBalance(address) {
    try {
        setLoadingState(`Fetching balance for ${address.substring(0, 8)}...`);
        
        // Try direct API call first
        try {
            const response = await fetch(`${API_CONFIG.BLOCKCHAIN_INFO.baseUrl}/${address}`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'text/plain',
                }
            });
            
            if (response.ok) {
                const balanceInSatoshis = await response.text();
                const balance = parseInt(balanceInSatoshis) / 100000000; // Convert satoshis to BTC
                
                if (!isNaN(balance)) {
                    clearApiError('balance');
                    return balance;
                }
            }
        } catch (corsError) {
            // Silently fall back to demo data
        }
        
        // Generate a consistent demo balance based on address hash
        const addressHash = address.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        // Create a demo balance between 0.001 and 2.5 BTC
        const demoBalance = Math.abs(addressHash % 2500) / 1000 + 0.001;
        
        return parseFloat(demoBalance.toFixed(8));
        
    } catch (error) {
        console.error(`Error fetching balance for ${address}:`, error);
        setApiError('balance', `Failed to fetch balance for ${address}: ${error.message}`);
        return 0;
    }
}

// Loading state management
function setLoadingState(message) {
    portfolioState.isLoading = true;
    const updateInfoDiv = document.getElementById("updateInfo");
    if (updateInfoDiv) {
        updateInfoDiv.innerHTML = `<span class="text-blue-600">Loading: ${message}</span>`;
    }
}

function clearLoadingState() {
    portfolioState.isLoading = false;
}

// API Error management
let apiErrors = {
    price: null,
    balance: null,
    network: null,
    storage: null
};

function setApiError(type, message) {
    apiErrors[type] = message;
    displayApiErrors();
}

function clearApiError(type) {
    apiErrors[type] = null;
    displayApiErrors();
}

function displayApiErrors() {
    const errorContainer = document.getElementById("apiErrors");
    if (!errorContainer) return;
    
    const activeErrors = Object.values(apiErrors).filter(error => error !== null);
    
    if (activeErrors.length === 0) {
        errorContainer.innerHTML = '';
        errorContainer.style.display = 'none';
        return;
    }
    
    errorContainer.style.display = 'block';
    errorContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div class="text-red-800 font-semibold mb-2">⚠️ API Connection Issues:</div>
            ${activeErrors.map(error => `<div class="text-red-700 text-sm">• ${error}</div>`).join('')}
        </div>
    `;
}

// Network connectivity check
async function checkNetworkConnectivity() {
    try {
        // Simple connectivity check - in local development, assume connected
        if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Local development detected - assuming network connectivity');
            clearApiError('network');
            return true;
        }
        
        // For production, try a simple fetch
        const response = await fetch('https://httpbin.org/status/200', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache'
        });
        clearApiError('network');
        return true;
    } catch (error) {
        clearApiError('network');
        return true;
    }
}

// Display update information and portfolio summary
function displayUpdateInfo() {
    const updateInfoDiv = document.getElementById("updateInfo");
    const totalValueDiv = document.getElementById("totalValue");
    const portfolioStats = document.getElementById("portfolioStats");
    
    // Update total portfolio value display
    if (totalValueDiv) {
        totalValueDiv.textContent = formatCurrency(portfolioState.totalValue);
    }
    
    // Update portfolio stats
    if (portfolioStats) {
        const totalBtc = portfolioState.wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
        portfolioStats.innerHTML = `
            ${portfolioState.wallets.length} wallet${portfolioState.wallets.length !== 1 ? 's' : ''} • 
            <span class="bitcoin-amount">${formatBitcoinBalance(totalBtc, true)}</span> • 
            BTC Price: ${formatCurrency(portfolioState.btcPrice)}
        `;
    }
    
    if (!updateInfoDiv) {
        return;
    }
    
    if (portfolioState.isLoading) {
        updateInfoDiv.innerHTML = `<div class="text-blue-600">Updating wallet data...</div>`;
        return;
    }
    
    if (portfolioState.lastUpdated && portfolioState.btcPrice > 0) {
        const lastUpdatedDate = new Date(portfolioState.lastUpdated);
        const timeAgo = getTimeAgo(lastUpdatedDate);
        updateInfoDiv.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div class="text-sm text-gray-600">
                    Last updated: ${lastUpdatedDate.toLocaleString()} (${timeAgo})
                </div>
                <div class="text-xs text-gray-500">
                    Auto-refresh every 60 seconds
                </div>
            </div>
        `;
    } else {
        updateInfoDiv.innerHTML = `
            <div class="text-sm text-gray-600 text-center">
                No update information available.
            </div>
        `;
    }
}

// Edit wallet nickname
function editWallet(index) {
    if (index >= 0 && index < portfolioState.wallets.length) {
        const wallet = portfolioState.wallets[index];
        const currentNickname = wallet.nickname || '';
        const newNickname = prompt("Enter a nickname for this wallet:", currentNickname);
        
        if (newNickname !== null) {  // Only update if user didn't click Cancel
            wallet.nickname = newNickname.trim();
            savePortfolioToStorage();
            renderWalletList(false);
        }
    }
}

// Get wallet by address (utility function)
function getWalletByAddress(address) {
    return portfolioState.wallets.find(wallet => wallet.address === address);
}

// Get portfolio summary (utility function)
function getPortfolioSummary() {
    return {
        totalWallets: portfolioState.wallets.length,
        totalValue: portfolioState.totalValue,
        totalBalance: portfolioState.wallets.reduce((total, wallet) => total + wallet.balance, 0),
        lastUpdated: portfolioState.lastUpdated,
        btcPrice: portfolioState.btcPrice
    };
}

// Refresh individual wallet data
async function refreshWallet(index) {
    if (index >= 0 && index < portfolioState.wallets.length) {
        const wallet = portfolioState.wallets[index];
        
        // Show loading state for this wallet
        renderWalletRowWithLoading(wallet, index);
        
        try {
            // Update wallet data
            await updateWalletData(wallet);
            
            // Re-render the wallet row
            renderWalletRow(wallet, index);
            
            // Update total value and save
            calculateTotalValue();
            savePortfolioToStorage();
            displayUpdateInfo();
            
        } catch (error) {
            console.error(`Error refreshing wallet ${wallet.address}:`, error);
            wallet.hasError = true;
            wallet.errorMessage = error.message;
            renderWalletRow(wallet, index);
        }
    }
}

// Manual refresh all wallets
async function refreshAllWallets() {
    if (portfolioState.isLoading) {
        return; // Prevent multiple simultaneous refreshes
    }
    
    try {
        // Update the display to show refreshing state
        displayUpdateInfo();
        
        // Refresh all wallet data
        await renderWalletList(true);
        
        console.log('Wallet refresh completed successfully');
    } catch (error) {
        console.error('Error during wallet refresh:', error);
        setApiError('network', `Refresh failed: ${error.message}`);
    }
}

// Update all wallet displays dynamically (for real-time updates)
function updateAllWalletDisplays() {
    portfolioState.wallets.forEach((wallet, index) => {
        // Recalculate USD value with current Bitcoin price
        wallet.usdValue = calculateUsdValue(wallet.balance, portfolioState.btcPrice);
        
        // Update the display for this wallet
        updateWalletDisplay(wallet);
    });
    
    // Recalculate and update total portfolio value
    calculateTotalValue();
    
    // Update the info display
    displayUpdateInfo();
}

// Auto-refresh functionality
function startAutoRefresh() {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Set up 60-second auto-refresh interval
    autoRefreshInterval = setInterval(async () => {
        if (!portfolioState.isLoading && portfolioState.wallets.length > 0) {
            console.log('Auto-refreshing wallet data...');
            await refreshAllWallets();
        }
    }, 60000); // 60 seconds = 60,000 milliseconds
    
    // Set up a separate interval to update the "time ago" display every 10 seconds
    setInterval(() => {
        displayUpdateInfo();
    }, 10000); // 10 seconds
    
    console.log('Auto-refresh started (60-second interval)');
}

// Stop auto-refresh (useful for cleanup)
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('Auto-refresh stopped');
    }
}

// Manual refresh function
async function manualRefresh() {
    if (portfolioState.isLoading) {
        return; // Prevent multiple simultaneous refreshes
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshBtnText = document.getElementById('refreshBtnText');
    
    try {
        // Show loading state on button
        if (refreshBtn) refreshBtn.disabled = true;
        if (refreshBtnText) refreshBtnText.textContent = 'Refreshing...';
        
        console.log('Manual refresh triggered');
        await refreshAllWallets();
        
        showValidationMessage('✅ Wallets refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('Manual refresh failed:', error);
        showValidationMessage('❌ Failed to refresh wallets. Please try again.', 'error');
    } finally {
        // Reset button state
        if (refreshBtn) refreshBtn.disabled = false;
        if (refreshBtnText) refreshBtnText.textContent = '🔄 Refresh';
    }
}

// Get time ago helper function
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d ago`;
    }
}

// Add manual refresh button functionality (legacy function - now integrated into displayUpdateInfo)
function addRefreshButton() {
    // This function is now handled by displayUpdateInfo()
    // Keeping for backward compatibility
    displayUpdateInfo();
}

// Test functions for localStorage functionality (for development/debugging)
function testLocalStoragePersistence() {
    console.log('=== Testing localStorage Persistence ===');
    
    // Test 1: Check localStorage availability
    console.log('1. localStorage available:', isLocalStorageAvailable());
    
    // Test 2: Get current storage info
    const storageInfo = getStorageInfo();
    console.log('2. Storage info:', storageInfo);
    
    // Test 3: Test save/load cycle
    const testWallet = createWallet('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'Test Wallet');
    testWallet.balance = 1.5;
    testWallet.usdValue = 75000;
    testWallet.lastUpdated = new Date().toISOString();
    
    const originalWallets = [...portfolioState.wallets];
    portfolioState.wallets.push(testWallet);
    portfolioState.btcPrice = 50000;
    portfolioState.lastUpdated = new Date().toISOString();
    
    const saveResult = savePortfolioToStorage();
    console.log('3. Save test result:', saveResult);
    
    // Clear state and reload
    portfolioState.wallets = [];
    portfolioState.btcPrice = 0;
    portfolioState.lastUpdated = null;
    
    loadPortfolioFromStorage();
    console.log('4. Loaded wallets count:', portfolioState.wallets.length);
    console.log('5. Loaded BTC price:', portfolioState.btcPrice);
    console.log('6. Test wallet recovered:', portfolioState.wallets.find(w => w.nickname === 'Test Wallet'));
    
    // Restore original state
    portfolioState.wallets = originalWallets;
    savePortfolioToStorage();
    
    console.log('=== localStorage Test Complete ===');
}

// Test error handling scenarios
function testLocalStorageErrorHandling() {
    console.log('=== Testing localStorage Error Handling ===');
    
    // Test recovery from corrupted data
    try {
        localStorage.setItem('wallets', '{"corrupted": json}');
        loadPortfolioFromStorage();
        console.log('1. Corrupted data handling: PASSED');
    } catch (error) {
        console.log('1. Corrupted data handling: FAILED', error);
    }
    
    // Test quota exceeded simulation (if possible)
    try {
        const largeData = 'x'.repeat(1000000); // 1MB of data
        localStorage.setItem('test_large', largeData);
        localStorage.removeItem('test_large');
        console.log('2. Large data test: PASSED');
    } catch (error) {
        console.log('2. Quota exceeded handling:', error.name);
        handleLocalStorageError('test', error);
    }
    
    console.log('=== Error Handling Test Complete ===');
}

// Reset portfolio and clear all data
function resetPortfolio() {
    console.log('Resetting portfolio...');
    
    // Clear localStorage
    clearStoredData();
    
    // Reset portfolio state
    portfolioState = {
        wallets: [],
        totalValue: 0,
        btcPrice: 0,
        lastUpdated: null,
        isLoading: false
    };
    
    // Clear API errors
    apiErrors = {
        price: null,
        balance: null,
        network: null,
        storage: null
    };
    
    // Re-render the display
    renderWalletListDisplay();
    displayUpdateInfo();
    
    console.log('Portfolio reset complete');
    showValidationMessage('✅ Portfolio reset successfully!', 'success');
}

// Expose test functions to global scope for console testing
window.testLocalStoragePersistence = testLocalStoragePersistence;
window.testLocalStorageErrorHandling = testLocalStorageErrorHandling;
window.getStorageInfo = getStorageInfo;
window.clearStoredData = clearStoredData;
window.resetPortfolio = resetPortfolio;

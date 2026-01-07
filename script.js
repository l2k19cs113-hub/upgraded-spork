document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const periodInput = document.getElementById('periodInput');
    const resultCard = document.getElementById('resultCard');
    const loader = document.getElementById('loader');
    const predictionResult = document.getElementById('predictionResult');
    const betInfo = document.getElementById('betInfo');
    const winBtn = document.getElementById('winBtn');
    const lossBtn = document.getElementById('lossBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const historyTableBody = document.querySelector('#historyTable tbody');
    const totalProfitDisplay = document.getElementById('totalProfitDisplay');
    const totalWinsDisplay = document.getElementById('totalWinsDisplay');
    const walletInput = document.getElementById('walletInput');
    const currentBalanceDisplay = document.getElementById('currentBalanceDisplay');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Security Check: Redirect to login if not authenticated
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    const expiryWarning = document.querySelector('.expiry-warning');

    // Handle Expiration Logic
    if (currentUser && currentUser.reg_date && expiryWarning) {
        const regDate = new Date(currentUser.reg_date);
        const today = new Date();

        // Calculate difference in days
        const diffTime = today - regDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const remainingDays = 30 - diffDays;

        if (remainingDays <= 0) {
            expiryWarning.textContent = '⚠️ SESSION EXPIRED';
            expiryWarning.style.color = '#f43f5e';
            expiryWarning.style.borderColor = '#f43f5e';
            alert('Your session has expired. Please contact admin for renewal.');
            // Force logout
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        } else {
            expiryWarning.textContent = `⚠️ SESSION EXPIRES IN ${remainingDays} DAYS`;
        }
    }

    // Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (currentUser) {
                // Supabase Logout State Update
                if (window.sbHelpers) {
                    await window.sbHelpers.setLoginState(currentUser.phone, false);
                }
                localStorage.removeItem('currentUser');
            }
            window.location.href = 'index.html';
        });
    }

    // Strategy Rules: 1-based index mapped to array (0-11)
    const STRATEGY_RULES = [
        "RED",     // Step 1
        "BIG",     // Step 2
        "BIG",     // Step 3
        "RED",     // Step 4
        "SMALL",   // Step 5
        "BIG",     // Step 6
        "GREEN",   // Step 7
        "SMALL",   // Step 8
        "SMALL",   // Step 9
        "GREEN",   // Step 10
        "BIG",     // Step 11
        "SMALL"    // Step 12
    ];

    let currentStep = parseInt(localStorage.getItem('currentStep')) || 1;
    let currentPrediction = "";
    let currentPeriod = "";
    let cycleLoss = 0;
    let globalTotalProfit = parseFloat(localStorage.getItem('globalTotalProfit')) || 0;
    let globalTotalWins = parseInt(localStorage.getItem('globalTotalWins')) || 0;
    let baseWalletAmount = parseFloat(localStorage.getItem('baseWalletAmount')) || 0;

    if (walletInput) {
        walletInput.value = baseWalletAmount || '';
        walletInput.addEventListener('input', (e) => {
            baseWalletAmount = parseFloat(e.target.value) || 0;
            localStorage.setItem('baseWalletAmount', baseWalletAmount);
            updateSummaryDisplay();
        });
    }

    // Initial UI Update
    updateSummaryDisplay();

    startBtn.addEventListener('click', () => {
        const period = periodInput.value.trim();

        if (!period) {
            alert('Please enter a valid Period Number');
            return;
        }

        currentPeriod = period;

        // Reset UI
        resultCard.classList.remove('hidden');
        loader.classList.remove('hidden');
        predictionContent.classList.add('hidden');
        startBtn.disabled = true;
        startBtn.style.opacity = '0.7';

        // Simulate Analysis Delay
        setTimeout(() => {
            loader.classList.add('hidden');
            predictionContent.classList.remove('hidden');
            // Keep start disabled until they choose Win or Loss to enforce flow? 
            // Better to let them start a new one if they want, but usually flow is Period -> Result -> Win/Loss check -> Next Period.
            // Let's re-enable Start for flexibility, but hide the Win/Loss buttons if they start a new one without resolving?
            // Actually, keep buttons visible.
            startBtn.disabled = false;
            startBtn.style.opacity = '1';

            showPrediction();
        }, 10); // 0.01 seconds delay as requested
    });

    winBtn.addEventListener('click', () => {
        recordHistory("WIN");
        currentStep = 1; // Reset on Win
        cycleLoss = 0; // Reset cycle loss
        localStorage.setItem('currentStep', currentStep);
        updateUIState();
    });

    lossBtn.addEventListener('click', () => {
        recordHistory("LOSS");

        // Add the amount to cycleLoss if real bet was placed
        const amountUsed = determineBet(currentStep);
        cycleLoss += amountUsed;

        currentStep++; // Increment on Loss
        if (currentStep > 12) {
            currentStep = 1; // Loop back or stop? User didn't specify. Looping for safety.
            cycleLoss = 0; // Reset if we looped back? Usually yes, new cycle.
        }
        localStorage.setItem('currentStep', currentStep);
        updateUIState();
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the history log?')) {
            // Reset Variables
            historyTableBody.innerHTML = '';
            cycleLoss = 0;
            globalTotalWins = 0;
            globalTotalProfit = 0;
            currentStep = 1;

            // Reset LocalStorage
            localStorage.setItem('currentStep', 1);
            localStorage.setItem('globalTotalProfit', 0);
            localStorage.setItem('globalTotalWins', 0);

            // Reset UI
            if (resultCard) resultCard.classList.add('hidden');
            const predictionContent = document.getElementById('predictionContent');
            if (predictionContent) predictionContent.classList.add('hidden');

            updateSummaryDisplay();
        }
    });

    function determineBet(step) {
        // Find safe start step x so that sum of bets from x to 12 <= balance
        // Sum Formula: (3^(13-x) - 1) / 2
        const currentBalance = baseWalletAmount + globalTotalProfit;
        let safeStart = 12;
        for (let x = 1; x <= 12; x++) {
            const sumRequired = (Math.pow(3, 13 - x) - 1) / 2;
            if (sumRequired <= currentBalance) {
                safeStart = x;
                break;
            }
        }

        if (step < safeStart) return 0;
        return Math.pow(3, step - safeStart);
    }

    function showPrediction() {
        // Get prediction based on current step (subtract 1 for array index)
        const ruleIndex = (currentStep - 1) % STRATEGY_RULES.length;
        currentPrediction = STRATEGY_RULES[ruleIndex];

        predictionResult.textContent = currentPrediction;

        // Color Coding
        predictionResult.className = 'result-value'; // Reset
        if (currentPrediction === 'RED') predictionResult.classList.add('color-red');
        else if (currentPrediction === 'GREEN') predictionResult.classList.add('color-green');
        else if (currentPrediction === 'BIG') predictionResult.classList.add('color-big');
        else if (currentPrediction === 'SMALL') predictionResult.classList.add('color-small');

        // Dynamic Bet Calculation
        const betAmount = determineBet(currentStep);
        betInfo.textContent = betAmount > 0 ? `BET: ₹${betAmount}` : `BET: ₹0 (SAFE)`;
    }

    function recordHistory(status) {
        const amountUsed = determineBet(currentStep);

        let profit = 0;
        let profitClass = '';

        if (status === 'WIN') {
            // Formula: (Bet * 2) - Tax - Bet = Profit
            // With 2% tax: amountUsed * 0.98
            profit = amountUsed * 0.98;
            profitClass = 'status-win';
            globalTotalWins++;
        } else {
            profit = -amountUsed;
            profitClass = 'status-loss';
        }

        // Update Global Totals (Standard Ledger)
        // Global = Global + (Profit) - (Loss is negative profit so just + profit)
        // User rule: amount = amount + profit - loss (which implies summing signed values)
        globalTotalProfit += profit;
        localStorage.setItem('globalTotalProfit', globalTotalProfit);
        localStorage.setItem('globalTotalWins', globalTotalWins);
        updateSummaryDisplay();

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${currentPeriod}</td>
            <td>₹${amountUsed}</td>
            <td class="${profitClass}">₹${profit.toFixed(2)}</td>
            <td>${currentPrediction}</td>
            <td class="${status === 'WIN' ? 'status-win' : 'status-loss'}">${status}</td>
        `;
        historyTableBody.insertBefore(row, historyTableBody.firstChild);
    }

    function updateSummaryDisplay() {
        totalProfitDisplay.textContent = `₹${globalTotalProfit.toFixed(2)}`;
        totalWinsDisplay.textContent = globalTotalWins;

        const currentBalance = baseWalletAmount + globalTotalProfit;
        if (currentBalanceDisplay) {
            currentBalanceDisplay.textContent = `₹${currentBalance.toFixed(2)}`;
            currentBalanceDisplay.className = 'summary-value';
            if (currentBalance > baseWalletAmount) currentBalanceDisplay.classList.add('positive');
            else if (currentBalance < baseWalletAmount) currentBalanceDisplay.classList.add('negative');
        }

        // Style Total Profit
        totalProfitDisplay.className = 'summary-value';
        if (globalTotalProfit > 0) totalProfitDisplay.classList.add('positive');
        else if (globalTotalProfit < 0) totalProfitDisplay.classList.add('negative');
    }

    function updateUIState() {
        // Hide result card to force user to enter next period and click start?
        // Or just clear the result?
        // Let's hide the content but keep container to show "Ready for next".
        predictionContent.classList.add('hidden');
        resultCard.classList.add('hidden');

        // Optional: Auto-increment period number
        if (currentPeriod && !isNaN(currentPeriod)) {
            periodInput.value = parseInt(currentPeriod) + 1;
        }

        // Focus input
        periodInput.focus();
    }
});

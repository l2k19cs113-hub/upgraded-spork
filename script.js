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

    let currentStep = 1;
    let currentPrediction = "";
    let currentPeriod = "";
    let cycleLoss = 0; // Track accumulated losses in the current cycle
    let globalTotalProfit = 0;
    let globalTotalWins = 0;

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
        }, 10); // 0.01 seconds delay
    });

    winBtn.addEventListener('click', () => {
        recordHistory("WIN");
        currentStep = 1; // Reset on Win
        cycleLoss = 0; // Reset cycle loss
        updateUIState();
    });

    lossBtn.addEventListener('click', () => {
        recordHistory("LOSS");

        // Add the amount of the JUST finished round to cycleLoss
        // We need to recalculate it or store it.
        const baseAmount = 1;
        const amountUsed = baseAmount * Math.pow(3, currentStep - 1);
        cycleLoss += amountUsed;

        currentStep++; // Increment on Loss
        if (currentStep > 12) {
            currentStep = 1; // Loop back or stop? User didn't specify. Looping for safety.
            cycleLoss = 0; // Reset if we looped back? Usually yes, new cycle.
        }
        updateUIState();
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the history log?')) {
            historyTableBody.innerHTML = '';
            cycleLoss = 0;
            globalTotalProfit = 0;
            globalTotalWins = 0;
            updateSummaryDisplay();
        }
    });

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

        // Bet Amount Calculation: 3x Multiplier
        const baseAmount = 1;
        const betAmount = baseAmount * Math.pow(3, currentStep - 1);
        betInfo.textContent = `BET: ₹${betAmount}`;
    }

    function recordHistory(status) {
        const baseAmount = 1;
        const amountUsed = baseAmount * Math.pow(3, currentStep - 1);

        let profit = 0;
        let profitClass = '';

        if (status === 'WIN') {
            // Formula: (Bet * 2) - Bet = Bet
            // Simple PnL for this round.
            // Total Profit serves as the wallet accumulator.
            profit = amountUsed; // Assuming 2x payout (Revenue 2x - Bet 1x = Profit 1x)
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
        updateSummaryDisplay();

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${currentPeriod}</td>
            <td>₹${amountUsed}</td>
            <td class="${profitClass}">₹${profit}</td>
            <td>${currentPrediction}</td>
            <td class="${status === 'WIN' ? 'status-win' : 'status-loss'}">${status}</td>
        `;
        historyTableBody.insertBefore(row, historyTableBody.firstChild);
    }

    function updateSummaryDisplay() {
        totalProfitDisplay.textContent = `₹${globalTotalProfit}`;
        totalWinsDisplay.textContent = globalTotalWins;

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

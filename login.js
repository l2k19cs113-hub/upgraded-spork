// Login Page Logic

document.addEventListener('DOMContentLoaded', () => {
    const userTab = document.getElementById('userTab');
    const adminTab = document.getElementById('adminTab');
    const userForm = document.getElementById('userForm');
    const adminForm = document.getElementById('adminForm');
    const loginBtn = document.getElementById('loginBtn');

    // Tab Switching Logic
    userTab.addEventListener('click', () => {
        setActiveTab('user');
    });

    adminTab.addEventListener('click', () => {
        setActiveTab('admin');
    });

    function setActiveTab(type) {
        if (type === 'user') {
            userTab.classList.add('active');
            adminTab.classList.remove('active');
            userForm.classList.remove('hidden');
            adminForm.classList.add('hidden');
        } else {
            adminTab.classList.add('active');
            userTab.classList.remove('active');
            adminForm.classList.remove('hidden');
            userForm.classList.add('hidden');
        }
    }

    // Login logic
    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        if (userTab.classList.contains('active')) {
            // USER LOGIN CHECK
            const phone = document.getElementById('userPhone').value.trim();
            const pass = document.getElementById('userPass').value.trim();

            // Hardcoded Login for Specific Users
            if ((phone === '9524772443' && pass === 'bala') || (phone === '7305271675' && pass === 'ravi')) {
                const superUser = { phone: phone, pass: pass, isLoggedIn: true };
                localStorage.setItem('currentUser', JSON.stringify(superUser));
                window.location.href = 'game.html';
                return;
            }

            if (!phone || !pass) {
                showError('Fill all fields');
                return;
            }

            // Supabase Login
            if (window.sbHelpers) {
                const user = await window.sbHelpers.loginUser(phone, pass);

                if (user) {
                    if (user.isLoggedIn) {
                        showError('Already active on another device!');
                        return;
                    }

                    // Mark as Logged In in DB
                    await window.sbHelpers.setLoginState(user.phone, true);

                    // Login Success - Store in local session
                    user.isLoggedIn = true;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    window.location.href = 'game.html';
                } else {
                    showError('Invalid Phone or Password');
                }
            } else {
                showError('Database connecting...');
            }

        } else {
            // ADMIN LOGIN CHECK
            const key = document.getElementById('adminKey').value.trim();
            const pass = document.getElementById('adminPass').value.trim();

            if (!key || !pass) {
                showError('Fill all fields');
                return;
            }

            // Hardcoded Admin Credentials
            if (key === 'adminbala' && pass === 'krish0@') {
                window.location.href = 'admin.html';
            } else {
                showError('Invalid Admin Credentials');
            }
        }
    });

    function showError(msg) {
        const originalText = loginBtn.innerText;
        loginBtn.innerText = msg;
        loginBtn.style.background = 'var(--result-red)';
        setTimeout(() => {
            loginBtn.innerText = 'LOGIN NOW';
            loginBtn.style.background = 'linear-gradient(135deg, var(--accent-color), #2563eb)';
        }, 1500);
    }

    // Reset styles on input
    const allInputs = document.querySelectorAll('input');
    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            input.style.borderColor = 'var(--accent-color)';
        });
    });

    // Payment Button Logic
    const paymentBtn = document.getElementById('paymentBtn');
    if (paymentBtn) {
        paymentBtn.addEventListener('click', () => {
            window.location.href = 'payment.html';
        });
    }
});

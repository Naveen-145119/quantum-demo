// UI Navigation and Helper Functions

window.showMain = function() {
    hideAllScreens();
    document.getElementById('mainMenu').classList.add('active');
}

window.showRegister = function() {
    hideAllScreens();
    document.getElementById('registerScreen').classList.add('active');
    document.getElementById('registerForm').reset();
}

window.showLogin = function() {
    hideAllScreens();
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('loginForm').reset();
}

window.showDashboard = function() {
    hideAllScreens();
    document.getElementById('dashboardScreen').classList.add('active');
    document.getElementById('dashboardUser').textContent = currentUser.name || currentUser.email;
}

window.showCreateVault = function() {
    hideAllScreens();
    document.getElementById('createVaultScreen').classList.add('active');
    document.getElementById('createVaultForm').reset();
}

window.showVaultAuth = function() {
    hideAllScreens();
    document.getElementById('vaultAuthScreen').classList.add('active');
    document.getElementById('vaultAuthForm').reset();
}

window.showUpload = function() {
    hideAllScreens();
    document.getElementById('uploadScreen').classList.add('active');
}

window.hideAllScreens = function() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

window.showLoading = function(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

window.showToast = function(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize UI Event Listeners
window.initUIListeners = function() {
    // Main Menu Buttons
    const btnRegister = document.getElementById('btn-show-register');
    if (btnRegister) btnRegister.addEventListener('click', showRegister);

    const btnLogin = document.getElementById('btn-show-login');
    if (btnLogin) btnLogin.addEventListener('click', showLogin);

    // Back/Cancel/Close Buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', showMain);
    });

    document.querySelectorAll('.btn-dashboard').forEach(btn => {
        btn.addEventListener('click', showDashboard);
    });

    // Logout Buttons
    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.handleLogout) window.handleLogout();
        });
    });

    // Dashboard Actions
    const btnOpenVault = document.getElementById('btn-open-vault');
    if (btnOpenVault) {
        btnOpenVault.addEventListener('click', () => {
            if (window.handleOpenVault) window.handleOpenVault();
        });
    }

    // Upload Actions
    const btnUpload = document.getElementById('uploadBtn');
    if (btnUpload) {
        btnUpload.addEventListener('click', () => {
            if (window.handleSecureUpload) window.handleSecureUpload();
        });
    }

    // File Inputs
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (window.handleFileSelect) window.handleFileSelect(e);
        });
    }

    const folderInput = document.getElementById('folderInput');
    if (folderInput) {
        folderInput.addEventListener('change', (e) => {
            if (window.handleFileSelect) window.handleFileSelect(e);
        });
    }

    // Forms
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            if (window.handleRegister) window.handleRegister(e);
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            if (window.handleLogin) window.handleLogin(e);
        });
    }

    const createVaultForm = document.getElementById('createVaultForm');
    if (createVaultForm) {
        createVaultForm.addEventListener('submit', (e) => {
            if (window.handleCreateVault) window.handleCreateVault(e);
        });
    }

    const vaultAuthForm = document.getElementById('vaultAuthForm');
    if (vaultAuthForm) {
        vaultAuthForm.addEventListener('submit', (e) => {
            if (window.handleVaultUnlock) window.handleVaultUnlock(e);
        });
    }
}

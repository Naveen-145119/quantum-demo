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
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

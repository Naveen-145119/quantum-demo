// Authentication and Vault Logic

// Initialize Appwrite
window.initAppwrite = function() {
    try {
        if (typeof APPWRITE_CONFIG === 'undefined') {
            throw new Error('Appwrite configuration is missing. Please check appwrite-config.js.');
        }

        window.client = new Appwrite.Client()
            .setEndpoint(APPWRITE_CONFIG.endpoint)
            .setProject(APPWRITE_CONFIG.projectId);

        window.account = new Appwrite.Account(client);
        window.databases = new Appwrite.Databases(client);
        window.storage = new Appwrite.Storage(client);

        console.log('Appwrite initialized successfully');
        checkSession();
    } catch (error) {
        showToast('Failed to initialize app. Please check configuration.', 'error');
        console.error('Appwrite initialization error:', error);
    }
}

// Check if user is already logged in
window.checkSession = async function() {
    try {
        const session = await account.get();
        if (session) {
            window.currentUser = session;
            showDashboard();
        }
    } catch (error) {
        // No active session, stay on main menu
        console.log('No active session');
    }
}

// Registration Handler
window.handleRegister = async function(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const email = document.getElementById('regEmail').value;
    const mobile = document.getElementById('regMobile').value;

    showLoading(true);

    try {
        // Create account in Appwrite
        const userId = Appwrite.ID.unique();
        await account.create(userId, email, password, username);

        // Store additional user data in database
        await databases.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.userDataCollectionId,
            userId,
            {
                username: username,
                email: email,
                mobile: mobile,
                registeredAt: new Date().toISOString()
            }
        );

        showToast('Registration successful! Please login.', 'success');
        showLogin();
    } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Login Handler
window.handleLogin = async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoading(true);

    try {
        // Create email session
        await account.createEmailPasswordSession(email, password);
        
        // Get current user
        window.currentUser = await account.get();
        
        showToast(`Welcome back, ${currentUser.name}!`, 'success');
        showDashboard();
    } catch (error) {
        console.error('Login error:', error);
        showToast('Invalid credentials. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Logout Handler
window.handleLogout = async function() {
    try {
        await account.deleteSession('current');
        window.currentUser = null;
        window.selectedFile = null;
        showToast('Logged out successfully', 'info');
        showMain();
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
}

// Dashboard Actions
window.handleOpenVault = function() {
    if (currentUser.prefs && currentUser.prefs.vaultHash) {
        showVaultAuth();
    } else {
        showCreateVault();
    }
}

// Create Vault Handler
window.handleCreateVault = async function(event) {
    event.preventDefault();
    const pass = document.getElementById('newVaultPass').value;
    const confirmPass = document.getElementById('confirmVaultPass').value;

    if (pass !== confirmPass) {
        showToast('Passphrases do not match', 'error');
        return;
    }

    showLoading(true);

    try {
        // Hash the vault passphrase
        const vaultHash = await quantumCrypto.hashPassphrase(pass);

        // Store vault hash in user preferences
        await account.updatePrefs({ vaultHash: vaultHash });
        
        // Update local user object
        window.currentUser = await account.get();

        showToast('Vault created successfully!', 'success');
        showUpload();
        loadUserFiles();
    } catch (error) {
        console.error('Create vault error:', error);
        showToast('Failed to create vault', 'error');
    } finally {
        showLoading(false);
    }
}

// Vault Unlock Handler
window.handleVaultUnlock = async function(event) {
    event.preventDefault();
    const enteredPass = document.getElementById('vaultPass').value;
    
    showLoading(true);
    
    try {
        const enteredHash = await quantumCrypto.hashPassphrase(enteredPass);
        
        if (enteredHash === currentUser.prefs.vaultHash) {
            showToast('Vault Unlocked!', 'success');
            showUpload();
            loadUserFiles();
        } else {
            showToast('Incorrect passphrase', 'error');
            document.getElementById('vaultPass').value = '';
        }
    } catch (error) {
        console.error('Vault unlock error:', error);
        showToast('Error unlocking vault', 'error');
    } finally {
        showLoading(false);
    }
}

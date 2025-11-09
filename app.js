// Main Application Logic with Appwrite Integration

let client, account, databases, storage;
let currentUser = null;
let selectedFile = null;

// Initialize Appwrite
function initAppwrite() {
    try {
        client = new Appwrite.Client()
            .setEndpoint(APPWRITE_CONFIG.endpoint)
            .setProject(APPWRITE_CONFIG.projectId);

        account = new Appwrite.Account(client);
        databases = new Appwrite.Databases(client);
        storage = new Appwrite.Storage(client);

        console.log('Appwrite initialized successfully');
        checkSession();
    } catch (error) {
        showToast('Failed to initialize app. Please check configuration.', 'error');
        console.error('Appwrite initialization error:', error);
    }
}

// Check if user is already logged in
async function checkSession() {
    try {
        const session = await account.get();
        if (session) {
            currentUser = session;
            showUpload();
            loadUserFiles();
        }
    } catch (error) {
        // No active session, stay on main menu
        console.log('No active session');
    }
}

// Screen Navigation
function showMain() {
    hideAllScreens();
    document.getElementById('mainMenu').classList.add('active');
}

function showRegister() {
    hideAllScreens();
    document.getElementById('registerScreen').classList.add('active');
    document.getElementById('registerForm').reset();
}

function showLogin() {
    hideAllScreens();
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('loginForm').reset();
}

function showUpload() {
    hideAllScreens();
    document.getElementById('uploadScreen').classList.add('active');
    document.getElementById('currentUser').textContent = currentUser.name || currentUser.email;
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

// Registration Handler
async function handleRegister(event) {
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
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoading(true);

    try {
        // Create email session
        await account.createEmailPasswordSession(email, password);
        
        // Get current user
        currentUser = await account.get();
        
        showToast(`Welcome back, ${currentUser.name}!`, 'success');
        showUpload();
        loadUserFiles();
    } catch (error) {
        console.error('Login error:', error);
        showToast('Invalid credentials. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Logout Handler
async function handleLogout() {
    try {
        await account.deleteSession('current');
        currentUser = null;
        selectedFile = null;
        showToast('Logged out successfully', 'info');
        showMain();
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
}

// File Selection Handler
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.name.endsWith('.txt')) {
            showToast('Please select a text file (.txt)', 'error');
            event.target.value = '';
            return;
        }
        selectedFile = file;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('uploadBtn').disabled = false;
    }
}

// Secure Upload Handler
async function handleSecureUpload() {
    if (!selectedFile) {
        showToast('Please select a file first', 'error');
        return;
    }

    showLoading(true);
    const statusEl = document.getElementById('uploadStatus');
    statusEl.className = 'status-message';
    statusEl.style.display = 'none';

    try {
        // Step 1: Generate quantum-inspired encryption key
        const encryptionKey = await quantumCrypto.generateQuantumKey();
        const keyString = await quantumCrypto.exportKey(encryptionKey);

        // Step 2: Encrypt the file
        const encryptedData = await quantumCrypto.encryptFile(selectedFile, encryptionKey);
        
        // Create a new File object with encrypted data
        const encryptedFile = new File(
            [encryptedData], 
            `${selectedFile.name}.enc`,
            { type: 'application/octet-stream' }
        );

        // Step 3: Upload to Appwrite Storage
        const fileId = Appwrite.ID.unique();
        const uploadResult = await storage.createFile(
            APPWRITE_CONFIG.bucketId,
            fileId,
            encryptedFile
        );

        // Step 4: Store encryption key in database (linked to user and file)
        await databases.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.encryptionKeysCollectionId,
            Appwrite.ID.unique(),
            {
                userId: currentUser.$id,
                fileId: fileId,
                fileName: selectedFile.name,
                encryptionKey: keyString,
                uploadedAt: new Date().toISOString()
            }
        );

        // Success!
        statusEl.textContent = '✅ File encrypted and uploaded successfully!';
        statusEl.classList.add('success', 'show');
        showToast('Encrypted successfully!', 'success');

        // Reset file input
        document.getElementById('fileInput').value = '';
        selectedFile = null;
        document.getElementById('fileName').textContent = 'Select a text file to upload securely';
        document.getElementById('uploadBtn').disabled = true;

        // Reload file list
        loadUserFiles();

    } catch (error) {
        console.error('Upload error:', error);
        statusEl.textContent = '❌ Upload failed. Please try again.';
        statusEl.classList.add('error', 'show');
        showToast('Upload failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Load User's Encrypted Files
async function loadUserFiles() {
    if (!currentUser) return;

    try {
        const response = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.encryptionKeysCollectionId,
            [
                Appwrite.Query.equal('userId', currentUser.$id),
                Appwrite.Query.orderDesc('uploadedAt')
            ]
        );

        const filesListEl = document.getElementById('filesList');
        
        if (response.documents.length === 0) {
            filesListEl.innerHTML = '<p style="color: #888; text-align: center;">No files uploaded yet</p>';
            return;
        }

        filesListEl.innerHTML = response.documents.map(doc => {
            const date = new Date(doc.uploadedAt).toLocaleString();
            return `
                <div class="file-item">
                    <div class="file-item-info">
                        <div class="file-item-name">🔒 ${doc.fileName}</div>
                        <div class="file-item-meta">Uploaded: ${date}</div>
                    </div>
                    <div class="file-item-actions">
                        <button class="btn btn-primary btn-small" onclick="downloadFile('${doc.fileId}', '${doc.$id}', '${doc.fileName}')">
                            Download
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading files:', error);
    }
}

// Download and Decrypt File
async function downloadFile(fileId, keyDocId, originalFileName) {
    showLoading(true);

    try {
        // Get the encryption key
        const keyDoc = await databases.getDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.encryptionKeysCollectionId,
            keyDocId
        );

        // Download encrypted file from storage using the SDK's built-in method
        // This ensures proper authentication headers are included
        const response = await fetch(
            storage.getFileDownload(APPWRITE_CONFIG.bucketId, fileId),
            {
                headers: {
                    'Authorization': `Bearer ${(await account.get()).$id}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        const encryptedData = await response.arrayBuffer();

        // Import the encryption key
        const key = await quantumCrypto.importKey(keyDoc.encryptionKey);

        // Decrypt the file
        const decryptedData = await quantumCrypto.decryptFile(new Uint8Array(encryptedData), key);

        // Create a blob and download
        const blob = new Blob([decryptedData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('File decrypted and downloaded!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Failed to download file: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// UI Helper Functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    initAppwrite();
});

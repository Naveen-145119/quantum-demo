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
    const files = event.target.files;
    if (files && files.length > 0) {
        selectedFile = files;
        const fileCount = files.length;
        const fileName = fileCount === 1 ? files[0].name : `${fileCount} files selected`;
        document.getElementById('fileName').textContent = `✅ ${fileName}`;
        document.getElementById('uploadBtn').disabled = false;
    }
}

// Secure Upload Handler
async function handleSecureUpload() {
    if (!selectedFile || selectedFile.length === 0) {
        showToast('Please select files first', 'error');
        return;
    }

    showLoading(true);
    const statusEl = document.getElementById('uploadStatus');
    statusEl.className = 'status-message';
    statusEl.style.display = 'none';

    try {
        let uploadCount = 0;
        let errorCount = 0;

        // Generate ONE encryption key for all files
        const encryptionKey = await quantumCrypto.generateQuantumKey();
        const keyString = await quantumCrypto.exportKey(encryptionKey);

        // Upload each file
        for (let i = 0; i < selectedFile.length; i++) {
            const file = selectedFile[i];
            
            try {
                // Encrypt the file
                const encryptedData = await quantumCrypto.encryptFile(file, encryptionKey);
                
                // Create a new File object with encrypted data
                const encryptedFile = new File(
                    [encryptedData], 
                    `${file.name}.enc`,
                    { type: 'application/octet-stream' }
                );

                // Upload to Appwrite Storage
                const fileId = Appwrite.ID.unique();
                await storage.createFile(
                    APPWRITE_CONFIG.bucketId,
                    fileId,
                    encryptedFile
                );

                // Store encryption key in database (linked to user and file)
                await databases.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.encryptionKeysCollectionId,
                    Appwrite.ID.unique(),
                    {
                        userId: currentUser.$id,
                        fileId: fileId,
                        fileName: file.name,
                        filePath: file.webkitRelativePath || file.name, // Preserve folder structure
                        fileSize: file.size,
                        fileType: file.type,
                        encryptionKey: keyString,
                        uploadedAt: new Date().toISOString()
                    }
                );

                uploadCount++;
            } catch (fileError) {
                console.error(`Failed to upload ${file.name}:`, fileError);
                errorCount++;
            }
        }

        // Success!
        const message = errorCount === 0 
            ? `✅ ${uploadCount} file(s) encrypted and uploaded successfully!`
            : `⚠️ ${uploadCount} file(s) uploaded, ${errorCount} failed.`;
        
        statusEl.textContent = message;
        statusEl.classList.add('success', 'show');
        showToast(`Uploaded ${uploadCount} file(s)!`, 'success');

        // Reset file input
        document.getElementById('fileInput').value = '';
        selectedFile = null;
        document.getElementById('fileName').textContent = '📁 Select files or folders to upload securely';
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
            // Get file extension to show appropriate icon
            const ext = doc.fileName.split('.').pop().toLowerCase();
            let icon = '📄';
            if (['pdf'].includes(ext)) icon = '📕';
            if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) icon = '📦';
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext)) icon = '🖼️';
            if (['mp4', 'mov', 'avi', 'mkv', 'flv'].includes(ext)) icon = '🎥';
            if (['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext)) icon = '🎵';
            if (['txt', 'doc', 'docx'].includes(ext)) icon = '📝';
            
            const fileSize = doc.fileSize ? `(${(doc.fileSize / 1024).toFixed(2)} KB)` : '';
            const filePath = doc.filePath ? `<div class="file-item-path">${doc.filePath}</div>` : '';
            
            return `
                <div class="file-item">
                    <div class="file-item-info">
                        <div class="file-item-name">${icon} ${doc.fileName}</div>
                        ${filePath}
                        <div class="file-item-meta">Uploaded: ${date} ${fileSize}</div>
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

        // Use Appwrite's getFileView instead of getFileDownload (handles CORS properly)
        // View will return the file content with proper CORS headers
        const fileUrl = storage.getFileView(APPWRITE_CONFIG.bucketId, fileId);
        
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        const encryptedData = await response.arrayBuffer();

        // Import the encryption key
        const key = await quantumCrypto.importKey(keyDoc.encryptionKey);

        // Decrypt the file
        const decryptedData = await quantumCrypto.decryptFile(new Uint8Array(encryptedData), key);

        // Determine correct MIME type based on file extension
        const ext = originalFileName.split('.').pop().toLowerCase();
        let mimeType = 'application/octet-stream'; // Default
        
        const mimeTypes = {
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'json': 'application/json',
            'xml': 'application/xml',
            'csv': 'text/csv',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'mp4': 'video/mp4',
            'mp3': 'audio/mpeg',
            'zip': 'application/zip'
        };
        
        mimeType = mimeTypes[ext] || mimeType;

        // Create a blob with correct MIME type and download
        const blob = new Blob([decryptedData], { type: mimeType });
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

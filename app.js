// Main Application Logic with Appwrite Integration

let client, account, databases, storage;
let currentUser = null;
let selectedFile = null;

const MIME_TYPES = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip'
};

function parseEncryptionMetadata(value) {
    if (!value) {
        return { key: null };
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object' && parsed.key) {
                return {
                    key: parsed.key,
                    originalName: parsed.originalName || null,
                    mimeType: parsed.mimeType || '',
                    size: typeof parsed.size === 'number' ? parsed.size : null,
                    path: parsed.path || null,
                    uploadedAt: parsed.uploadedAt || null
                };
            }
        } catch (err) {
            // Value is a plain key string (legacy format)
        }
        return { key: value };
    }

    return { key: value };
}

function formatFileSize(bytes) {
    if (typeof bytes !== 'number' || Number.isNaN(bytes)) {
        return '';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    const precision = unitIndex === 0 ? 0 : 1;
    return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function getFileIcon(extension, mimeType = '') {
    const ext = (extension || '').toLowerCase();
    if (['pdf'].includes(ext)) return '📕';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext) || mimeType.startsWith('image/')) return '🖼️';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext) || mimeType.startsWith('video/')) return '🎥';
    if (['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext) || mimeType.startsWith('audio/')) return '🎵';
    if (['txt', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'json', 'xml'].includes(ext)) return '📝';
    return '📄';
}

function inferMimeType(fileName, fallback = 'application/octet-stream') {
    if (!fileName) return fallback;
    const ext = fileName.split('.').pop();
    if (!ext) return fallback;
    return MIME_TYPES[ext.toLowerCase()] || fallback;
}

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
        const errorDetails = [];
        const files = selectedFile;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                // Generate a unique key per file for stronger security
                const encryptionKey = await quantumCrypto.generateQuantumKey();
                const keyString = await quantumCrypto.exportKey(encryptionKey);

                // Encrypt file contents in the browser
                const encryptedData = await quantumCrypto.encryptFile(file, encryptionKey);

                // Create encrypted file blob for upload
                const encryptedFile = new File(
                    [encryptedData],
                    `${file.name}.enc`,
                    { type: 'application/octet-stream' }
                );

                // Upload encrypted file to Appwrite Storage
                const fileId = Appwrite.ID.unique();
                await storage.createFile(
                    APPWRITE_CONFIG.bucketId,
                    fileId,
                    encryptedFile
                );

                const uploadedAt = new Date().toISOString();
                const metadata = {
                    key: keyString,
                    originalName: file.name,
                    mimeType: file.type || '',
                    size: file.size,
                    path: file.webkitRelativePath || null,
                    uploadedAt
                };

                // Store metadata and encryption key (as JSON) for this file
                await databases.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.encryptionKeysCollectionId,
                    Appwrite.ID.unique(),
                    {
                        userId: currentUser.$id,
                        fileId,
                        fileName: file.name,
                        encryptionKey: JSON.stringify(metadata),
                        uploadedAt
                    }
                );

                uploadCount++;
            } catch (fileError) {
                console.error(`Failed to upload ${file.name}:`, fileError);
                errorDetails.push(`${file.name}: ${fileError.message || fileError}`);
            }
        }

        if (uploadCount > 0) {
            statusEl.textContent = `✅ ${uploadCount} file(s) encrypted and uploaded successfully!`;
            statusEl.classList.add('success', 'show');
            showToast(`Uploaded ${uploadCount} file(s)!`, 'success');
        }

        if (errorDetails.length > 0) {
            const errorMessage = `⚠️ Failed uploads: ${errorDetails.join(', ')}`;
            statusEl.textContent = statusEl.textContent
                ? `${statusEl.textContent}\n${errorMessage}`
                : errorMessage;
            statusEl.classList.remove('success');
            statusEl.classList.add('error', 'show');
            showToast(
                uploadCount === 0
                    ? 'Upload failed. Please review the errors.'
                    : 'Some files failed to upload. Check details.',
                'error'
            );
        }

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
            const metadata = parseEncryptionMetadata(doc.encryptionKey);
            const originalName = metadata.originalName || doc.fileName;
            const displayPath = metadata.path && metadata.path !== originalName
                ? metadata.path
                : null;
            const sizeLabel = typeof metadata.size === 'number'
                ? `(${formatFileSize(metadata.size)})`
                : '';

            const ext = (originalName.split('.').pop() || '').toLowerCase();
            const icon = getFileIcon(ext, metadata.mimeType);
            const pathHtml = displayPath ? `<div class="file-item-path">${displayPath}</div>` : '';

            return `
                <div class="file-item">
                    <div class="file-item-info">
                        <div class="file-item-name">${icon} ${originalName}</div>
                        ${pathHtml}
                        <div class="file-item-meta">Uploaded: ${date} ${sizeLabel}</div>
                    </div>
                    <div class="file-item-actions">
                        <button class="btn btn-primary btn-small" onclick="downloadFile('${doc.$id}')">
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
async function downloadFile(keyDocId) {
    showLoading(true);

    try {
        // Get the encryption key
        const keyDoc = await databases.getDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.encryptionKeysCollectionId,
            keyDocId
        );
        const metadata = parseEncryptionMetadata(keyDoc.encryptionKey);
        const encryptionKeyString = metadata.key;
        const originalFileName = metadata.originalName || keyDoc.fileName;
        const displayName = metadata.path || originalFileName;
        const mimeType = metadata.mimeType || inferMimeType(originalFileName);
        const fileId = keyDoc.fileId;

        if (!encryptionKeyString) {
            throw new Error('Missing encryption key metadata.');
        }

        if (!fileId) {
            throw new Error('File reference not found.');
        }

        // Use Appwrite's getFileView instead of getFileDownload (handles CORS properly)
        // View will return the file content with proper CORS headers
        const fileUrl = storage.getFileView(APPWRITE_CONFIG.bucketId, fileId);
        
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        const encryptedData = await response.arrayBuffer();

        // Import the encryption key
        const key = await quantumCrypto.importKey(encryptionKeyString);

        // Decrypt the file
        const decryptedData = await quantumCrypto.decryptFile(new Uint8Array(encryptedData), key);

        // Create a blob with correct MIME type and download
        const blob = new Blob([decryptedData], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Browsers ignore path separators in download names, but we replace them to avoid issues
        a.download = displayName ? displayName.replace(/[\\/]+/g, '_') : originalFileName;
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

// Main Application Logic with Appwrite Integration

let client, account, databases, storage;
let currentUser = null;
let selectedFiles = [];

const PBKDF_ITERATIONS = 310000;
const PBKDF_KEY_LENGTH_BITS = 256;
const VAULT_SALT_BYTES = 16;

const vaultState = {
    masterKey: null,
    salt: null,
    verifier: null,
    userDoc: null,
    mode: null,
    modalResolve: null,
    modalReject: null,
    modalPromise: null,
    isOpen: false
};

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
        return { version: 0, key: null };
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);

            if (parsed && typeof parsed === 'object') {
                if (parsed.version === 2 && parsed.payload && parsed.iv) {
                    return {
                        version: 2,
                        payload: parsed.payload,
                        iv: parsed.iv,
                        uploadedAt: parsed.uploadedAt || null
                    };
                }

                if (parsed.key) {
                    return {
                        version: 1,
                        key: parsed.key,
                        originalName: parsed.originalName || null,
                        mimeType: parsed.mimeType || '',
                        size: typeof parsed.size === 'number' ? parsed.size : null,
                        path: parsed.path || null,
                        uploadedAt: parsed.uploadedAt || null
                    };
                }
            }
        } catch (err) {
            // Value is a plain key string (legacy format)
        }
        return { version: 0, key: value };
    }

    return { version: 0, key: value };
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

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value).replace(/[&<>":']/g, match => {
        switch (match) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case '\'': return '&#39;';
            case ':': return '&#58;';
            default: return match;
        }
    });
}

function toBase64(buffer) {
    return quantumCrypto.arrayBufferToBase64(buffer instanceof ArrayBuffer ? buffer : buffer.buffer);
}

function fromBase64(base64) {
    return new Uint8Array(quantumCrypto.base64ToArrayBuffer(base64));
}

function resetVaultState() {
    vaultState.masterKey = null;
    vaultState.salt = null;
    vaultState.verifier = null;
    vaultState.mode = null;
    vaultState.modalResolve = null;
    vaultState.modalReject = null;
    vaultState.modalPromise = null;
    vaultState.isOpen = false;
}

async function initializeVaultState() {
    if (!currentUser) return;

    try {
        const userDoc = await databases.getDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.userDataCollectionId,
            currentUser.$id
        );
        vaultState.userDoc = userDoc;
        vaultState.salt = userDoc.vaultSalt || null;
        vaultState.verifier = userDoc.vaultVerifier || null;
    } catch (error) {
        console.error('Failed to load user vault profile:', error);
        showToast('Unable to load user vault configuration.', 'error');
    }
}

async function ensureVaultReady() {
    if (vaultState.masterKey) {
        return true;
    }

    if (!vaultState.userDoc) {
        await initializeVaultState();
    }

    const unlocked = await openVaultModal();
    return Boolean(unlocked && vaultState.masterKey);
}

function openVaultModal() {
    if (vaultState.isOpen) {
        return vaultState.modalPromise;
    }

    const mode = vaultState.salt && vaultState.verifier ? 'unlock' : 'create';
    vaultState.mode = mode;

    const modal = document.getElementById('vaultModal');
    const title = document.getElementById('vaultModalTitle');
    const description = document.getElementById('vaultModalDescription');
    const confirmGroup = document.getElementById('vaultConfirmGroup');
    const submitButton = document.getElementById('vaultSubmitButton');
    const errorEl = document.getElementById('vaultError');

    if (!modal || !title || !description || !submitButton || !errorEl) {
        console.error('Vault modal elements missing in DOM.');
        alert('Vault interface is unavailable.');
        return Promise.resolve(false);
    }

    errorEl.textContent = '';
    const passEl = document.getElementById('vaultPassphrase');
    const confirmEl = document.getElementById('vaultPassphraseConfirm');

    if (passEl) {
        passEl.value = '';
        passEl.focus();
    }
    if (confirmEl) {
        confirmEl.value = '';
    }

    if (mode === 'unlock') {
        title.textContent = 'Unlock Secure Vault';
        description.textContent = 'Enter your vault passphrase to access encrypted files.';
        if (confirmGroup) {
            confirmGroup.style.display = 'none';
        }
        if (confirmEl) {
            confirmEl.required = false;
        }
        submitButton.textContent = 'Unlock';
    } else {
        title.textContent = 'Create Vault Passphrase';
        description.textContent = 'Set a strong passphrase. You must remember it to access your encrypted files.';
        if (confirmGroup) {
            confirmGroup.style.display = 'block';
        }
        if (confirmEl) {
            confirmEl.required = true;
        }
        submitButton.textContent = 'Create Vault';
    }

    modal.classList.add('active');
    vaultState.isOpen = true;

    vaultState.modalPromise = new Promise((resolve) => {
        vaultState.modalResolve = resolve;
    });

    return vaultState.modalPromise;
}

function hideVaultModal() {
    const modal = document.getElementById('vaultModal');
    if (modal) {
        modal.classList.remove('active');
    }
    vaultState.isOpen = false;
    vaultState.modalPromise = null;
}

function displayVaultError(message) {
    const errorEl = document.getElementById('vaultError');
    if (errorEl) {
        errorEl.textContent = message;
    }
}

async function deriveMasterKey(passphrase, saltBase64) {
    const enc = new TextEncoder();
    const salt = saltBase64 ? fromBase64(saltBase64) : crypto.getRandomValues(new Uint8Array(VAULT_SALT_BYTES));

    const passphraseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF_ITERATIONS,
            hash: 'SHA-256'
        },
        passphraseKey,
        PBKDF_KEY_LENGTH_BITS
    );

    const derivedBytes = new Uint8Array(derivedBits);
    const masterKey = await crypto.subtle.importKey(
        'raw',
        derivedBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );

    const verifierBytes = await crypto.subtle.digest('SHA-256', derivedBytes);
    const verifier = toBase64(verifierBytes);

    return {
        masterKey,
        saltBase64: toBase64(salt.buffer),
        verifier
    };
}

async function vaultEncryptObject(obj) {
    if (!vaultState.masterKey) {
        throw new Error('Vault is locked.');
    }

    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const payload = encoder.encode(JSON.stringify(obj));

    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv
        },
        vaultState.masterKey,
        payload
    );

    return {
        payload: toBase64(encrypted),
        iv: toBase64(iv.buffer)
    };
}

async function vaultDecryptObject(meta) {
    if (!vaultState.masterKey) {
        throw new Error('Vault is locked.');
    }

    const decoder = new TextDecoder();
    const iv = fromBase64(meta.iv);
    const ciphertext = fromBase64(meta.payload);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv
        },
        vaultState.masterKey,
        ciphertext
    );

    return JSON.parse(decoder.decode(new Uint8Array(decrypted)));
}

async function handleVaultSubmit(event) {
    event.preventDefault();

    const passphraseInput = document.getElementById('vaultPassphrase');
    const confirmInput = document.getElementById('vaultPassphraseConfirm');
    const errorEl = document.getElementById('vaultError');

    if (!passphraseInput || !errorEl) {
        return;
    }

    const passphrase = passphraseInput.value.trim();
    const mode = vaultState.mode || 'unlock';

    if (passphrase.length < 8) {
        displayVaultError('Passphrase must be at least 8 characters.');
        return;
    }

    if (mode === 'create') {
        if (!confirmInput) {
            displayVaultError('Confirmation input missing.');
            return;
        }
        if (passphrase !== confirmInput.value.trim()) {
            displayVaultError('Passphrases do not match.');
            return;
        }
    }

    try {
        if (mode === 'unlock') {
            if (!vaultState.salt || !vaultState.verifier) {
                displayVaultError('Vault configuration missing. Please create a new vault.');
                return;
            }

            const { masterKey, verifier } = await deriveMasterKey(passphrase, vaultState.salt);

            if (verifier !== vaultState.verifier) {
                displayVaultError('Invalid passphrase. Please try again.');
                return;
            }

            vaultState.masterKey = masterKey;
            hideVaultModal();
            if (vaultState.modalResolve) {
                vaultState.modalResolve(true);
            }
            vaultState.modalResolve = null;
            showToast('Vault unlocked.', 'success');
        } else {
            const { masterKey, saltBase64, verifier } = await deriveMasterKey(passphrase, null);

            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.userDataCollectionId,
                currentUser.$id,
                {
                    vaultSalt: saltBase64,
                    vaultVerifier: verifier
                }
            );

            vaultState.masterKey = masterKey;
            vaultState.salt = saltBase64;
            vaultState.verifier = verifier;
            vaultState.userDoc = {
                ...(vaultState.userDoc || {}),
                vaultSalt: saltBase64,
                vaultVerifier: verifier
            };

            hideVaultModal();
            if (vaultState.modalResolve) {
                vaultState.modalResolve(true);
            }
            vaultState.modalResolve = null;
            showToast('Vault created and unlocked.', 'success');
        }
    } catch (error) {
        console.error('Vault handling error:', error);
        displayVaultError(error.message || 'Unable to process vault request.');
    }
}

function cancelVaultModal() {
    hideVaultModal();
    if (vaultState.modalResolve) {
        vaultState.modalResolve(false);
    }
    vaultState.modalResolve = null;
    if (!vaultState.masterKey) {
        // If user cancels without unlocking, log them out for security.
        handleLogout();
    }
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
        selectedFiles = [];
        resetVaultState();
        showToast('Logged out successfully', 'info');
        showMain();
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
}

function openFilePicker() {
    document.getElementById('fileInput').click();
}

function openFolderPicker() {
    document.getElementById('folderInput').click();
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (!files || files.length === 0) {
        return;
    }

    selectedFiles = Array.from(files);
    const fileCount = selectedFiles.length;

    let displayText;
    if (fileCount === 1) {
        const file = selectedFiles[0];
        const path = file.webkitRelativePath || file.name;
        displayText = `✅ ${path}`;
    } else {
        const samplePath = selectedFiles[0].webkitRelativePath;
        if (samplePath) {
            const topFolder = samplePath.split('/')[0];
            displayText = `✅ ${fileCount} items from folder "${topFolder}"`;
        } else {
            displayText = `✅ ${fileCount} files selected`;
        }
    }

    document.getElementById('fileName').textContent = displayText;
    document.getElementById('uploadBtn').disabled = false;
}

// Secure Upload Handler
async function handleSecureUpload() {
    if (!selectedFiles || selectedFiles.length === 0) {
        showToast('Please select files first', 'error');
        return;
    }

    const statusEl = document.getElementById('uploadStatus');
    statusEl.className = 'status-message';
    statusEl.style.display = 'none';

    const vaultReady = await ensureVaultReady();
    if (!vaultReady) {
        showToast('Vault locked. Upload cancelled.', 'error');
        return;
    }

    showLoading(true);

    try {
        let uploadCount = 0;
        const errorDetails = [];
        const files = selectedFiles;

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

                const encryptedMetadata = await vaultEncryptObject(metadata);
                const storedMetadata = {
                    version: 2,
                    payload: encryptedMetadata.payload,
                    iv: encryptedMetadata.iv,
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
                        encryptionKey: JSON.stringify(storedMetadata),
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
        document.getElementById('folderInput').value = '';
        selectedFiles = [];
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

    const filesListEl = document.getElementById('filesList');

    try {
        const response = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.encryptionKeysCollectionId,
            [
                Appwrite.Query.equal('userId', currentUser.$id),
                Appwrite.Query.orderDesc('uploadedAt')
            ]
        );

        if (response.documents.length === 0) {
            filesListEl.innerHTML = '<p style="color: #888; text-align: center;">No files uploaded yet</p>';
            return;
        }

        const parsedEntries = response.documents.map(doc => ({
            doc,
            metadata: parseEncryptionMetadata(doc.encryptionKey)
        }));

        const requiresVault = parsedEntries.some(entry => entry.metadata.version === 2);

        if (requiresVault && !vaultState.masterKey) {
            const unlocked = await ensureVaultReady();
            if (!unlocked) {
                filesListEl.innerHTML = '<p style="color: #dc2626; text-align: center;">Unlock your vault to view encrypted files.</p>';
                return;
            }
        }

        const items = [];

        for (const entry of parsedEntries) {
            const { doc, metadata: parsedMetadata } = entry;
            let metadata = parsedMetadata;
            let decryptError = null;

            if (parsedMetadata.version === 2) {
                try {
                    metadata = await vaultDecryptObject(parsedMetadata);
                } catch (error) {
                    decryptError = 'Unable to decrypt metadata. Try unlocking the vault again.';
                    console.error('Metadata decrypt error:', error);
                }
            } else if (parsedMetadata.version === 0) {
                metadata = {
                    key: parsedMetadata.key,
                    originalName: doc.fileName,
                    mimeType: '',
                    size: null,
                    path: null,
                    uploadedAt: doc.uploadedAt
                };
            }

            const date = new Date(doc.uploadedAt).toLocaleString();
            const originalName = metadata && metadata.originalName ? metadata.originalName : doc.fileName;
            const displayPath = metadata && metadata.path && metadata.path !== originalName
                ? metadata.path
                : null;
            const sizeLabel = metadata && typeof metadata.size === 'number'
                ? `(${formatFileSize(metadata.size)})`
                : '';
            const mimeType = metadata && metadata.mimeType
                ? metadata.mimeType
                : inferMimeType(originalName);
            const ext = (originalName.split('.').pop() || '').toLowerCase();
            const icon = getFileIcon(ext, mimeType);
            const safeName = escapeHtml(originalName);
            const safePath = displayPath ? escapeHtml(displayPath) : '';
            const pathHtml = safePath ? `<div class="file-item-path">${safePath}</div>` : '';
            const encodedName = encodeURIComponent(originalName);

            if (decryptError || !metadata || !metadata.key) {
                items.push(`
                    <div class="file-item">
                        <div class="file-item-info">
                            <div class="file-item-name">🔒 ${safeName}</div>
                            ${pathHtml}
                            <div class="file-item-meta">${escapeHtml(decryptError || 'Metadata unavailable')}</div>
                        </div>
                    </div>
                `);
                continue;
            }

            items.push(`
                <div class="file-item">
                    <div class="file-item-info">
                        <div class="file-item-name">${icon} ${safeName}</div>
                        ${pathHtml}
                        <div class="file-item-meta">Uploaded: ${date} ${sizeLabel}</div>
                    </div>
                    <div class="file-item-actions">
                        <button class="btn btn-primary btn-small" onclick="downloadFile('${doc.$id}')">
                            Download
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteFile('${doc.$id}', '${encodedName}')">
                            Delete
                        </button>
                    </div>
                </div>
            `);
        }

        filesListEl.innerHTML = items.join('');

    } catch (error) {
        console.error('Error loading files:', error);
        if (filesListEl) {
            filesListEl.innerHTML = '<p style="color: #dc2626; text-align: center;">Failed to load files.</p>';
        }
    }
}

// Download and Decrypt File
async function downloadFile(keyDocId) {
    showLoading(true);

    try {
        const keyDoc = await databases.getDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.encryptionKeysCollectionId,
            keyDocId
        );

        const parsedMetadata = parseEncryptionMetadata(keyDoc.encryptionKey);

        if (parsedMetadata.version === 2 && !vaultState.masterKey) {
            showLoading(false);
            const unlocked = await ensureVaultReady();
            if (!unlocked) {
                showToast('Vault locked. Download cancelled.', 'error');
                return;
            }
            showLoading(true);
        }

        let metadata;

        if (parsedMetadata.version === 2) {
            metadata = await vaultDecryptObject(parsedMetadata);
        } else if (parsedMetadata.version === 1) {
            metadata = parsedMetadata;
        } else {
            metadata = {
                key: parsedMetadata.key,
                originalName: keyDoc.fileName,
                mimeType: '',
                path: null,
                size: null
            };
        }

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

        const fileUrl = storage.getFileView(APPWRITE_CONFIG.bucketId, fileId);
        const response = await fetch(fileUrl);

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        const encryptedData = await response.arrayBuffer();
        const key = await quantumCrypto.importKey(encryptionKeyString);
        const decryptedData = await quantumCrypto.decryptFile(new Uint8Array(encryptedData), key);

        const blob = new Blob([decryptedData], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
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

// Delete Encrypted File and Metadata
async function deleteFile(keyDocId, encodedName = '') {
    const decodedName = encodedName ? decodeURIComponent(encodedName) : 'this file';
    const confirmed = window.confirm(`Are you sure you want to permanently delete "${decodedName}"?`);
    if (!confirmed) {
        return;
    }

    showLoading(true);

    try {
        const keyDoc = await databases.getDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.encryptionKeysCollectionId,
            keyDocId
        );

        const fileId = keyDoc.fileId;

        if (fileId) {
            try {
                await storage.deleteFile(APPWRITE_CONFIG.bucketId, fileId);
            } catch (storageError) {
                // If file already gone, log and continue with document deletion
                console.warn('Storage delete warning:', storageError);
            }
        }

        await databases.deleteDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.encryptionKeysCollectionId,
            keyDocId
        );

        showToast('File deleted successfully.', 'success');
        loadUserFiles();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete file: ' + (error.message || error), 'error');
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
    const vaultForm = document.getElementById('vaultForm');
    const vaultCancelButton = document.getElementById('vaultCancelButton');

    if (vaultForm) {
        vaultForm.addEventListener('submit', handleVaultSubmit);
    }

    if (vaultCancelButton) {
        vaultCancelButton.addEventListener('click', cancelVaultModal);
    }

    initAppwrite();
});

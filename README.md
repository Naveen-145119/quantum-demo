# 🔐 Quantum Secure File Upload - Appwrite Edition

A web-based secure file upload system with quantum-inspired encryption, powered by Appwrite.

## Features

- ✅ User Registration & Authentication
- ✅ Quantum-inspired File Encryption (AES-256-GCM)
- ✅ Secure File Storage with Appwrite
- ✅ Download & Decrypt Files
- ✅ Beautiful Responsive UI

## 🚀 Quick Start - Deploy to Appwrite

### Step 1: Create Appwrite Project

1. Go to [Appwrite Cloud](https://cloud.appwrite.io/) or use your self-hosted instance
2. Create a new project
3. Copy your **Project ID**

### Step 2: Setup Database

1. In your Appwrite project, go to **Databases**
2. Create a new database named `quantum-secure-db`
3. Create two collections:

#### Collection 1: `user-data`
- **Attributes:**
  - `username` (String, 255 characters, required)
  - `email` (String, 255 characters, required)
  - `mobile` (String, 20 characters, required)
  - `registeredAt` (String, 100 characters, required)

- **Permissions:**
  - Read: Role: User
  - Create: Role: Users
  - Update: Role: User
  - Delete: Role: User

#### Collection 2: `encryption-keys`
- **Attributes:**
  - `userId` (String, 255 characters, required)
  - `fileId` (String, 255 characters, required)
  - `fileName` (String, 255 characters, required)
  - `encryptionKey` (String, 5000 characters, required)
  - `uploadedAt` (String, 100 characters, required)

- **Permissions:**
  - Read: Role: User
  - Create: Role: Users
  - Update: Role: User
  - Delete: Role: User

### Step 3: Setup Storage

1. In your Appwrite project, go to **Storage**
2. Create a new bucket named `encrypted-files`
3. Set permissions:
   - Read: Role: User
   - Create: Role: Users
   - Update: Role: User
   - Delete: Role: User
4. Set max file size to your preferred limit (e.g., 10MB)

### Step 4: Configure the App

Edit `appwrite-config.js` and update:

```javascript
const APPWRITE_CONFIG = {
    endpoint: 'https://cloud.appwrite.io/v1', // Your Appwrite endpoint
    projectId: 'YOUR_PROJECT_ID', // Your project ID from Step 1
    databaseId: 'quantum-secure-db',
    userDataCollectionId: 'user-data',
    encryptionKeysCollectionId: 'encryption-keys',
    bucketId: 'encrypted-files'
};
```

### Step 5: Deploy

#### Option A: Deploy to Appwrite (Recommended)

1. Install Appwrite CLI:
```bash
npm install -g appwrite-cli
```

2. Login to Appwrite:
```bash
appwrite login
```

3. Initialize the project:
```bash
appwrite init project
```

4. Deploy the website:
```bash
appwrite deploy
```

#### Option B: Deploy to Any Static Host

You can deploy to Netlify, Vercel, GitHub Pages, or any static hosting:

1. Push your code to GitHub
2. Connect your repository to your hosting platform
3. Deploy (no build step needed, it's vanilla HTML/CSS/JS)

#### Option C: Test Locally

Simply open `index.html` in your browser or use a local server:

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000`

## 📖 How It Works

1. **Registration**: User creates account with username, email, mobile, and password
2. **Login**: Authenticates with Appwrite using email/password
3. **File Selection**: User selects a text file (.txt)
4. **Encryption**: 
   - Generates a quantum-inspired AES-256-GCM encryption key
   - Encrypts file in browser (client-side)
   - Key never leaves the user's control unencrypted
5. **Upload**: 
   - Encrypted file uploaded to Appwrite Storage
   - Encryption key stored in Appwrite Database (linked to user)
6. **Download**: 
   - Retrieves encrypted file and key
   - Decrypts in browser
   - Downloads original file

## 🔒 Security Features

- **Client-side Encryption**: Files encrypted in browser before upload
- **AES-256-GCM**: Industry-standard encryption algorithm
- **Unique Keys**: Each file gets a unique encryption key
- **Secure Authentication**: Powered by Appwrite's secure auth system
- **No Plain Text Storage**: Original files never stored unencrypted

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Appwrite (Auth, Database, Storage)
- **Encryption**: Web Crypto API (AES-256-GCM)
- **Hosting**: Static hosting compatible

## 📝 Notes

- This is an educational project demonstrating encryption concepts
- For production use, consider additional security measures
- The original Python/Tkinter code has been fully converted to web technologies
- All functionality preserved: registration, login, encrypted upload, file management

## 🆘 Troubleshooting

**"Failed to initialize app"**
- Check if `appwrite-config.js` has correct Project ID
- Verify endpoint URL is correct

**"Registration failed"**
- Check database collections are created correctly
- Verify collection permissions allow user creation

**"Upload failed"**
- Check storage bucket exists and has correct permissions
- Verify file size is within bucket limits

**"Download failed"**
- Ensure user has access to both the file and encryption key
- Check browser console for specific errors

## 📄 License

MIT License - Feel free to use and modify

## 👤 Credits

Converted from Python/Tkinter desktop app to web app with Appwrite backend.

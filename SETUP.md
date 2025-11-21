# Appwrite Setup Instructions

## Quick Appwrite Setup Guide

### 1. Create Appwrite Account & Project

```bash
# Visit https://cloud.appwrite.io/
# Or use your self-hosted Appwrite instance

# Create a new project and copy the Project ID
```

### 2. Setup Using Appwrite Console

#### Database Setup:
1. Go to **Databases** → Create Database
   - Name: `quantum-secure-db`
   - Copy the Database ID (or use the name as ID)

2. Create Collection: **user-data**
   - Click "Add Collection"
   - Collection ID: `user-data`
   - Add Attributes:
     - username (String, 255, required)
     - email (String, 255, required)
     - mobile (String, 20, required)
     - registeredAt (String, 100, required)
   - Set Permissions:
     - Create: role:users
     - Read: role:user
     - Update: role:user
     - Delete: role:user

3. Create Collection: **encryption-keys**
   - Collection ID: `encryption-keys`
   - Add Attributes:
     - userId (String, 255, required)
     - fileId (String, 255, required)
     - fileName (String, 255, required)
     - encryptionKey (String, 5000, required)
     - uploadedAt (String, 100, required)
   - Set Permissions:
     - Create: role:users
     - Read: role:user
     - Update: role:user
     - Delete: role:user

> **Note:** The Vault Passphrase is stored securely as a hash in the User's Preferences (`vaultHash`), so no separate collection is needed for it.

#### Storage Setup:
1. Go to **Storage** → Create Bucket
   - Bucket ID: `encrypted-files`
   - Name: Encrypted Files
   - Set Permissions:
     - Create: role:users
     - Read: role:user
     - Update: role:user
     - Delete: role:user
   - Max File Size: 10MB (or your preference)
   - Allowed File Extensions: * (all files)
   - Compression: None
   - Encryption: Yes (Appwrite handles this)

### 3. Update Configuration

Edit `appwrite-config.js`:

```javascript
const APPWRITE_CONFIG = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: 'YOUR_PROJECT_ID_HERE', // From step 1
    databaseId: 'quantum-secure-db',
    userDataCollectionId: 'user-data',
    encryptionKeysCollectionId: 'encryption-keys',
    bucketId: 'encrypted-files'
};
```

### 4. Deploy Options

#### Option A: Appwrite Static Website Hosting

```bash
# Install Appwrite CLI
npm install -g appwrite-cli

# Login
appwrite login

# Initialize
appwrite init project

# Deploy
appwrite deploy collection
appwrite deploy bucket
appwrite deploy function
```

#### Option B: Deploy to Netlify

```bash
# Push to GitHub
git add .
git commit -m "Quantum secure file upload"
git push

# Go to netlify.com
# Connect GitHub repo
# Deploy (no build command needed)
```

#### Option C: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### 5. Test Locally First

```bash
# Install dependencies
npm install

# Start local server
npm start

# Open http://localhost:8000
```

### 6. Verify Setup

Test the following:
- [ ] User can register
- [ ] User can login
- [ ] User can select and upload .txt file
- [ ] File appears in encrypted files list
- [ ] User can download and decrypt file
- [ ] User can logout

## Platform-Specific Deploy Commands

### Appwrite Cloud
```bash
appwrite deploy
```

### Netlify
```bash
netlify deploy --prod
```

### Vercel
```bash
vercel --prod
```

### GitHub Pages
```bash
git push origin main
# Enable GitHub Pages in repository settings
```

## Environment Variables (if using build process)

Create `.env` file:
```
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
```

## Important Notes

## Frontend environment variables for Appwrite Site Deploy

When deploying to Appwrite's static hosting you have two simple options to provide runtime configuration to the frontend.

1) Preferred - create a small file `appwrite-env.js` and deploy it with your site. Example contents:

```javascript
// appwrite-env.js (DO NOT commit secrets to git)
window.APPWRITE_ENV = {
  APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1',
  APPWRITE_PROJECT_ID: 'your-project-id',
  APPWRITE_DATABASE_ID: 'quantum-secure-db',
  APPWRITE_USER_DATA_COLLECTION_ID: 'user-data',
  APPWRITE_KEYS_COLLECTION_ID: 'encryption-keys',
  APPWRITE_BUCKET_ID: 'encrypted-files'
};
```

Then update `index.html` to load this file before `appwrite-config.js` (add this line above the existing appwrite-config include):

```html
<script src="appwrite-env.js"></script>
<script src="appwrite-config.js"></script>
```

2) Alternative - edit `appwrite-config.js` directly and replace the default values. This is fine for a private/test site but not recommended for public repos.

Exact variable names (if you prefer environment-style keys):

- APPWRITE_ENDPOINT
- APPWRITE_PROJECT_ID
- APPWRITE_DATABASE_ID
- APPWRITE_USER_DATA_COLLECTION_ID
- APPWRITE_KEYS_COLLECTION_ID
- APPWRITE_BUCKET_ID

These keys are mapped automatically by `appwrite-config.js` (it supports a `window.APPWRITE_ENV` object).


1. **CORS Settings**: If using custom domain, add it to Appwrite Project Settings → Platforms
2. **Security**: Never commit real API keys or sensitive data
3. **Permissions**: Double-check collection and bucket permissions
4. **File Size**: Adjust bucket max file size based on your needs

## Support

- Appwrite Docs: https://appwrite.io/docs
- Appwrite Discord: https://discord.gg/appwrite
- GitHub Issues: https://github.com/appwrite/appwrite

## Next Steps

After deployment:
1. Test all functionality
2. Add your custom domain (optional)
3. Monitor usage in Appwrite console
4. Set up backups if needed

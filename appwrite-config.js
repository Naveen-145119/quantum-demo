// Appwrite Configuration
// The app supports multiple ways to provide configuration so it works both
// in local development and when deployed via Appwrite's static hosting.
//
// Priority (highest -> lowest):
// 1. window.APPWRITE_CONFIG (an object you can inject at deploy time)
// 2. window.APPWRITE_ENV (an env-style object, e.g. APPWRITE_PROJECT_ID)
// 3. Defaults below (replace before production)

(function (global) {
    const DEFAULT = {
        // Your Appwrite endpoint (use this for Appwrite Cloud)
        endpoint: 'https://fra.cloud.appwrite.io/v1',
        // Replace this with your Appwrite Project ID
        projectId: '6909ea78000b6773e3df',
        // Database and Collection / Bucket IDs (must match what you create in Appwrite Console)
        databaseId: '6909ea9b001582c4afab',
        userDataCollectionId: 'user-data',
        encryptionKeysCollectionId: 'encryption-keys',
        bucketId: '6909ec300014932a62f8'
    };

    // If deploy injects a config object directly, use it
    if (global.APPWRITE_CONFIG && typeof global.APPWRITE_CONFIG === 'object') {
        global.APPWRITE_CONFIG = Object.assign({}, DEFAULT, global.APPWRITE_CONFIG);
    } else if (global.APPWRITE_ENV && typeof global.APPWRITE_ENV === 'object') {
        // Support env-like object with keys such as APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, etc.
        const e = global.APPWRITE_ENV;
        global.APPWRITE_CONFIG = Object.assign({}, DEFAULT, {
            endpoint: e.APPWRITE_ENDPOINT || e.endpoint || DEFAULT.endpoint,
            projectId: e.APPWRITE_PROJECT_ID || e.projectId || DEFAULT.projectId,
            databaseId: e.APPWRITE_DATABASE_ID || e.databaseId || DEFAULT.databaseId,
            userDataCollectionId: e.APPWRITE_USER_DATA_COLLECTION_ID || e.userDataCollectionId || DEFAULT.userDataCollectionId,
            encryptionKeysCollectionId: e.APPWRITE_KEYS_COLLECTION_ID || e.encryptionKeysCollectionId || DEFAULT.encryptionKeysCollectionId,
            bucketId: e.APPWRITE_BUCKET_ID || e.bucketId || DEFAULT.bucketId
        });
    } else {
        // Fallback to defaults
        global.APPWRITE_CONFIG = DEFAULT;
    }

    // Also export for CommonJS (useful in local dev tooling)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.APPWRITE_CONFIG;
    }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {}));

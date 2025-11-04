// Encryption utility using Web Crypto API (browser-native)
// This simulates the Fernet encryption from the original Python code

class QuantumCrypto {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
    }

    // Generate a quantum-inspired encryption key (simulated)
    async generateQuantumKey() {
        const key = await crypto.subtle.generateKey(
            {
                name: this.algorithm,
                length: this.keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );
        return key;
    }

    // Export key to store it
    async exportKey(key) {
        const exported = await crypto.subtle.exportKey('jwk', key);
        return JSON.stringify(exported);
    }

    // Import key from stored format
    async importKey(keyString) {
        const keyData = JSON.parse(keyString);
        const key = await crypto.subtle.importKey(
            'jwk',
            keyData,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );
        return key;
    }

    // Encrypt file data
    async encryptFile(file, key) {
        try {
            // Read file as ArrayBuffer
            const fileBuffer = await file.arrayBuffer();
            
            // Generate a random initialization vector
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt the data
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                fileBuffer
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedData.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encryptedData), iv.length);

            return combined;
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt file');
        }
    }

    // Decrypt file data
    async decryptFile(encryptedData, key) {
        try {
            // Extract IV and encrypted content
            const iv = encryptedData.slice(0, 12);
            const data = encryptedData.slice(12);

            // Decrypt the data
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                data
            );

            return decryptedData;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt file');
        }
    }

    // Convert ArrayBuffer to Base64 (for display/storage)
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Convert Base64 to ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// Create global instance
const quantumCrypto = new QuantumCrypto();

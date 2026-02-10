const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
let isFirebaseInitialized = false;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        // Option 1: Load from Base64 env variable (Ideal for Railway/Production)
        const configString = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
        const serviceAccount = JSON.parse(configString);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        isFirebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialized from Base64 environment variable.');
    } else if (fs.existsSync(serviceAccountPath)) {
        // Option 2: Load from local JSON file
        admin.initializeApp({
            credential: admin.credential.cert(require(serviceAccountPath)),
        });
        isFirebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialized from local JSON file.');
    } else {
        console.warn('⚠️ Firebase configuration not found (Missing FIREBASE_SERVICE_ACCOUNT_BASE64 or JSON file). Push notifications will be logged only.');
    }
} catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
}

module.exports = { admin, isFirebaseInitialized };

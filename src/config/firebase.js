const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
let isFirebaseInitialized = false;

try {
    if (fs.existsSync(serviceAccountPath)) {
        admin.initializeApp({
            credential: admin.credential.cert(require(serviceAccountPath)),
        });
        isFirebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialized successfully.');
    } else {
        console.warn('⚠️ Firebase service account file not found. Push notifications will be logged only.');
    }
} catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
}

module.exports = { admin, isFirebaseInitialized };

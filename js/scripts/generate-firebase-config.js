
const fs = require('fs');
const path = require('path');

const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Required Firebase configuration fields
const required = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
];

const missing = required.filter(key => !config[key]);

if (missing.length > 0) {
    console.error('Missing Firebase environment variables:', missing);
    process.exit(1);
}

const output = `
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = ${JSON.stringify(config, null, 4)};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
export default app;
`;

const outputPath = path.join(__dirname, '..', 'js', 'firebase-config.js');

fs.writeFileSync(outputPath, output.trimStart());

console.log('Firebase configuration generated successfully.');

/* firebase-config.js - FILL IN YOUR VALUES - DO NOT COMMIT TO GITHUB */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD5dUZiqQnjiPWzxjFNjA0ziQ4lqoTSPSE",
    authDomain: "gatelog-app.firebaseapp.com",
    projectId: "gatelog-app",
    storageBucket: "gatelog-app.firebasestorage.app",
    messagingSenderId: "322165186286",
    appId: "1:322165186286:web:ffb69904ca1d6aa2f75dff",
    measurementId: "G-77GEG63SQX"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

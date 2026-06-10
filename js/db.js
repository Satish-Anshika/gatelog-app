/* db.js - Firebase Firestore Data Layer */
import { db } from './firebase-config.js';
import {
    collection, doc, getDocs, updateDoc,
    deleteDoc, query, where, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── COLLECTIONS ───────────────────────────────────────────────
const USERS_COL     = 'users';
const PARCELS_COL   = 'parcels';
const LOSTFOUND_COL = 'lostFound';

const SESSION = {
    getCurrentUser: () => JSON.parse(sessionStorage.getItem('currentUser')),
    setCurrentUser: (user) => sessionStorage.setItem('currentUser', JSON.stringify(user)),
    logout: () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
};
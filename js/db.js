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

// ─── SESSION (uses sessionStorage - client state) ──────────────
const SESSION = {
    getCurrentUser: () => JSON.parse(sessionStorage.getItem('currentUser')),
    setCurrentUser: (user) => sessionStorage.setItem('currentUser', JSON.stringify(user)),
    logout: () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
};

// ─── DB INTERFACE ──────────────────────────────────────────────
const DB = {

    generateId: () => '_' + Math.random().toString(36).substr(2, 9),

    getCurrentUser: () => SESSION.getCurrentUser(),
    setCurrentUser: (user) => SESSION.setCurrentUser(user),
    logout: () => SESSION.logout(),

    // ─── USERS ─────────────────────────────────────────────────
    getUsers: async () => {
        const snap = await getDocs(collection(db, USERS_COL));
        return snap.docs.map(d => d.data());
    },

    addUser: async (user) => {
        await setDoc(doc(db, USERS_COL, user.id), user);
    },

    updateUser: async (userId, updates) => {
        await updateDoc(doc(db, USERS_COL, userId), updates);
    },

    deleteUser: async (userId) => {
        await deleteDoc(doc(db, USERS_COL, userId));
    },

    findUserByPhone: async (phone) => {
        const q = query(collection(db, USERS_COL), where('phone', '==', phone));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return snap.docs[0].data();
    },

    // ─── PARCELS ───────────────────────────────────────────────
    getParcels: async () => {
        const snap = await getDocs(collection(db, PARCELS_COL));
        return snap.docs.map(d => d.data());
    },

    addParcel: async (parcel) => {
        await setDoc(doc(db, PARCELS_COL, parcel.id), parcel);
    },

    updateParcel: async (parcelId, updates) => {
        await updateDoc(doc(db, PARCELS_COL, parcelId), updates);
    },

    getParcelsByPhone: async (phone) => {
        const q = query(collection(db, PARCELS_COL), where('phone', '==', phone));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data());
    },

    /**
     * Find a parcel by barcode.
     * Supports case-insensitive lookup and prefix tolerance ('BAR-XXXXXX' or 'XXXXXX').
     * Returns parcel object with current status ('pending' or 'delivered').
     */
    findParcelByBarcode: async (barcodeId) => {
        if (!barcodeId) return null;
        const clean = barcodeId.trim();
        const upper = clean.toUpperCase();

        const candidateCodes = [upper];
        if (clean !== upper) candidateCodes.push(clean);
        if (!upper.startsWith('BAR-')) {
            candidateCodes.push('BAR-' + upper);
        }

        for (const code of candidateCodes) {
            // Priority 1: Check pending parcels first
            const qPending = query(
                collection(db, PARCELS_COL),
                where('barcodeId', '==', code),
                where('status', '==', 'pending')
            );
            const snapPending = await getDocs(qPending);
            if (!snapPending.empty) {
                return snapPending.docs[0].data();
            }

            // Priority 2: Check any parcel with this barcode (e.g. already delivered)
            const qAll = query(
                collection(db, PARCELS_COL),
                where('barcodeId', '==', code)
            );
            const snapAll = await getDocs(qAll);
            if (!snapAll.empty) {
                return snapAll.docs[0].data();
            }
        }

        return null;
    },

    // ─── LOST & FOUND ──────────────────────────────────────────
    getLostFound: async () => {
        const snap = await getDocs(collection(db, LOSTFOUND_COL));
        return snap.docs.map(d => d.data());
    },

    addLostFound: async (item) => {
        await setDoc(doc(db, LOSTFOUND_COL, item.id), item);
    },

    updateLostFound: async (itemId, updates) => {
        await updateDoc(doc(db, LOSTFOUND_COL, itemId), updates);
    }
};

window.DB = DB;
export default DB;
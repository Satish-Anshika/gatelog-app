/* db.js - Firebase Firestore Data Layer */
import { db } from './firebase-config.js';
import {
    collection, doc, getDocs, addDoc, updateDoc,
    deleteDoc, query, where, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── COLLECTIONS ───────────────────────────────────────────────
const USERS_COL     = 'users';
const PARCELS_COL   = 'parcels';
const LOSTFOUND_COL = 'lostFound';

// ─── SEED ADMIN (run once on first load) ───────────────────────
async function seedAdmin() {
    const adminRef = doc(db, USERS_COL, 'admin1');
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
        await setDoc(adminRef, {
            id: 'admin1',
            phone: '0000000000',
            password: 'admin',
            role: 'admin',
            status: 'approved',
            name: 'Super Admin',
            idCard: 'ADMIN001'
        });
    }
}
seedAdmin();

// ─── SESSION (still uses sessionStorage - safe, not synced) ────
const SESSION = {
    getCurrentUser: () => JSON.parse(sessionStorage.getItem('currentUser')),
    setCurrentUser: (user) => sessionStorage.setItem('currentUser', JSON.stringify(user)),
    logout: () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
};

// ─── USERS ─────────────────────────────────────────────────────
const DB = {

    generateId: () => '_' + Math.random().toString(36).substr(2, 9),

    getCurrentUser: () => SESSION.getCurrentUser(),
    setCurrentUser: (user) => SESSION.setCurrentUser(user),
    logout: () => SESSION.logout(),

    // Get all users
    getUsers: async () => {
        const snap = await getDocs(collection(db, USERS_COL));
        return snap.docs.map(d => d.data());
    },

    // Add a new user
    addUser: async (user) => {
        await setDoc(doc(db, USERS_COL, user.id), user);
    },

    // Update a user field
    updateUser: async (userId, updates) => {
        await updateDoc(doc(db, USERS_COL, userId), updates);
    },

    // Delete a user
    deleteUser: async (userId) => {
        await deleteDoc(doc(db, USERS_COL, userId));
    },

    // Find user by phone
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

    findParcelByBarcode: async (barcodeId) => {
        const q = query(collection(db, PARCELS_COL),
            where('barcodeId', '==', barcodeId),
            where('status', '==', 'pending')
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return snap.docs[0].data();
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
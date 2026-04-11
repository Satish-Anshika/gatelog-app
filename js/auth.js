/* auth.js - Authentication & Registration Logic (Firebase) */
import DB from './db.js';

document.addEventListener('DOMContentLoaded', async () => {

    // Auto redirect if already logged in
    const currentUser = DB.getCurrentUser();
    if (currentUser) {
        if (currentUser.role === 'admin') window.location.href = 'admin.html';
        else if (currentUser.role === 'student') window.location.href = 'student.html';
        else if (currentUser.role === 'security') window.location.href = 'security.html';
        return;
    }

    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');

    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
    });

    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    // ─── REGISTER ──────────────────────────────────────────────
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const role     = document.querySelector('input[name="reg-role"]:checked').value;
        const name     = document.getElementById('reg-name').value.trim();
        const idCard   = document.getElementById('reg-idcard').value.trim();
        const phone    = document.getElementById('reg-phone').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        const errorDiv = document.getElementById('register-error');

        if (!name || !idCard || !phone || !password) {
            errorDiv.textContent = "All fields are required.";
            errorDiv.classList.remove('hidden');
            return;
        }

        // Check phone uniqueness
        const existing = await DB.findUserByPhone(phone);
        if (existing) {
            errorDiv.textContent = "This phone number is already registered.";
            errorDiv.classList.remove('hidden');
            return;
        }

        const newUser = {
            id: DB.generateId(),
            name, idCard, phone, password,
            role,
            status: 'pending'
        };

        await DB.addUser(newUser);

        document.getElementById('register-form').reset();
        errorDiv.classList.add('hidden');
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');

        const loginSuccessDiv = document.getElementById('login-success');
        loginSuccessDiv.textContent = "Registration successful! Please wait for Admin approval.";
        loginSuccessDiv.classList.remove('hidden');
        setTimeout(() => loginSuccessDiv.classList.add('hidden'), 5000);
    });

    // ─── LOGIN ─────────────────────────────────────────────────
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone    = document.getElementById('login-phone').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const errorDiv = document.getElementById('login-error');
        const successDiv = document.getElementById('login-success');

        successDiv.classList.add('hidden');

        const user = await DB.findUserByPhone(phone);

        if (!user || user.password !== password) {
            errorDiv.textContent = "Invalid phone number or password.";
            errorDiv.classList.remove('hidden');
            return;
        }

        if (user.status !== 'approved') {
            errorDiv.textContent = "Your account is pending admin approval.";
            errorDiv.classList.remove('hidden');
            return;
        }

        errorDiv.classList.add('hidden');
        DB.setCurrentUser(user);

        if (user.role === 'admin') window.location.href = 'admin.html';
        else if (user.role === 'student') window.location.href = 'student.html';
        else if (user.role === 'security') window.location.href = 'security.html';
    });
});
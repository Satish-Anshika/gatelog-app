/* admin.js - Admin Dashboard Logic (Firebase) */
import DB from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = DB.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        DB.logout();
    });

    async function renderUsers() {
        const users = await DB.getUsers();
        const pendingContainer  = document.getElementById('pending-users-list');
        const approvedContainer = document.getElementById('approved-users-list');

        pendingContainer.innerHTML  = '';
        approvedContainer.innerHTML = '';

        let pendingCount = 0;

        users.forEach(user => {
            if (user.role === 'admin') return;

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="flex justify-between align-center mb-1">
                    <h3 class="golden-text">${user.name}</h3>
                    <span class="badge ${user.role === 'student' ? 'badge-warning' : 'badge-danger'}">${user.role}</span>
                </div>
                <p><strong>Phone:</strong> ${user.phone}</p>
                <p><strong>ID Card:</strong> ${user.idCard}</p>
            `;

            if (user.status === 'pending') {
                pendingCount++;
                const actions = document.createElement('div');
                actions.className = 'mt-2 flex justify-between';
                actions.innerHTML = `
                    <button class="btn-primary btn-small mr-1" data-approve="${user.id}" style="width:48%;">Approve</button>
                    <button class="btn-secondary btn-small" data-reject="${user.id}" style="width:48%; border-color:var(--error); color:var(--error);">Reject</button>
                `;
                card.appendChild(actions);
                pendingContainer.appendChild(card);
            } else {
                card.innerHTML += `<p class="mt-1"><span class="badge badge-success">Approved</span></p>`;
                approvedContainer.appendChild(card);
            }
        });

        if (pendingCount === 0) {
            pendingContainer.innerHTML = '<p class="text-muted">No pending approvals.</p>';
        }

        // Attach button listeners
        document.querySelectorAll('[data-approve]').forEach(btn => {
            btn.addEventListener('click', () => approveUser(btn.dataset.approve));
        });
        document.querySelectorAll('[data-reject]').forEach(btn => {
            btn.addEventListener('click', () => rejectUser(btn.dataset.reject));
        });
    }

    async function approveUser(userId) {
        await DB.updateUser(userId, { status: 'approved' });
        renderUsers();
    }

    async function rejectUser(userId) {
        await DB.deleteUser(userId);
        renderUsers();
    }

    renderUsers();
});
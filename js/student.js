/* student.js - Student Dashboard Logic (Firebase) */
import DB from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = DB.getCurrentUser();
    if (!currentUser || currentUser.role !== 'student') {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('student-name').textContent = currentUser.name;

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        DB.logout();
    });

    async function renderParcels() {
        const studentParcels = await DB.getParcelsByPhone(currentUser.phone);

        const pendingContainer  = document.getElementById('student-parcels');
        const historyContainer  = document.getElementById('student-history');

        pendingContainer.innerHTML = '';
        historyContainer.innerHTML = '';

        const pending   = studentParcels.filter(p => p.status === 'pending');
        const delivered = studentParcels.filter(p => p.status === 'delivered');

        if (pending.length === 0) {
            pendingContainer.innerHTML = '<p class="text-muted">You have no pending parcels to collect.</p>';
        } else {
            pending.forEach(p => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div class="flex justify-between align-center mb-1">
                        <h3 class="golden-text">Arrived at ${p.gate}</h3>
                        <span class="badge badge-warning">Pending Collection</span>
                    </div>
                    <p style="font-size:0.9rem; color:var(--text-muted);">Show this barcode to security at the gate.</p>
                    <div class="barcode-container mt-2">
                        <div class="barcode-lines"></div>
                        <div class="barcode-text">${p.barcodeId}</div>
                    </div>
                `;
                pendingContainer.appendChild(card);
            });
        }

        if (delivered.length === 0) {
            historyContainer.innerHTML = '<p class="text-muted">No past collections.</p>';
        } else {
            delivered.forEach(p => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div class="flex justify-between align-center mb-1">
                        <h3 style="color:var(--text-main);">Collected from ${p.gate}</h3>
                        <span class="badge badge-success">Delivered</span>
                    </div>
                    <p><strong>Barcode Used:</strong> ${p.barcodeId}</p>
                    <p><strong>Collected On:</strong> ${new Date(p.deliveredDate).toLocaleString()}</p>
                `;
                historyContainer.appendChild(card);
            });
        }
    }

    renderParcels();
});
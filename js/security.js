/* security.js - Security Dashboard Logic (Firebase) */
import DB from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = DB.getCurrentUser();
    if (!currentUser || currentUser.role !== 'security') {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        DB.logout();
    });

    const parcelsList = document.getElementById('parcels-list');

    async function renderParcels() {
        const allParcels = await DB.getParcels();
        const parcels = allParcels.filter(p => p.status === 'pending');
        parcelsList.innerHTML = '';

        if (parcels.length === 0) {
            parcelsList.innerHTML = '<p class="text-muted">No pending parcels.</p>';
            return;
        }

        parcels.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="flex justify-between align-center mb-1">
                    <h3 class="golden-text">${p.studentName}</h3>
                    <span class="badge badge-warning">${p.gate}</span>
                </div>
                <p><strong>Phone:</strong> ${p.phone}</p>
                <p><strong>Barcode:</strong> ${p.barcodeId}</p>
                <p><strong>Date LOG:</strong> ${new Date(p.date).toLocaleString()}</p>
                <p class="mt-1" style="font-size:0.8rem; color:var(--text-muted);">Awaiting Pickup</p>
            `;
            parcelsList.appendChild(card);
        });
    }

    // ─── ADD PARCEL ────────────────────────────────────────────
    document.getElementById('add-parcel-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('parcel-phone').value.trim();
        const name  = document.getElementById('parcel-name').value.trim();
        const gate  = document.getElementById('parcel-gate').value;
        const msgDiv = document.getElementById('parcel-msg');

        const barcodeId = 'BAR-' + DB.generateId().substring(1, 7).toUpperCase();
        const newParcel = {
            id: DB.generateId(),
            phone,
            studentName: name,
            gate,
            status: 'pending',
            date: new Date().toISOString(),
            barcodeId
        };

        await DB.addParcel(newParcel);

        msgDiv.textContent = `Parcel logged successfully at ${gate}!`;
        msgDiv.className = 'alert alert-success';
        msgDiv.classList.remove('hidden');

        document.getElementById('add-parcel-form').reset();
        renderParcels();
        setTimeout(() => msgDiv.classList.add('hidden'), 3000);
    });

    // ─── VERIFY PICKUP ─────────────────────────────────────────
    document.getElementById('verify-parcel-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const barcode = document.getElementById('verify-barcode').value.trim();
        const msgDiv  = document.getElementById('verify-msg');

        const parcel = await DB.findParcelByBarcode(barcode);

        if (parcel) {
            await DB.updateParcel(parcel.id, {
                status: 'delivered',
                deliveredDate: new Date().toISOString()
            });

            msgDiv.textContent = `Success! Parcel for ${parcel.studentName} marked as delivered.`;
            msgDiv.className = 'alert alert-success';
            document.getElementById('verify-parcel-form').reset();
            renderParcels();
        } else {
            msgDiv.textContent = "Invalid or expired Barcode.";
            msgDiv.className = 'alert alert-error';
        }

        msgDiv.classList.remove('hidden');
        setTimeout(() => msgDiv.classList.add('hidden'), 3000);
    });

    renderParcels();
});
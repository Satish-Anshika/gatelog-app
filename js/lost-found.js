/* lost-found.js - Lost & Found Logic (Firebase) */
import DB from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = DB.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('back-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser.role === 'admin') window.location.href = 'admin.html';
        else if (currentUser.role === 'security') window.location.href = 'security.html';
        else window.location.href = 'student.html';
    });

    const itemsList = document.getElementById('items-list');

    async function renderItems() {
        const items = await DB.getLostFound();
        itemsList.innerHTML = '';

        if (items.length === 0) {
            itemsList.innerHTML = '<p class="text-center text-muted">No items reported.</p>';
            return;
        }

        // Sort newest first
        items.sort((a, b) => new Date(b.date) - new Date(a.date));

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card mb-2';

            const canRemove = (item.reporterId === currentUser.id)
                || currentUser.role === 'admin'
                || currentUser.role === 'security';

            let descriptionHtml = item.description;
            if (item.resolved) {
                descriptionHtml = `<s>${item.description}</s> <span style="color:var(--success); font-size:0.9rem;">(Found by ${item.resolvedBy})</span>`;
            }

            card.innerHTML = `
                <div class="flex justify-between align-center mb-1">
                    <span class="badge ${item.type === 'lost' ? 'badge-danger' : 'badge-success'}">
                        ${item.type.toUpperCase()}
                    </span>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${new Date(item.date).toLocaleDateString()}</span>
                </div>
                <p class="mb-1" style="font-size:1.1rem;">${descriptionHtml}</p>
                <p style="font-size:0.9rem; color:var(--text-muted);">
                    Reported by: ${item.reporterName} (Phone: ${item.reporterPhone})
                </p>
                ${(canRemove && !item.resolved)
                    ? `<button class="btn-secondary btn-small mt-2" data-resolve="${item.id}" style="width:auto;">Mark as Found</button>`
                    : ''}
            `;
            itemsList.appendChild(card);
        });

        document.querySelectorAll('[data-resolve]').forEach(btn => {
            btn.addEventListener('click', () => resolveItem(btn.dataset.resolve));
        });
    }

    // ─── REPORT ITEM ───────────────────────────────────────────
    document.getElementById('report-item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type        = document.querySelector('input[name="item-type"]:checked').value;
        const description = document.getElementById('item-desc').value.trim();
        const msgDiv      = document.getElementById('report-msg');

        if (!description) return;

        const newItem = {
            id: DB.generateId(),
            type,
            description,
            reporterId:    currentUser.id,
            reporterName:  currentUser.name,
            reporterPhone: currentUser.phone,
            date: new Date().toISOString(),
            resolved: false
        };

        await DB.addLostFound(newItem);

        msgDiv.textContent = 'Post added to the community board!';
        msgDiv.className = 'alert alert-success';
        msgDiv.classList.remove('hidden');

        document.getElementById('report-item-form').reset();
        renderItems();
        setTimeout(() => msgDiv.classList.add('hidden'), 3000);
    });

    // ─── RESOLVE ITEM ──────────────────────────────────────────
    async function resolveItem(itemId) {
        if (confirm("Mark this item as found?")) {
            await DB.updateLostFound(itemId, {
                resolved: true,
                resolvedBy: currentUser.name
            });
            renderItems();
        }
    }

    renderItems();
});
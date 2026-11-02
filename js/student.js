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

    const pendingContainer = document.getElementById('student-parcels');
    const historyContainer = document.getElementById('student-history');

    // Generate a single scannable SVG QR code using qrcode-generator
    function renderQRCode(id, code) {
        const qrBox = document.getElementById(`qrcode-${id}`);
        if (!qrBox) return;
        qrBox.innerHTML = '';

        if (window.qrcode) {
            try {
                const qr = window.qrcode(0, 'M');
                qr.addData(code);
                qr.make();
                // createSvgTag produces ONE self-contained scannable SVG
                qrBox.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
            } catch (err) {
                console.error("QR render error:", err);
                qrBox.textContent = code;
            }
        } else {
            // Final fallback: plain text the student can quote
            qrBox.textContent = code;
        }
    }

    let lastParcelCache = '';

    async function renderParcels() {
        const studentParcels = await DB.getParcelsByPhone(currentUser.phone);

        const pending   = studentParcels.filter(p => p.status === 'pending');
        const delivered = studentParcels.filter(p => p.status === 'delivered');

        // Prevent DOM thrashing and tab resetting if parcel data has not changed
        const currentCacheKey = JSON.stringify(studentParcels.map(p => ({ id: p.id, status: p.status })));
        if (currentCacheKey === lastParcelCache) {
            return;
        }
        lastParcelCache = currentCacheKey;

        pendingContainer.innerHTML = '';
        historyContainer.innerHTML = '';

        if (pending.length === 0) {
            pendingContainer.innerHTML = '<p class="text-muted">You have no pending parcels to collect.</p>';
        } else {
            pending.forEach(p => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div class="flex justify-between align-center mb-1">
                        <h3 class="golden-text">Arrived at ${p.gate}</h3>
                        <span class="badge badge-warning">Awaiting Collection</span>
                    </div>
                    <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom: 0.75rem;">
                        Present either the Barcode or QR Code to security at the gate.
                    </p>
                    
                    <div class="barcode-container mt-1">
                        <!-- Switcher between Barcode and QR -->
                        <div class="code-type-switcher">
                            <button type="button" class="tab-btn active" data-type="barcode" data-id="${p.id}">1D Barcode</button>
                            <button type="button" class="tab-btn" data-type="qr" data-id="${p.id}">QR Code</button>
                        </div>

                        <!-- 1D Barcode View (Default Active) -->
                        <div id="barcode-view-${p.id}" class="code-view">
                            <svg id="barcode-${p.id}" class="barcode-svg"></svg>
                        </div>

                        <!-- QR Code View (Active when toggled) -->
                        <div id="qr-view-${p.id}" class="code-view hidden">
                            <div id="qrcode-${p.id}" class="qr-box"></div>
                        </div>
                    </div>

                    <div class="flex justify-between align-center mt-2" style="background: rgba(255,255,255,0.03); padding: 0.5rem 0.75rem; border-radius: 6px;">
                        <div>
                            <span style="font-size:0.8rem; color:var(--text-muted);">Barcode ID:</span>
                            <code class="golden-text" style="font-size: 1rem; font-weight: bold; margin-left: 0.35rem;">${p.barcodeId}</code>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline copy-btn" data-code="${p.barcodeId}">📋 Copy Code</button>
                    </div>
                `;
                pendingContainer.appendChild(card);

                // 1. Render 1D Barcode
                if (window.JsBarcode) {
                    try {
                        window.JsBarcode(`#barcode-${p.id}`, p.barcodeId, {
                            format: "CODE128",
                            width: 2.2,
                            height: 65,
                            displayValue: true,
                            fontSize: 16,
                            font: "monospace",
                            textMargin: 6,
                            background: "#ffffff",
                            lineColor: "#000000"
                        });
                    } catch (err) {
                        console.error("JsBarcode error:", err);
                    }
                }

                // 2. Pre-render QR Code SVG immediately
                renderQRCode(p.id, p.barcodeId);

                // Tab Switcher Click Handler
                const tabBtns = card.querySelectorAll('.tab-btn');
                tabBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        tabBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        const type = btn.dataset.type;
                        const barcodeView = document.getElementById(`barcode-view-${p.id}`);
                        const qrView = document.getElementById(`qr-view-${p.id}`);

                        if (type === 'qr') {
                            barcodeView.classList.add('hidden');
                            qrView.classList.remove('hidden');
                        } else {
                            qrView.classList.add('hidden');
                            barcodeView.classList.remove('hidden');
                        }
                    });
                });

                // Copy button interaction
                card.querySelector('.copy-btn')?.addEventListener('click', async (e) => {
                    const btn = e.currentTarget;
                    const code = btn.dataset.code;
                    try {
                        await navigator.clipboard.writeText(code);
                        btn.textContent = '✅ Copied!';
                        setTimeout(() => { btn.textContent = '📋 Copy Code'; }, 2000);
                    } catch (_) {
                        prompt('Copy your Barcode ID:', code);
                    }
                });
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
                    <p><strong>Barcode Used:</strong> <code>${p.barcodeId}</code></p>
                    <p><strong>Collected On:</strong> ${new Date(p.deliveredDate).toLocaleString()}</p>
                `;
                historyContainer.appendChild(card);
            });
        }
    }

    renderParcels();

    // Check for updates every 4 seconds without resetting active tab
    setInterval(renderParcels, 4000);
});
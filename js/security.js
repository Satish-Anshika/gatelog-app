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
    const barcodeInput = document.getElementById('verify-barcode');

    // Auto-focus barcode input for instant scanning
    if (barcodeInput) barcodeInput.focus();

    // ─── AUDIO FEEDBACK (POS SCANNER BEEP) ─────────────────────
    function playScannerBeep(isSuccess) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (isSuccess) {
                // High-pitched positive confirmation beep (1760Hz, 120ms)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1760, ctx.currentTime);
                gain.gain.setValueAtTime(0.25, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.12);
            } else {
                // Low double error beep
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(320, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.25);
            }
        } catch (_) {}
    }

    // ─── POPUP NOTIFICATION (5 SECONDS WITH FADE OUT) ──────────
    let popupTimer = null;
    let fadeTimer = null;

    function showVerificationPopup(type, title, message) {
        let popup = document.getElementById('verification-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'verification-popup';
            popup.className = 'verification-popup';
            document.body.appendChild(popup);
        }

        clearTimeout(popupTimer);
        clearTimeout(fadeTimer);

        popup.className = `verification-popup ${type}`;
        popup.innerHTML = `
            <div class="popup-title">${title}</div>
            <div class="popup-body">${message}</div>
        `;

        // Force reflow and show
        void popup.offsetWidth;
        popup.classList.remove('fade-out');
        popup.classList.add('show');

        // Stay visible for 5 seconds, then fade out smoothly
        popupTimer = setTimeout(() => {
            popup.classList.add('fade-out');
            fadeTimer = setTimeout(() => {
                popup.classList.remove('show', 'fade-out');
            }, 800);
        }, 5000);
    }

    // ─── RENDER PENDING PARCELS ────────────────────────────────
    let lastRenderedHash = '';
    async function renderParcels() {
        const allParcels = await DB.getParcels();
        const parcels = allParcels.filter(p => p.status === 'pending');
        
        const currentHash = JSON.stringify(parcels.map(p => p.id));
        if (currentHash === lastRenderedHash) return;
        lastRenderedHash = currentHash;

        parcelsList.innerHTML = '';

        if (parcels.length === 0) {
            parcelsList.innerHTML = '<p class="text-muted">No pending parcels awaiting pickup.</p>';
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
                <p><strong>Barcode ID:</strong> <code>${p.barcodeId}</code></p>
                <p><strong>Logged At:</strong> ${new Date(p.date).toLocaleString()}</p>
                <p class="mt-1" style="font-size:0.8rem; color:var(--text-muted);">Status: Awaiting Student Pickup</p>
            `;
            parcelsList.appendChild(card);
        });
    }

    // ─── LOG NEW PARCEL ────────────────────────────────────────
    document.getElementById('add-parcel-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('parcel-phone').value.trim();
        const name  = document.getElementById('parcel-name').value.trim();
        const gate  = document.getElementById('parcel-gate').value;
        const addMsgDiv = document.getElementById('parcel-msg');

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

        try {
            await DB.addParcel(newParcel);
            addMsgDiv.textContent = `Parcel logged successfully for ${name} at ${gate}! (Barcode: ${barcodeId})`;
            addMsgDiv.className = 'alert alert-success';
            addMsgDiv.classList.remove('hidden');

            document.getElementById('add-parcel-form').reset();
            lastRenderedHash = '';
            renderParcels();
            setTimeout(() => addMsgDiv.classList.add('hidden'), 4000);
        } catch (err) {
            addMsgDiv.textContent = `Failed to add parcel: ${err.message}`;
            addMsgDiv.className = 'alert alert-error';
            addMsgDiv.classList.remove('hidden');
        }
    });

    // ─── CORE AUTO-VERIFY PIPELINE (QR & BARCODE) ──────────────
    let isVerifying = false;
    let lastProcessedCode = null;
    let lastProcessedTime = 0;

    async function processVerification(rawCode) {
        if (!rawCode) return;
        let barcode = rawCode.trim();

        // Extract canonical BAR-XXXXXX code whether scanned from QR code or barcode
        const match = barcode.match(/BAR-[A-Z0-9]+/i);
        if (match) {
            barcode = match[0];
        }
        barcode = barcode.toUpperCase();

        // Avoid repeated rapid triggers of the exact same code within 3.5 seconds
        const now = Date.now();
        if (isVerifying || (barcode === lastProcessedCode && (now - lastProcessedTime) < 3500)) {
            return;
        }

        isVerifying = true;
        lastProcessedCode = barcode;
        lastProcessedTime = now;

        // Auto-paste code into the input field
        if (barcodeInput) {
            barcodeInput.value = barcode;
        }

        try {
            const parcel = await DB.findParcelByBarcode(barcode);

            if (parcel && parcel.status === 'pending') {
                // SUCCESS: Mark as delivered
                await DB.updateParcel(parcel.id, {
                    status: 'delivered',
                    deliveredDate: new Date().toISOString()
                });

                playScannerBeep(true);

                // Show popup of verified for 5 sec with fade
                showVerificationPopup(
                    'success',
                    '✅ Verified!',
                    `Parcel for <strong>${parcel.studentName}</strong> (${parcel.gate}) marked as delivered.`
                );

                // Clear input after short delay for next student
                setTimeout(() => {
                    if (barcodeInput) {
                        barcodeInput.value = '';
                        barcodeInput.focus();
                    }
                }, 1500);

                lastRenderedHash = '';
                renderParcels();
            } else {
                // FAILURE: Invalid, expired, or already used previously
                playScannerBeep(false);

                // Show exact message required by user
                showVerificationPopup(
                    'error',
                    'Verification Failed',
                    'Invalid QR or code already expired, or used previously'
                );
            }
        } catch (err) {
            console.error("Verification error:", err);
            playScannerBeep(false);
            showVerificationPopup(
                'error',
                'Verification Failed',
                'Invalid QR or code already expired, or used previously'
            );
        } finally {
            isVerifying = false;
            if (barcodeInput) barcodeInput.focus();
        }
    }

    // 1. Form submit handler (Manual button or Enter)
    document.getElementById('verify-parcel-form').addEventListener('submit', (e) => {
        e.preventDefault();
        processVerification(barcodeInput.value);
    });

    // 2. On Paste: Instant automatic paste and verification
    barcodeInput.addEventListener('paste', () => {
        setTimeout(() => {
            const val = barcodeInput.value.trim();
            if (val) processVerification(val);
        }, 50);
    });

    // 3. On Input: Auto-verify on hardware barcode scanner gun or typing
    let inputDebounceTimer = null;
    barcodeInput.addEventListener('input', () => {
        const val = barcodeInput.value.trim();
        clearTimeout(inputDebounceTimer);

        if (!val) return;

        // Pattern matching standard barcode format (e.g. BAR-XXXXXX) -> auto-verify immediately!
        if (/^BAR-[A-Z0-9]{4,}$/i.test(val)) {
            processVerification(val);
            return;
        }

        // If at least 6 characters entered, auto-verify after brief 350ms pause
        if (val.length >= 6) {
            inputDebounceTimer = setTimeout(() => {
                processVerification(val);
            }, 350);
        }
    });

    // ─── DUAL-ENGINE CAMERA SCANNER (ZXing + Html5Qrcode) ───────
    let zxingReader = null;
    let html5QrCode = null;
    const scannerContainer = document.getElementById('scanner-container');
    const toggleCameraBtn  = document.getElementById('toggle-camera-btn');
    const stopCameraBtn    = document.getElementById('stop-camera-btn');
    const scannerVideo     = document.getElementById('scanner-video');
    const qrReaderDiv      = document.getElementById('qr-reader');

    async function startCameraScanner() {
        scannerContainer.classList.remove('hidden');
        toggleCameraBtn.disabled = true;

        // ENGINE 1: ZXing BrowserMultiFormatReader (Instant QR & Barcode detection)
        if (window.ZXing && window.ZXing.BrowserMultiFormatReader) {
            try {
                scannerVideo.style.display = 'block';
                if (qrReaderDiv) qrReaderDiv.style.display = 'none';

                zxingReader = new window.ZXing.BrowserMultiFormatReader();
                const videoInputDevices = await zxingReader.listVideoInputDevices();

                let selectedDeviceId = undefined;
                if (videoInputDevices && videoInputDevices.length > 0) {
                    const backCamera = videoInputDevices.find(dev =>
                        dev.label.toLowerCase().includes('back') ||
                        dev.label.toLowerCase().includes('rear') ||
                        dev.label.toLowerCase().includes('environment')
                    );
                    selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
                }

                await zxingReader.decodeFromVideoDevice(selectedDeviceId, 'scanner-video', (result, err) => {
                    if (result) {
                        const code = result.getText();
                        console.log("ZXing scanned:", code);
                        processVerification(code);
                    }
                    // NotFoundException fires on every non-barcode frame — suppress it
                    if (err && err.name !== 'NotFoundException') {
                        console.warn("ZXing error:", err);
                    }
                });
                return;
            } catch (zxingErr) {
                console.warn("ZXing scanner failed, trying Html5Qrcode fallback:", zxingErr);
            }
        }

        // ENGINE 2: Html5Qrcode Fallback
        if (window.Html5Qrcode) {
            try {
                scannerVideo.style.display = 'none';
                if (qrReaderDiv) qrReaderDiv.style.display = 'block';

                html5QrCode = new Html5Qrcode("qr-reader");
                const config = { fps: 15 };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        console.log("Html5Qrcode scanned:", decodedText);
                        processVerification(decodedText);
                    },
                    () => {}
                );
            } catch (err) {
                console.error("Camera start error:", err);
                alert("Could not start camera: " + (err.message || err));
                await stopCameraScanner();
            }
        } else {
            alert('Camera scanner library is not loaded. Please enter code manually.');
            await stopCameraScanner();
        }
    }

    async function stopCameraScanner() {
        if (zxingReader) {
            try {
                zxingReader.reset();
            } catch (_) {}
            zxingReader = null;
        }
        if (html5QrCode) {
            try {
                await html5QrCode.stop();
                html5QrCode.clear();
            } catch (_) {}
            html5QrCode = null;
        }
        scannerContainer.classList.add('hidden');
        toggleCameraBtn.disabled = false;
        if (barcodeInput) barcodeInput.focus();
    }

    if (toggleCameraBtn) toggleCameraBtn.addEventListener('click', startCameraScanner);
    if (stopCameraBtn) stopCameraBtn.addEventListener('click', stopCameraScanner);

    renderParcels();
});
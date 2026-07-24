(function () {
    'use strict';

    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    const BOOKMARKLET_NAME = 'canva-agenda';
    const BOOKMARKLET_ID   = BOOKMARKLET_NAME + '-' + simpleHash(BOOKMARKLET_NAME);

    const existing = document.getElementById(BOOKMARKLET_ID);
    if (existing) existing.remove();
    const existingStyles = document.getElementById(BOOKMARKLET_ID + '-styles');
    if (existingStyles) existingStyles.remove();

    const DELAY_STEP      = 400;
    const DELAY_PAGE_ADD  = 3500;  // wait for Canva to render + auto-focus new page
    const DELAY_IMG_PLACE = 3000;  // wait for image to land + auto-select
    const DELAY_POSITION  = 800;
    const DELAY_INPUT     = 600;
    const DELAY_ALIGN     = 500;

    const UPLOADS_TAB_SELECTORS = [
        'button[role="tab"] div[title="Uploads"]',
        'button[role="tab"] div[aria-label="Uploads"]',
        'button[role="tab"]:has(div[title="Uploads"])',
    ];
    const THUMB_SELECTORS = [
        'div.tOhFhQ[role="button"]',
        'div.BE2rWg[draggable="true"]',
        '.xDrn5A [role="button"]',
        'aside [draggable="true"]',
    ];
    const ADD_PAGE_SELECTORS = [
        '[data-testid="add-page-button"]',
        '[aria-label="Add page"]',
        '[aria-label="Ajouter une page"]',
        '[aria-label*="Add page"]',
        '[aria-label*="Ajouter une page"]',
    ];

    let running = false;
    let stopRequested = false;
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function waitFor(fn, tries, interval) {
        for (let i = 0; i < tries; i++) {
            const el = fn();
            if (el) return el;
            await sleep(interval);
        }
        return null;
    }

    function setStatus(msg, type) {
        const el = document.getElementById(BOOKMARKLET_ID + '-status');
        if (!el) return;
        el.textContent = msg;
        el.className = 'status-value' + (type ? ' ' + type : '');
    }

    function setProgress(done, total) {
        const section = document.getElementById(BOOKMARKLET_ID + '-progress-section');
        const bar     = document.getElementById(BOOKMARKLET_ID + '-progress-bar');
        const text    = document.getElementById(BOOKMARKLET_ID + '-progress-text');
        if (!section) return;
        section.style.display = total > 0 ? '' : 'none';
        if (bar)  bar.style.width  = total > 0 ? Math.round(done / total * 100) + '%' : '0%';
        if (text) text.textContent = done + ' / ' + total;
    }

    async function ensureUploadsOpen() {
        if (document.querySelector('div.tOhFhQ[role="button"]')) return;
        for (const sel of UPLOADS_TAB_SELECTORS) {
            const el = document.querySelector(sel);
            if (el) { (el.closest('button') || el).click(); await sleep(1000); return; }
        }
    }

    function findAddPageBtn() {
        for (const sel of ADD_PAGE_SELECTORS) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return [...document.querySelectorAll('button,[role="button"]')].find(b => {
            const label = (b.getAttribute('aria-label') || b.title || '').toLowerCase();
            return label === 'add page' || label === 'ajouter une page';
        }) || null;
    }

    function getThumbName(el) {
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
        const p = el.closest('[aria-label]') || el.closest('[title]') || el;
        return p.getAttribute('aria-label') || p.getAttribute('title') || '';
    }

    function getClickTarget(thumb) {
        if (thumb.getAttribute('role') === 'button') return thumb;
        return thumb.querySelector('[role="button"]') || thumb;
    }

    function setInputValue(input, value) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new Event('input',  { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup',   { key: 'Enter', keyCode: 13, bubbles: true }));
        input.blur();
    }

    function findBtnByText(...labels) {
        const lower = labels.map(l => l.toLowerCase());
        return [...document.querySelectorAll('button,[role="button"]')].find(b => {
            const txt  = (b.innerText || '').trim().toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            return lower.some(l => txt === l || aria === l);
        }) || null;
    }

    async function applyPositionAndSize() {
        // Position button is in the top toolbar — only visible when image is selected
        // Wait up to 8s for it to appear after image placement
        const posBtn = await waitFor(
            () => document.querySelector('button[aria-label="Position"]'),
            16, 500
        );
        if (!posBtn) {
            console.warn('[canva-agenda] Position button not found');
            return;
        }
        posBtn.click();
        await sleep(DELAY_POSITION);

        // W / H inputs in the Position side panel
        // order: Width(0), Height(1), X(2), Y(3), Rotate(4)
        const inputs = [...document.querySelectorAll('input.LMU2Kg[inputmode="decimal"]')];
        if (inputs.length >= 2) {
            setInputValue(inputs[0], '8.5 in');
            await sleep(DELAY_INPUT);
            setInputValue(inputs[1], '11 in');
            await sleep(DELAY_INPUT);
        }

        // Align Top then Center (EN + FR)
        const topBtn = findBtnByText('Top', 'Haut');
        if (topBtn) { topBtn.click(); await sleep(DELAY_ALIGN); }

        const centerBtn = findBtnByText('Center', 'Centre');
        if (centerBtn) { centerBtn.click(); await sleep(DELAY_ALIGN); }

        // Close the Position panel
        const closeBtn = document.querySelector(
            'button[aria-label="Close"], [class*="positionPanel"] button[aria-label="Close"]'
        );
        if (closeBtn) { closeBtn.click(); await sleep(300); }
    }

    async function run() {
        if (running) return;
        running = true;
        stopRequested = false;
        const runBtn = document.getElementById(BOOKMARKLET_ID + '-run-btn');
        if (runBtn) runBtn.disabled = true;

        try {
            setStatus('Opening Uploads panel…');
            await ensureUploadsOpen();
            setStatus('Scanning images…');

            let thumbs = [];
            for (const sel of THUMB_SELECTORS) {
                thumbs = [...document.querySelectorAll(sel)];
                if (thumbs.length > 0) break;
            }
            if (thumbs.length === 0) {
                setStatus('No uploads found. Open the Uploads panel first.', 'error');
                return;
            }

            const filterInput = prompt(
                'Found ' + thumbs.length + ' uploaded images.\nFilter by name (e.g. "semaine"), or blank for ALL:',
                'semaine'
            );
            if (filterInput === null) { setStatus('Cancelled.'); return; }

            const filter   = filterInput.trim().toLowerCase();
            const filtered = thumbs.filter(t => !filter || getThumbName(t).toLowerCase().includes(filter));
            if (filtered.length === 0) { setStatus('No images match "' + filter + '".', 'error'); return; }
            if (!confirm('Will add ' + filtered.length + ' pages, one image per page (8.5×11in, top-center).\n\nContinue?')) {
                setStatus('Cancelled.'); return;
            }

            setProgress(0, filtered.length);

            for (let i = 0; i < filtered.length; i++) {
                if (stopRequested) { setStatus('Stopped at ' + i + ' / ' + filtered.length + '.', 'error'); break; }

                const thumb  = filtered[i];
                const target = getClickTarget(thumb);
                const name   = getThumbName(target) || getThumbName(thumb) || ('image ' + (i + 1));

                // 1. Add new page — Canva auto-focuses the new page after this
                setStatus('[' + (i+1) + '/' + filtered.length + '] Adding page…');
                const addBtn = findAddPageBtn();
                if (!addBtn) { setStatus('"Add page" not found.', 'error'); break; }
                addBtn.click();

                // 2. Wait for page to be created AND auto-focused by Canva
                //    Do NOT click anything else here — let Canva handle the focus
                await sleep(DELAY_PAGE_ADD);
                if (stopRequested) break;

                // 3. Place image by double-clicking the upload thumbnail
                //    Canva places it on the currently focused page
                setStatus('[' + (i+1) + '/' + filtered.length + '] Placing: ' + name);
                target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                await sleep(DELAY_STEP);
                target.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true }));
                await sleep(DELAY_STEP);
                target.click();
                await sleep(DELAY_STEP);
                target.dispatchEvent(new MouseEvent('dblclick',  { bubbles: true }));

                // 4. Wait for image to land and become selected
                await sleep(DELAY_IMG_PLACE);
                if (stopRequested) break;

                // 5. Size (8.5×11in) + align top + center via Position panel
                setStatus('[' + (i+1) + '/' + filtered.length + '] Sizing & aligning…');
                await applyPositionAndSize();

                setProgress(i + 1, filtered.length);
                await sleep(400);
            }

            if (!stopRequested) setStatus('\u2705 Done! ' + filtered.length + ' pages created.', 'success');

        } catch (err) {
            console.error('[canva-agenda]', err);
            setStatus('Error: ' + err.message, 'error');
        } finally {
            running = false;
            if (runBtn) runBtn.disabled = false;
        }
    }

    function stop() { stopRequested = true; setStatus('Stopping…'); }

    const HTML_TEMPLATE = '{{HTML_CONTENT}}';
    const CSS_TEMPLATE  = '{{CSS_CONTENT}}';

    const styleEl = document.createElement('style');
    styleEl.id = BOOKMARKLET_ID + '-styles';
    styleEl.textContent = CSS_TEMPLATE.replace(/\{\{BOOKMARKLET_ID\}\}/g, BOOKMARKLET_ID);
    document.head.appendChild(styleEl);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = HTML_TEMPLATE.replace(/\{\{BOOKMARKLET_ID\}\}/g, BOOKMARKLET_ID);
    document.body.appendChild(wrapper.firstElementChild);

    document.getElementById(BOOKMARKLET_ID + '-close-btn').addEventListener('click', function () {
        const p = document.getElementById(BOOKMARKLET_ID); if (p) p.remove();
        const s = document.getElementById(BOOKMARKLET_ID + '-styles'); if (s) s.remove();
    });
    document.getElementById(BOOKMARKLET_ID + '-run-btn').addEventListener('click', run);
    document.getElementById(BOOKMARKLET_ID + '-stop-btn').addEventListener('click', stop);

})();

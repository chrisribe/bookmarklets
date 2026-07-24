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

    const DELAY_PAGE_ADD   = 2000;  // after Add Page click
    const DELAY_IMG_PLACE  = 1800;  // after image dblclick
    const DELAY_POSITION   = 800;   // after opening Position panel
    const DELAY_INPUT      = 400;   // after setting W/H inputs
    const DELAY_ALIGN      = 500;   // after each align click
    const DELAY_STEP       = 300;

    // ── Real selectors from live Canva DOM (July 2025) ────────────────────────

    const UPLOADS_TAB_SELECTORS = [
        'button[role="tab"] div[title="Uploads"]',
        'button[role="tab"] div[aria-label="Uploads"]',
        'button[role="tab"]:has(div[title="Uploads"])',
    ];

    const THUMB_SELECTORS = [
        'div.tOhFhQ[role="button"]',    // real: upload item, aria-label=filename
        'div.BE2rWg[draggable="true"]',  // real: draggable wrapper
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

    // Position panel button (in the top toolbar when image is selected)
    const POSITION_BTN_SEL = 'button[aria-label="Position panel open"]';

    let running = false;
    let stopRequested = false;

    const sleep = ms => new Promise(r => setTimeout(r, ms));

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
        if (document.querySelector('div.tOhFhQ[role="button"]')) return true;
        for (const sel of UPLOADS_TAB_SELECTORS) {
            const el = document.querySelector(sel);
            if (el) { (el.closest('button') || el).click(); await sleep(800); return true; }
        }
        return false;
    }

    function findAddPageBtn() {
        for (const sel of ADD_PAGE_SELECTORS) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return [...document.querySelectorAll('button,[role="button"]')].find(b => {
            const label = (b.getAttribute('aria-label') || b.title || b.innerText || '').toLowerCase();
            return label === 'add page' || label === 'ajouter une page';
        }) || null;
    }

    // Click the last page in the pages panel to ensure it’s selected
    function selectLastPage() {
        // Pages panel thumbnails — try common selectors
        const candidates = [
            '[data-testid="page-thumbnail"]',
            '[data-testid="timeline-page-thumbnail"]',
            '[class*="pageThumbnail"]',
            '[class*="pageCard"]',
            '[aria-label*="Page "]',
        ];
        for (const sel of candidates) {
            const all = document.querySelectorAll(sel);
            if (all.length > 0) { all[all.length - 1].click(); return true; }
        }
        return false;
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

    // Set a Canva position-panel input value and fire React’s synthetic events
    function setInputValue(input, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, value);
        input.dispatchEvent(new Event('input',  { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup',   { key: 'Enter', keyCode: 13, bubbles: true }));
        input.blur();
    }

    // Find a button by its visible text label (case-insensitive)
    function findBtnByText(text) {
        const lower = text.toLowerCase();
        return [...document.querySelectorAll('button,[role="button"]')].find(b =>
            (b.innerText || '').trim().toLowerCase() === lower ||
            (b.getAttribute('aria-label') || '').toLowerCase() === lower
        ) || null;
    }

    // Open Position panel, set W=8.5in H=11in, align Top + Center
    async function applyPositionAndSize() {
        // 1. Open Position panel (only visible when element is selected)
        const posBtn = document.querySelector(POSITION_BTN_SEL);
        if (!posBtn) { console.warn('[canva-agenda] Position button not found'); return; }
        posBtn.click();
        await sleep(DELAY_POSITION);

        // 2. Set Width = 8.5 in, Height = 11 in
        // The Position panel inputs are input.LMU2Kg[inputmode="decimal"]
        // Order in panel: Width(0), Height(1), X(2), Y(3), Rotate(4)
        const inputs = [...document.querySelectorAll('input.LMU2Kg[inputmode="decimal"]')];
        if (inputs.length >= 2) {
            setInputValue(inputs[0], '8.5 in');  // Width
            await sleep(DELAY_INPUT);
            setInputValue(inputs[1], '11 in');   // Height
            await sleep(DELAY_INPUT);
        }

        // 3. Align Top (align to page — button text “Top”)
        const topBtn = findBtnByText('Top');
        if (topBtn) { topBtn.click(); await sleep(DELAY_ALIGN); }

        // 4. Align Center (horizontally centered — button text “Center”)
        const centerBtn = findBtnByText('Center');
        if (centerBtn) { centerBtn.click(); await sleep(DELAY_ALIGN); }
    }

    // ── Main run loop ───────────────────────────────────────────────────────────
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

                // 1. Add new page
                setStatus('[' + (i+1) + '/' + filtered.length + '] Adding page…');
                const addBtn = findAddPageBtn();
                if (!addBtn) { setStatus('"Add page" not found — scroll canvas to reveal it.', 'error'); break; }
                addBtn.click();
                await sleep(DELAY_PAGE_ADD);
                if (stopRequested) break;

                // 2. Click the last page to make sure it’s selected (prevents double-stacking)
                selectLastPage();
                await sleep(DELAY_STEP);

                // 3. Place image via dblclick on thumbnail
                setStatus('[' + (i+1) + '/' + filtered.length + '] Placing: ' + name);
                target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                await sleep(DELAY_STEP);
                target.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true }));
                await sleep(DELAY_STEP);
                target.click();
                await sleep(DELAY_STEP);
                target.dispatchEvent(new MouseEvent('dblclick',  { bubbles: true }));
                await sleep(DELAY_IMG_PLACE);
                if (stopRequested) break;

                // 4. Set size 8.5×11in + align Top + Center
                setStatus('[' + (i+1) + '/' + filtered.length + '] Sizing & aligning…');
                await applyPositionAndSize();

                setProgress(i + 1, filtered.length);
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

    // ── Inject UI (CSP-safe: no inline onclick) ───────────────────────────────
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
        const p = document.getElementById(BOOKMARKLET_ID);
        if (p) p.remove();
        const s = document.getElementById(BOOKMARKLET_ID + '-styles');
        if (s) s.remove();
    });
    document.getElementById(BOOKMARKLET_ID + '-run-btn').addEventListener('click', run);
    document.getElementById(BOOKMARKLET_ID + '-stop-btn').addEventListener('click', stop);

})();

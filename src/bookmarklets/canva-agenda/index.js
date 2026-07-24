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

    const DELAY_PAGE_ADD  = 600;   // wait for new page to appear in strip
    const DELAY_IMG_PLACE = 1500;  // wait for image to land + select
    const DELAY_POSITION  = 400;   // wait for Position panel to open
    const DELAY_INPUT     = 300;   // wait after width set
    const DELAY_ALIGN     = 200;   // wait after each align click

    // ── Stable selectors (aria-label/role only — class names are hashed and change on deploy) ──

    // Page strip: count pages by aria-label="Page N", click parent to focus
    const PAGE_COUNT_SEL  = '[aria-label^="Page "][aria-label$="1"],[aria-label^="Page "]';
    const PAGE_STRIP_SEL  = '[aria-label^="Page "]';

    // Upload thumbnails — role=button with aria-label=filename
    const THUMB_SELECTORS = [
        '[role="button"][aria-label*="300dpi"]',   // our exported filenames contain 300dpi
        '[role="button"][aria-label*=".png"]',     // any png upload
        '[role="button"][aria-label*="semaine"]',  // agenda-specific
        '[draggable="true"][role="button"]',       // any draggable upload item
        'aside [draggable="true"]',
    ];

    // Position button in top toolbar
    const POSITION_BTN_SEL = 'button[aria-label="Position"]';

    // Add Page button
    const ADD_PAGE_SELECTORS = [
        'button[aria-label="Add page"]',
        'button[aria-label="Ajouter une page"]',
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
        // Check if uploads are visible: any role=button with a png filename
        if (document.querySelector('[role="button"][aria-label*=".png"], [role="button"][aria-label*="300dpi"]')) return;
        // Click the Uploads tab by its aria-label
        const tab = document.querySelector(
            'button[role="tab"][aria-label="Uploads"], button[role="tab"][aria-label="T\u00e9l\u00e9chargements"]'
        );
        if (tab) { tab.click(); await sleep(800); }
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

    // Wait for a new page to appear in the strip, then click it
    async function focusNewPage(previousCount) {
        let pages;
        for (let i = 0; i < 30; i++) {  // up to 6s
            pages = document.querySelectorAll(PAGE_STRIP_SEL);
            if (pages.length > previousCount) break;
            await sleep(200);
        }
        pages = document.querySelectorAll(PAGE_STRIP_SEL);
        if (pages.length > 0) {
            pages[pages.length - 1].click();
            await sleep(200);
            return pages.length;
        }
        return previousCount;
    }

    function getThumbName(el) {
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
        const p = el.closest('[aria-label]') || el.closest('[title]') || el;
        return p.getAttribute('aria-label') || p.getAttribute('title') || '';
    }

    function getClickTarget(thumb) {
        if (thumb.tagName === 'BUTTON') return thumb;
        if (thumb.getAttribute('role') === 'button') return thumb;
        return thumb.querySelector('button,[role="button"]') || thumb;
    }

    function setInputValue(input, value) {
        // Match exactly what Chrome Recorder does: set value + fire 'change'
        // Canva listens to 'change', not 'input' or keypress
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new Event('change', { bubbles: true }));
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
        // Wait for Position button (only visible when element selected)
        const posBtn = await waitFor(
            () => document.querySelector(POSITION_BTN_SEL),
            16, 500
        );
        if (!posBtn) { console.warn('[canva-agenda] Position button not found'); return; }
        posBtn.click();
        await sleep(DELAY_POSITION);

        // Find Width input by its label text (recorder: aria/Width)
        // Label structure: <label for="_r_xxx_"><span>Width</span></label>
        function findInputByLabelText(text) {
            for (const label of document.querySelectorAll('label')) {
                if ((label.textContent || '').trim() === text) {
                    const id = label.getAttribute('for');
                    if (id) return document.getElementById(id);
                }
            }
            // Also try aria-labelledby
            for (const input of document.querySelectorAll('input[aria-labelledby]')) {
                const labelEl = document.getElementById(input.getAttribute('aria-labelledby'));
                if (labelEl && (labelEl.textContent || '').trim() === text) return input;
            }
            return null;
        }

        const widthInput = await waitFor(() => findInputByLabelText('Width'), 8, 400);
        if (widthInput) {
            setInputValue(widthInput, '8.5');
            await sleep(DELAY_INPUT);
        } else {
            console.warn('[canva-agenda] Width input not found');
        }

        // Find Top and Center buttons scoped to the Position panel
        // The panel is the aside/panel that appeared after clicking Position
        // Recorder: button[1] = Top, button[4] = Center in "Align to page" section
        function findAlignBtn(text) {
            const lower = text.toLowerCase();
            // Look for button containing a <p> with exact text (from recorder structure)
            for (const p of document.querySelectorAll('p')) {
                if ((p.textContent || '').trim().toLowerCase() === lower) {
                    const btn = p.closest('button');
                    if (btn && btn.offsetParent) return btn;
                }
            }
            // fallback: button by innerText
            return [...document.querySelectorAll('button')].find(b =>
                (b.innerText || '').trim().toLowerCase() === lower && b.offsetParent
            ) || null;
        }

        const topBtn = await waitFor(() => findAlignBtn('Top'), 6, 300);
        if (topBtn) { topBtn.click(); await sleep(DELAY_ALIGN); }
        else console.warn('[canva-agenda] Top button not found');

        const centerBtn = await waitFor(() => findAlignBtn('Center'), 6, 300);
        if (centerBtn) { centerBtn.click(); await sleep(DELAY_ALIGN); }
        else console.warn('[canva-agenda] Center button not found');

        // Close Position panel
        const closeBtn = document.querySelector('button[aria-label="Close"]');
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

                // 1. Count current pages, then add a new one
                setStatus('[' + (i+1) + '/' + filtered.length + '] Adding page…');
                const pagesBefore = document.querySelectorAll(PAGE_STRIP_SEL).length;
                const addBtn = findAddPageBtn();
                if (!addBtn) { setStatus('"Add page" not found.', 'error'); break; }
                addBtn.click();

                // 2. Wait for new page in strip, click it once to focus
                await focusNewPage(pagesBefore);
                if (stopRequested) break;

                // 3. Place image
                setStatus('[' + (i+1) + '/' + filtered.length + '] Placing: ' + name);
                target.click();
                target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                await sleep(DELAY_IMG_PLACE);
                if (stopRequested) break;

                // 4. Size + align
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

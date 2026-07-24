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

    // ── Selectors from Chrome Recorder JSON (exact) ───────────────────────

    // Pages strip: one div per page, aria-label="Page N"
    const PAGE_STRIP_SEL = 'div._pFsfA[aria-label^="Page "]';

    // Upload thumbnails — div.tOhFhQ has aria-label=filename for filtering
    // div._4_LWAA is the Add Page container — NOT a thumbnail, removed
    const THUMB_SELECTORS = [
        'div.tOhFhQ[role="button"]',      // real: aria-label=filename
        'div.BE2rWg[draggable="true"]',   // draggable wrapper fallback
        'aside [draggable="true"]',
    ];

    // Position button: aria/Position[role="button"] → click the span inside
    // Recording used: div:nth-of-type(11) span — too fragile. Use aria instead:
    const POSITION_BTN_SEL = 'button[aria-label="Position"]';

    // Add Page button — the one at the bottom of the pages strip
    // div._4_LWAA > div.UUnYqA > button[aria-label="Add page"]
    const ADD_PAGE_SELECTORS = [
        'div.UUnYqA button[aria-label="Add page"]',   // exact from live DOM
        'div._4_LWAA button[aria-label="Add page"]',  // broader
        '[aria-label="Add page"]',
        '[aria-label="Ajouter une page"]',
    ];

    const UPLOADS_TAB_SELECTORS = [
        'button[role="tab"] div[title="Uploads"]',
        'button[role="tab"] div[aria-label="Uploads"]',
        'button[role="tab"]:has(div[title="Uploads"])',
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
        if (document.querySelector('div.tOhFhQ[role="button"], div._4_LWAA > div > button')) return;
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
            const lower = text.toLowerCase();
            for (const label of document.querySelectorAll('label')) {
                if ((label.textContent || '').trim().toLowerCase() === lower) {
                    const id = label.getAttribute('for');
                    if (id) return document.getElementById(id);
                }
            }
            // fallback: span with label text inside a group containing an input
            for (const span of document.querySelectorAll('span')) {
                if ((span.textContent || '').trim() === text) {
                    const group = span.closest('div[class]');
                    if (group) {
                        const inp = group.parentElement && group.parentElement.querySelector('input');
                        if (inp) return inp;
                    }
                }
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

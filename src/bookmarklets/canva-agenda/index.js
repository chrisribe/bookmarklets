(function () {
    'use strict';

    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    const BOOKMARKLET_NAME = 'canva-agenda';
    const BOOKMARKLET_ID = BOOKMARKLET_NAME + '-' + simpleHash(BOOKMARKLET_NAME);
    const SAFE_FN = BOOKMARKLET_ID.replace(/-/g, '_');

    // Remove existing instance
    const existing = document.getElementById(BOOKMARKLET_ID);
    if (existing) existing.remove();
    const existingStyles = document.getElementById(BOOKMARKLET_ID + '-styles');
    if (existingStyles) existingStyles.remove();

    // ── Constants ────────────────────────────────────────────────────────────────
    const DELAY_PAGE_ADD  = 1800;  // ms after clicking Add Page
    const DELAY_IMG_PLACE = 1400;  // ms after placing image
    const DELAY_STEP      = 350;   // ms between sub-actions

    // Canva upload thumbnail selectors — tries most specific first
    const THUMB_SELECTORS = [
        '[data-testid="upload-thumbnail"]',
        '[class*="uploadThumbnail"]',
        '[class*="_uploadItem"]',
        '[data-component="image-upload-thumbnail"]',
        '[data-testid="uploads-panel"] [draggable="true"]',
    ];

    // Canva "Add page" button selectors
    const ADD_PAGE_SELECTORS = [
        '[data-testid="add-page-button"]',
        '[aria-label*="Add page"]',
        '[aria-label*="Ajouter une page"]',
        'button[class*="addPage"]',
    ];

    // ── State ────────────────────────────────────────────────────────────────────
    let running = false;
    let stopRequested = false;

    // ── Helpers ──────────────────────────────────────────────────────────────────
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

    function findAddPageBtn() {
        for (const sel of ADD_PAGE_SELECTORS) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return [...document.querySelectorAll('button')].find(b =>
            (b.getAttribute('aria-label') || b.title || '').toLowerCase().includes('add page') ||
            (b.getAttribute('aria-label') || b.title || '').toLowerCase().includes('ajouter une page')
        ) || null;
    }

    function getThumbName(thumb) {
        const el = thumb.closest('[aria-label]') || thumb.closest('[title]') || thumb;
        return el.getAttribute('aria-label') || el.getAttribute('title') || thumb.alt || '';
    }

    // ── Main run loop ────────────────────────────────────────────────────────────
    async function run() {
        if (running) return;
        running = true;
        stopRequested = false;

        const runBtn = document.getElementById(BOOKMARKLET_ID + '-run-btn');
        if (runBtn) runBtn.disabled = true;

        try {
            setStatus('Scanning Uploads panel…');

            let thumbs = [];
            for (const sel of THUMB_SELECTORS) {
                thumbs = [...document.querySelectorAll(sel)];
                if (thumbs.length > 0) break;
            }

            // Fallback: draggable items inside aside / side panel
            if (thumbs.length === 0) {
                const panel = document.querySelector(
                    '[data-testid="side-panel"], [class*="sidePanel"], aside'
                );
                if (panel) {
                    thumbs = [...panel.querySelectorAll('[draggable="true"]')];
                }
            }

            if (thumbs.length === 0) {
                setStatus('No uploads found. Open the Uploads panel and make sure images are visible.', 'error');
                return;
            }

            setStatus('Found ' + thumbs.length + ' images.');

            // Ask for filter
            const filterInput = prompt(
                'Found ' + thumbs.length + ' uploaded images.\n' +
                'Filter by name (e.g. "semaine" or "lun-mer"), or leave blank for ALL:',
                'semaine'
            );
            if (filterInput === null) { setStatus('Cancelled.'); return; }

            const filter = filterInput.trim().toLowerCase();
            const filtered = thumbs.filter(t =>
                !filter || getThumbName(t).toLowerCase().includes(filter)
            );

            if (filtered.length === 0) {
                setStatus('No images match "' + filter + '". Try a different filter.', 'error');
                return;
            }

            const ok = confirm(
                'Will add ' + filtered.length + ' pages, one image per page.\n\nContinue?'
            );
            if (!ok) { setStatus('Cancelled.'); return; }

            setProgress(0, filtered.length);

            for (let i = 0; i < filtered.length; i++) {
                if (stopRequested) {
                    setStatus('Stopped at ' + i + ' / ' + filtered.length + '.', 'error');
                    break;
                }

                const thumb = filtered[i];
                const name  = getThumbName(thumb) || ('image ' + (i + 1));

                // 1. Add new page
                setStatus('[' + (i + 1) + '/' + filtered.length + '] Adding page…');
                const addBtn = findAddPageBtn();
                if (!addBtn) {
                    setStatus('Could not find "Add page" button. Stopped.', 'error');
                    break;
                }
                addBtn.click();
                await sleep(DELAY_PAGE_ADD);

                if (stopRequested) break;

                // 2. Place image — double-click triggers Canva "add to page"
                setStatus('[' + (i + 1) + '/' + filtered.length + '] Placing: ' + name);
                thumb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                await sleep(DELAY_STEP);
                thumb.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true }));
                await sleep(DELAY_STEP);
                thumb.click();
                await sleep(DELAY_STEP);
                thumb.dispatchEvent(new MouseEvent('dblclick',  { bubbles: true }));
                await sleep(DELAY_IMG_PLACE);

                setProgress(i + 1, filtered.length);
            }

            if (!stopRequested) {
                setStatus('\u2705 Done! ' + filtered.length + ' pages created.', 'success');
            }

        } catch (err) {
            console.error('[canva-agenda]', err);
            setStatus('Error: ' + err.message, 'error');
        } finally {
            running = false;
            if (runBtn) runBtn.disabled = false;
        }
    }

    function stop() {
        stopRequested = true;
        setStatus('Stopping…');
    }

    // ── Inject UI ────────────────────────────────────────────────────────────────
    const HTML_TEMPLATE = '{{HTML_CONTENT}}';
    const CSS_TEMPLATE  = '{{CSS_CONTENT}}';

    const CSS_CONTENT = CSS_TEMPLATE.replace(/\{\{BOOKMARKLET_ID\}\}/g, BOOKMARKLET_ID);
    const styleEl = document.createElement('style');
    styleEl.id = BOOKMARKLET_ID + '-styles';
    styleEl.textContent = CSS_CONTENT;
    document.head.appendChild(styleEl);

    const panel = document.createElement('div');
    panel.innerHTML = HTML_TEMPLATE
        .replace(/\{\{BOOKMARKLET_ID\}\}/g, BOOKMARKLET_ID)
        .replace(/\{\{CLOSE_HANDLER\}\}/g,
            `(function(){document.getElementById('${BOOKMARKLET_ID}').remove();` +
            `document.getElementById('${BOOKMARKLET_ID}-styles').remove();})()`)
        .replace(/\{\{RUN_HANDLER\}\}/g,  `window.${SAFE_FN}_run()`)
        .replace(/\{\{STOP_HANDLER\}\}/g, `window.${SAFE_FN}_stop()`);
    document.body.appendChild(panel.firstElementChild);

    window[SAFE_FN + '_run']  = run;
    window[SAFE_FN + '_stop'] = stop;

})();

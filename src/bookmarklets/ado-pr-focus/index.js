(function() {
    'use strict';

    const BOOKMARKLET_ID = 'ado-pr-focus';
    const STORAGE_KEY = 'ado_pr_focus_mode';
    
    // Elements to hide for focus mode
    const FOCUS_SELECTORS = [
        '.project-header',              // Top navigation bar with breadcrumbs
        '.repos-pr-header',             // PR title, status, approve buttons, reviewers
        '.repos-pr-details-page-tabbar', // Tab bar (Overview, Files, Updates, etc.)
        '.repos-compare-toolbar'         // Filter/toolbar area
    ];
    
    // Check if we're on an ADO PR page
    function isAdoPrPage() {
        return window.location.href.includes('/_git/') && 
               window.location.href.includes('/pullrequest/');
    }
    
    if (!isAdoPrPage()) {
        alert('This bookmarklet only works on Azure DevOps Pull Request pages.');
        return;
    }
    
    // Remove existing FAB if present (toggle behavior)
    const existingFab = document.getElementById(BOOKMARKLET_ID + '-fab');
    if (existingFab) {
        existingFab.remove();
        const existingStyles = document.getElementById(BOOKMARKLET_ID + '-styles');
        if (existingStyles) existingStyles.remove();
        // Restore hidden elements
        FOCUS_SELECTORS.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.removeProperty('display');
            });
        });
        try { sessionStorage.removeItem(STORAGE_KEY); } catch(e) {}
        return;
    }
    
    // Get/set focus mode state
    function getFocusState() {
        try { return sessionStorage.getItem(STORAGE_KEY) === 'true'; } 
        catch (e) { return false; }
    }
    
    function setFocusState(enabled) {
        try { sessionStorage.setItem(STORAGE_KEY, enabled.toString()); } 
        catch (e) {}
    }
    
    // Apply focus mode to page elements
    function applyFocusMode(enabled) {
        FOCUS_SELECTORS.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (enabled) {
                    el.style.setProperty('display', 'none', 'important');
                } else {
                    el.style.removeProperty('display');
                }
            });
        });
        setFocusState(enabled);
        updateFabState(enabled);
    }
    
    // Update FAB button appearance
    function updateFabState(enabled) {
        const toggleBtn = document.getElementById(BOOKMARKLET_ID + '-toggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = enabled ? 'Focus - on' : 'Focus - off';
            toggleBtn.title = enabled ? 'Click to show headers' : 'Click to hide headers';
        }
    }
    
    // Inject styles
    const styles = document.createElement('style');
    styles.id = BOOKMARKLET_ID + '-styles';
    styles.textContent = `
        #${BOOKMARKLET_ID}-fab {
            position: fixed;
            right: -90px;
            top: 30px;
            z-index: 999999;
            transition: right 0.2s ease;
            font-family: 'Segoe UI', sans-serif;
        }
        #${BOOKMARKLET_ID}-fab:hover,
        #${BOOKMARKLET_ID}-fab.expanded {
            right: 0;
        }
        #${BOOKMARKLET_ID}-fab .fab-tab {
            position: absolute;
            left: -24px;
            top: 50%;
            transform: translateY(-50%);
            width: 24px;
            height: 60px;
            background: #0078d4;
            border-radius: 4px 0 0 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: -2px 0 8px rgba(0,0,0,0.2);
            opacity: 0.5;
            transition: opacity 0.2s ease;
        }
        #${BOOKMARKLET_ID}-fab:hover .fab-tab {
            opacity: 1;
        }
        #${BOOKMARKLET_ID}-fab .fab-tab::after {
            content: '◀';
            color: white;
            font-size: 10px;
        }
        #${BOOKMARKLET_ID}-fab:hover .fab-tab::after,
        #${BOOKMARKLET_ID}-fab.expanded .fab-tab::after {
            content: '▶';
        }
        #${BOOKMARKLET_ID}-fab .fab-panel {
            background: white;
            border-radius: 4px 0 0 4px;
            box-shadow: -2px 0 12px rgba(0,0,0,0.25);
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 90px;
        }
        #${BOOKMARKLET_ID}-fab button {
            border: none;
            padding: 8px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: background 0.15s;
            white-space: nowrap;
        }
        #${BOOKMARKLET_ID}-fab .toggle-btn {
            background: #0078d4;
            color: white;
        }
        #${BOOKMARKLET_ID}-fab .toggle-btn:hover {
            background: #106ebe;
        }
        #${BOOKMARKLET_ID}-fab .close-btn {
            background: #f3f3f3;
            color: #333;
        }
        #${BOOKMARKLET_ID}-fab .close-btn:hover {
            background: #e1e1e1;
        }
    `;
    document.head.appendChild(styles);
    
    // Create FAB
    const fab = document.createElement('div');
    fab.id = BOOKMARKLET_ID + '-fab';
    fab.innerHTML = `
        <div class="fab-tab" title="PR Focus Mode"></div>
        <div class="fab-panel">
            <button id="${BOOKMARKLET_ID}-toggle" class="toggle-btn">Focus - off</button>
            <button id="${BOOKMARKLET_ID}-close" class="close-btn">✕ Close</button>
        </div>
    `;
    document.body.appendChild(fab);
    
    // Event handlers
    document.getElementById(BOOKMARKLET_ID + '-toggle').addEventListener('click', () => {
        const newState = !getFocusState();
        applyFocusMode(newState);
    });
    
    document.getElementById(BOOKMARKLET_ID + '-close').addEventListener('click', () => {
        // Restore UI and remove FAB
        applyFocusMode(false);
        fab.remove();
        styles.remove();
        try { sessionStorage.removeItem(STORAGE_KEY); } catch(e) {}
    });
    
    // Initialize: apply saved state
    const savedState = getFocusState();
    if (savedState) {
        applyFocusMode(true);
    }
    
})();

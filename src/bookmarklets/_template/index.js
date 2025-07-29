(function() {
    'use strict';
    
    // Unique namespace to avoid conflicts - consistent hash based on name
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    
    const BOOKMARKLET_NAME = 'page-analyzer';
    const BOOKMARKLET_ID = BOOKMARKLET_NAME + '-' + simpleHash(BOOKMARKLET_NAME);
    
    try {
        // Remove any existing instance (both panel and styles)
        const existing = document.getElementById(BOOKMARKLET_ID);
        if (existing) {
            existing.remove();
        }
        const existingStyles = document.getElementById(BOOKMARKLET_ID + '-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        // Analyze the current page
        function analyzePage() {
            const stats = {
                divs: document.querySelectorAll('div').length,
                images: document.querySelectorAll('img').length,
                links: document.querySelectorAll('a').length,
                buttons: document.querySelectorAll('button').length,
                inputs: document.querySelectorAll('input').length,
                scripts: document.querySelectorAll('script').length,
                stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
                title: document.title || 'No title',
                url: window.location.href,
                domain: window.location.hostname,
                wordCount: document.body ? document.body.innerText.split(/\s+/).filter(word => word.length > 0).length : 0,
                scrollHeight: document.documentElement.scrollHeight,
                viewportHeight: window.innerHeight
            };
            
            // Fun facts
            const facts = [];
            if (stats.divs > 100) facts.push(`🏗️ This page is div-heavy with ${stats.divs} divs!`);
            if (stats.images > 20) facts.push(`📸 Image-rich page with ${stats.images} images`);
            if (stats.wordCount > 1000) facts.push(`📚 Long read: ~${Math.round(stats.wordCount/200)} min read time`);
            if (stats.scrollHeight > stats.viewportHeight * 3) facts.push(`📜 Tall page: ${Math.round(stats.scrollHeight/stats.viewportHeight)}x viewport height`);
            if (stats.scripts > 10) facts.push(`⚡ Script-heavy: ${stats.scripts} JavaScript files`);
            
            return { stats, facts };
        }
        
        // Toggle functions
        let divsHighlighted = false;
        
        function toggleDivHighlight() {
            const btn = document.getElementById(BOOKMARKLET_ID + '-toggle-divs');
            const toggleText = btn.querySelector('.toggle-text');
            
            if (!divsHighlighted) {
                // Highlight all divs
                document.querySelectorAll('div').forEach(div => {
                    if (div.id !== BOOKMARKLET_ID) { // Don't highlight our own panel
                        div.style.outline = '2px solid red';
                        div.style.outlineOffset = '1px';
                    }
                });
                btn.classList.add('active');
                toggleText.textContent = 'Remove Highlights';
                divsHighlighted = true;
            } else {
                // Remove highlights
                document.querySelectorAll('div').forEach(div => {
                    div.style.outline = '';
                    div.style.outlineOffset = '';
                });
                btn.classList.remove('active');
                toggleText.textContent = 'Highlight Divs';
                divsHighlighted = false;
            }
        }
        
        function refreshAnalysis() {
            updateUI();
        }
        
        function closePanel() {
            const panel = document.getElementById(BOOKMARKLET_ID);
            if (panel) panel.remove();
        }
        
        // Update UI with current stats
        function updateUI() {
            const { stats, facts } = analyzePage();
            
            // Update stats
            const elements = {
                'divs': stats.divs,
                'images': stats.images,
                'links': stats.links,
                'scripts': stats.scripts,
                'words': stats.wordCount,
                'domain': stats.domain
            };
            
            Object.entries(elements).forEach(([key, value]) => {
                const el = document.getElementById(BOOKMARKLET_ID + '-' + key);
                if (el) el.textContent = value;
            });
            
            // Update facts
            const factsContainer = document.getElementById(BOOKMARKLET_ID + '-facts');
            if (factsContainer) {
                factsContainer.innerHTML = facts.length > 0 
                    ? facts.map(fact => `<div class="fact-item">${fact}</div>`).join('')
                    : '<div class="fact-item">✨ This is a clean, well-structured page!</div>';
            }
        }
        
        // This will be replaced by the build system with the actual HTML/CSS content
        const HTML_TEMPLATE = '{{HTML_CONTENT}}';
        const CSS_TEMPLATE = '{{CSS_CONTENT}}';
        
        // Process CSS template to replace placeholders
        const CSS_CONTENT = CSS_TEMPLATE.replace(/\{\{BOOKMARKLET_ID\}\}/g, BOOKMARKLET_ID);
        
        // Create and inject the CSS
        const styleElement = document.createElement('style');
        styleElement.textContent = CSS_CONTENT;
        styleElement.id = BOOKMARKLET_ID + '-styles';
        document.head.appendChild(styleElement);
        
        // Create safe function name (replace dashes with underscores)
        const SAFE_FUNCTION_NAME = BOOKMARKLET_ID.replace(/-/g, '_');
        
        // Create and inject the UI
        const panel = document.createElement('div');
        panel.innerHTML = HTML_TEMPLATE
            .replace(/\{\{BOOKMARKLET_ID\}\}/g, BOOKMARKLET_ID)
            .replace(/\{\{CLOSE_HANDLER\}\}/g, `(function(){document.getElementById('${BOOKMARKLET_ID}').remove();document.getElementById('${BOOKMARKLET_ID}-styles').remove();})()`)
            .replace(/\{\{TOGGLE_DIVS_HANDLER\}\}/g, `window.${SAFE_FUNCTION_NAME}_toggleDivs()`)
            .replace(/\{\{REFRESH_HANDLER\}\}/g, `window.${SAFE_FUNCTION_NAME}_refresh()`);
        
        document.body.appendChild(panel.firstElementChild);
        
        // Debug log to confirm the element was added
        console.log('Page Analyzer loaded with ID:', BOOKMARKLET_ID);
        console.log('Panel element:', document.getElementById(BOOKMARKLET_ID));
        
        // Expose functions globally with namespaced names (using safe function names)
        window[SAFE_FUNCTION_NAME + '_toggleDivs'] = toggleDivHighlight;
        window[SAFE_FUNCTION_NAME + '_refresh'] = refreshAnalysis;
        
        // Initial UI update
        updateUI();
        
    } catch (error) {
        console.error('Page Analyzer Error:', error);
        alert('Page Analyzer encountered an error. Check the console for details.');
    }
})();

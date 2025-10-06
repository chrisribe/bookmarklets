(function() {
    'use strict';
    
    // Helper to wait for element
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) return resolve(element);
            
            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
            
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for ${selector}`));
            }, timeout);
        });
    }
    
    // Helper to click and wait
    function clickAndWait(element, delay = 300) {
        return new Promise(resolve => {
            element.click();
            setTimeout(resolve, delay);
        });
    }
    
    // Main workflow
    async function linkChildIncident() {
        try {
            console.log('Starting IcM child link workflow...');
            
            // Step 1: Click Links button
            console.log('1. Clicking Links button...');
            const allLabels = Array.from(document.querySelectorAll('span.ms-Button-label'));
            const linksBtn = allLabels.find(el => el.textContent.trim() === 'Links');
            if (!linksBtn) {
                console.error('Available button labels:', allLabels.map(el => el.textContent));
                throw new Error('Links button not found');
            }
            await clickAndWait(linksBtn, 500);
            
            // Step 2: Click Child tab
            console.log('2. Clicking Child tab...');
            const allPivots = Array.from(document.querySelectorAll('span.ms-Pivot-text'));
            console.log('Available pivot tabs:', allPivots.map(el => el.textContent));
            const childTab = allPivots.find(el => el.textContent.match(/Child\s*\(/i));
            if (!childTab) {
                throw new Error('Child tab not found');
            }
            await clickAndWait(childTab, 300);
            
            // Step 3: Click Add link button
            console.log('3. Clicking Add link button...');
            await new Promise(resolve => setTimeout(resolve, 300));
            const buttons = Array.from(document.querySelectorAll('span.ms-Button-label'));
            const addBtn = buttons.find(btn => btn.textContent.includes('Add link'));
            if (!addBtn) {
                throw new Error('Add link button not found');
            }
            await clickAndWait(addBtn, 800);
            
            // Step 4: Focus on search box and paste
            console.log('4. Focusing search box and pasting...');
            const searchBox = await waitForElement('input.ms-SearchBox-field[placeholder*="Search incident"]', 3000);
            searchBox.focus();
            
            // Get clipboard content
            const clipboardText = await navigator.clipboard.readText();
            searchBox.value = clipboardText;
            searchBox.dispatchEvent(new Event('input', { bubbles: true }));
            searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            console.log('Pasted:', clipboardText);
            
            // Step 5: Wait for search results and select checkbox
            console.log('5. Waiting for search results...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const checkbox = await waitForElement('input[type="checkbox"]', 8000);
            if (checkbox && !checkbox.checked) {
                checkbox.click();
                console.log('✓ Checkbox selected');
            }
            
            // Step 6: Click Next button
            console.log('6. Clicking Next button...');
            await new Promise(resolve => setTimeout(resolve, 300));
            const nextButtons = Array.from(document.querySelectorAll('button span.ms-Button-label'));
            const nextBtn = nextButtons.find(el => el.textContent.trim() === 'Next');
            if (!nextBtn) {
                throw new Error('Next button not found');
            }
            nextBtn.closest('button').click();
            console.log('✓ Next button clicked');
            
            console.log('✓ Workflow complete! Ready to confirm link.');
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            alert('IcM Link Error: ' + error.message);
        }
    }
    
    linkChildIncident();
})();

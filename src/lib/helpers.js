/**
 * Shared helper functions for bookmarklets
 * These functions are automatically injected by the build system when used
 */

/**
 * Wait for an element to appear in the DOM
 * @param {string|function} selector - CSS selector string or function that returns an element
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param {number} checkInterval - How often to check in milliseconds (default: 100)
 * @returns {Promise<Element>} The found element
 */
function waitForElement(selector, timeout = 5000, checkInterval = 100) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkElement = () => {
            const element = typeof selector === 'function' ? selector() : document.querySelector(selector);
            
            if (element) {
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                reject(new Error(`Timeout waiting for element: ${selector}`));
            } else {
                setTimeout(checkElement, checkInterval);
            }
        };
        
        checkElement();
    });
}

/**
 * Wait for an element and click it
 * @param {string|function} selector - CSS selector string or function that returns an element
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns {Promise<Element>} The clicked element
 */
async function clickElement(selector, timeout = 5000) {
    const element = await waitForElement(selector, timeout);
    element.click();
    return element;
}

/**
 * Add a delay/sleep
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Click an element and wait for a specified delay
 * @param {Element} element - The element to click
 * @param {number} delayMs - Milliseconds to wait after clicking (default: 300)
 * @returns {Promise<void>}
 */
async function clickAndWait(element, delayMs = 300) {
    element.click();
    await delay(delayMs);
}

/**
 * Wait for element using MutationObserver (more efficient for dynamic content)
 * @param {string} selector - CSS selector to watch for
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns {Promise<Element>} The found element
 */
function waitForElementObserver(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for element: ${selector}`));
        }, timeout);
    });
}

/**
 * Find an element by text content
 * @param {string} selector - CSS selector for elements to search
 * @param {string} text - Text to search for (case-insensitive)
 * @param {boolean} exact - Whether to match exact text (default: false)
 * @returns {Element|null} The found element or null
 */
function findElementByText(selector, text, exact = false) {
    const elements = Array.from(document.querySelectorAll(selector));
    return elements.find(el => {
        const content = el.textContent.trim();
        return exact 
            ? content === text 
            : content.toLowerCase().includes(text.toLowerCase());
    }) || null;
}

/**
 * Wait for element by text content
 * @param {string} selector - CSS selector for elements to search
 * @param {string} text - Text to search for
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param {boolean} exact - Whether to match exact text (default: false)
 * @returns {Promise<Element>} The found element
 */
async function waitForElementByText(selector, text, timeout = 5000, exact = false) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        const element = findElementByText(selector, text, exact);
        if (element) return element;
        await delay(100);
    }
    
    throw new Error(`Timeout waiting for element with text: ${text}`);
}

/**
 * Safely get text content from an element
 * @param {string|Element} selectorOrElement - CSS selector or element
 * @returns {string} The text content or empty string if not found
 */
function getTextContent(selectorOrElement) {
    const element = typeof selectorOrElement === 'string' 
        ? document.querySelector(selectorOrElement)
        : selectorOrElement;
    return element ? element.textContent.trim() : '';
}

/**
 * Check if element exists in DOM
 * @param {string} selector - CSS selector
 * @returns {boolean} True if element exists
 */
function elementExists(selector) {
    return document.querySelector(selector) !== null;
}

/**
 * Log with consistent formatting
 * @param {string} message - Message to log
 * @param {*} data - Optional data to log
 */
function log(message, data) {
    if (data !== undefined) {
        console.log(`[Bookmarklet] ${message}`, data);
    } else {
        console.log(`[Bookmarklet] ${message}`);
    }
}

/**
 * Show error alert and log to console
 * @param {string|Error} error - Error message or Error object
 */
function showError(error) {
    const message = error instanceof Error ? error.message : error;
    console.error('[Bookmarklet Error]', error);
    alert(`Error: ${message}\n\nCheck console for details.`);
}

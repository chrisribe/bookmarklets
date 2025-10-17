# Shared Library System

## Overview

The bookmarklets project includes a shared library system to reduce code duplication and maintain consistency across bookmarklets. Helper functions are defined once in `src/lib/helpers.js` and automatically injected into bookmarklets that use them during the build process.

## How It Works

1. **Define helpers** in `src/lib/helpers.js` as standalone functions with JSDoc comments
2. **Use helpers** in your bookmarklet code (e.g., `waitForElement()`, `delay()`)
3. **Build automatically detects** which helpers are used based on function calls
4. **Injected at build time** - only the helpers you use are included in the final bookmarklet
5. **Minified together** - helpers and your code are minified as one unit

## Benefits

✅ **DRY Code** - Define helper functions once, use everywhere  
✅ **No Duplication** - Each bookmarklet only includes helpers it actually uses  
✅ **Self-Contained** - Final bookmarklets have no external dependencies  
✅ **Consistent** - Fixes and improvements propagate to all bookmarklets  
✅ **Easy Maintenance** - Single source of truth for common patterns  

## Available Helpers

### Core Helpers

#### `waitForElement(selector, timeout, checkInterval)`
Wait for an element to appear in the DOM using polling.

```javascript
const button = await waitForElement('button.submit', 5000);
```

#### `waitForElementObserver(selector, timeout)`
Wait for an element using MutationObserver (more efficient for dynamic content).

```javascript
const dialog = await waitForElementObserver('.modal', 3000);
```

#### `delay(ms)`
Add a timing delay.

```javascript
await delay(500); // Wait 500ms
```

#### `clickElement(selector, timeout)`
Wait for an element and click it.

```javascript
await clickElement('button[data-test-id="submit"]');
```

#### `clickAndWait(element, delayMs)`
Click an element and wait for a specified delay.

```javascript
await clickAndWait(submitButton, 300);
```

### Search & Find Helpers

#### `findElementByText(selector, text, exact)`
Find an element by its text content.

```javascript
const button = findElementByText('button', 'Submit', false);
```

#### `waitForElementByText(selector, text, timeout, exact)`
Wait for an element by text content.

```javascript
const tab = await waitForElementByText('.tab', 'Settings', 5000);
```

#### `getTextContent(selectorOrElement)`
Safely get text content from an element.

```javascript
const title = getTextContent('.page-title');
```

#### `elementExists(selector)`
Check if an element exists in the DOM.

```javascript
if (elementExists('.error-message')) { /* handle error */ }
```

### Utility Helpers

#### `log(message, data)`
Log with consistent formatting.

```javascript
log('Processing items...', items);
```

#### `showError(error)`
Show error alert and log to console.

```javascript
showError(new Error('Failed to load data'));
```

## Usage Example

### Before (with duplication):

```javascript
// icm-resolve-mitigated/index.js
(function() {
    'use strict';
    
    // Duplicate code in every bookmarklet ❌
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            // ... implementation
        });
    }
    
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async function main() {
        const button = await waitForElement('button');
        await delay(500);
        button.click();
    }
    
    main();
})();
```

### After (using shared library):

```javascript
// icm-resolve-mitigated/index.js
(function() {
    'use strict';
    
    // Just use the helpers - they're injected automatically ✅
    async function main() {
        const button = await waitForElement('button');
        await delay(500);
        button.click();
    }
    
    main();
})();
```

The build system automatically detects that `waitForElement` and `delay` are used, injects them from `src/lib/helpers.js`, and minifies everything together.

## Adding New Helpers

1. Add your function to `src/lib/helpers.js` with JSDoc comments:

```javascript
/**
 * Your helper description
 * @param {type} param - Parameter description
 * @returns {type} Return description
 */
function myHelper(param) {
    // implementation
}
```

2. Use it in any bookmarklet:

```javascript
const result = myHelper('value');
```

3. Build - the helper is automatically detected and injected:

```bash
npm run build
```

## Build Process Details

The `build.js` script:

1. **Loads** `src/lib/helpers.js` and parses all helper functions
2. **Reads** each bookmarklet's `index.js`
3. **Detects** which helpers are called using regex matching
4. **Injects** only the used helpers inside the IIFE after `'use strict';`
5. **Minifies** the combined code with Terser
6. **Outputs** self-contained `javascript:` bookmarklet

### Injection Location

Helpers are injected inside the IIFE wrapper, after the `'use strict';` directive:

```javascript
(function() {
    'use strict';
    
    // === Shared Helper Functions ===
    function waitForElement(selector, timeout = 5000, checkInterval = 100) {
        // ... injected code
    }
    
    function delay(ms) {
        // ... injected code
    }
    // === End Helper Functions ===
    
    // Your bookmarklet code here
    async function main() {
        // ...
    }
})();
```

## Best Practices

✅ **Keep helpers generic** - They should work across different contexts  
✅ **Document with JSDoc** - Include type information and descriptions  
✅ **Single responsibility** - Each helper should do one thing well  
✅ **No external dependencies** - Helpers must be self-contained  
✅ **Console logging** - Include helpful logging for debugging  
✅ **Error handling** - Return promises that can be caught  

## Migrating Existing Bookmarklets

1. Identify duplicate helper functions in your bookmarklet
2. Remove the local definitions
3. Verify the equivalent exists in `src/lib/helpers.js` (or add it)
4. Rebuild with `npm run build`
5. Test to ensure functionality is preserved

## Technical Notes

- Helpers are detected by simple regex matching of function calls
- Only functions actually called are injected (no unused code)
- The build system preserves JSDoc comments in the source but strips them during minification
- Final bookmarklets are completely self-contained with no runtime dependencies
- Each bookmarklet can use different combinations of helpers

## Troubleshooting

**Helper not being injected?**
- Check that the function name matches exactly (case-sensitive)
- Ensure you're calling the function with parentheses: `helperName()`
- Rebuild with `npm run build`

**Build error after adding helper?**
- Verify JSDoc comment format is correct
- Ensure function is properly closed with matching braces
- Check for syntax errors in `src/lib/helpers.js`

**Size concerns?**
- Only used helpers are injected - unused ones add zero bytes
- Minification compresses helper code significantly
- Check built file size with `ls -lh dist/*.js`

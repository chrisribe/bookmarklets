const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const srcDir = path.join(__dirname, 'src', 'bookmarklets');
const distDir = path.join(__dirname, 'dist');
const libDir = path.join(__dirname, 'src', 'lib');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Load shared helpers library
const helpersPath = path.join(libDir, 'helpers.js');
let helpers = {};
if (fs.existsSync(helpersPath)) {
    const helpersCode = fs.readFileSync(helpersPath, 'utf8');
    // Extract individual helper functions with their JSDoc comments
    const functionRegex = /\/\*\*[\s\S]*?\*\/\s*function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?(?=\n\/\*\*|\nfunction\s+\w+|\Z)/g;
    let match;
    while ((match = functionRegex.exec(helpersCode)) !== null) {
        const functionName = match[1];
        helpers[functionName] = match[0].trim();
    }
}

/**
 * Detect which helper functions are used in the code
 * @param {string} code - The bookmarklet code
 * @returns {Set<string>} Set of helper function names used
 */
function detectUsedHelpers(code) {
    const used = new Set();
    const helperNames = Object.keys(helpers);
    
    for (const helperName of helperNames) {
        // Check if function is called in the code
        const callRegex = new RegExp(`\\b${helperName}\\s*\\(`, 'g');
        if (callRegex.test(code)) {
            used.add(helperName);
        }
    }
    
    return used;
}

/**
 * Inject used helper functions into the code
 * @param {string} code - The bookmarklet code
 * @returns {string} Code with helpers injected
 */
function injectHelpers(code) {
    const usedHelpers = detectUsedHelpers(code);
    
    if (usedHelpers.size === 0) {
        return code;
    }
    
    // Build helpers code block
    const helpersCode = Array.from(usedHelpers)
        .map(name => helpers[name])
        .join('\n\n    ');
    
    // Inject helpers inside the IIFE, after 'use strict'
    const injectionMarker = "'use strict';";
    const injectionPoint = code.indexOf(injectionMarker);
    
    if (injectionPoint !== -1) {
        const beforeStrict = code.substring(0, injectionPoint + injectionMarker.length);
        const afterStrict = code.substring(injectionPoint + injectionMarker.length);
        
        return `${beforeStrict}\n\n    // === Shared Helper Functions ===\n    ${helpersCode}\n    // === End Helper Functions ===\n${afterStrict}`;
    }
    
    // Fallback: inject at the beginning of the IIFE
    const iifeStart = code.indexOf('(function() {');
    if (iifeStart !== -1) {
        const beforeIIFE = code.substring(0, iifeStart + '(function() {'.length);
        const afterIIFE = code.substring(iifeStart + '(function() {'.length);
        
        return `${beforeIIFE}\n    // === Shared Helper Functions ===\n    ${helpersCode}\n    // === End Helper Functions ===\n${afterIIFE}`;
    }
    
    // Last resort: prepend to code
    return `// === Shared Helper Functions ===\n${helpersCode}\n// === End Helper Functions ===\n\n${code}`;
}

// Build each bookmarklet
async function buildBookmarklets() {
    const bookmarklets = [];
    
    const dirs = fs.readdirSync(srcDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());
    
    for (const dir of dirs) {
        const bookmarkletName = dir.name;
        const bookmarkletDir = path.join(srcDir, bookmarkletName);
        const metaPath = path.join(bookmarkletDir, 'meta.json');

        try {
            let code;
            
            // Check if this bookmarklet uses the new multi-file structure
            const indexPath = path.join(bookmarkletDir, 'index.js');
            const templatePath = path.join(bookmarkletDir, 'template.html');
            const stylesPath = path.join(bookmarkletDir, 'styles.css');
            
            if (fs.existsSync(indexPath) && fs.existsSync(templatePath) && fs.existsSync(stylesPath)) {
                // New multi-file structure
                console.log(`📁 Building ${bookmarkletName} from multi-file structure...`);
                
                const logic = fs.readFileSync(indexPath, 'utf8');
                const template = fs.readFileSync(templatePath, 'utf8');
                const styles = fs.readFileSync(stylesPath, 'utf8');
                
                // Replace placeholders in the logic file
                code = logic
                    .replace('\'{{HTML_CONTENT}}\'', JSON.stringify(template))
                    .replace('\'{{CSS_CONTENT}}\'', JSON.stringify(styles));
                
                // Inject helpers
                code = injectHelpers(code);
                    
            } else if (fs.existsSync(indexPath)) {
                // Legacy single-file structure
                console.log(`📄 Building ${bookmarkletName} from single file...`);
                code = fs.readFileSync(indexPath, 'utf8');
                
                // Inject helpers
                code = injectHelpers(code);
            } else {
                console.warn(`⚠️  Skipping ${bookmarkletName}: No valid structure found`);
                continue;
            }

            const result = await minify(code, {
                compress: {
                    drop_console: false, // Keep console logs for debugging
                    drop_debugger: true
                },
                mangle: true
            });

            if (result.error) {
                console.error(`Error minifying ${bookmarkletName}:`, result.error);
                continue;
            }

            // Read metadata if it exists
            let meta = {
                name: bookmarkletName.replace(/-/g, ' ').replace(/\w\S*/g, (txt) => 
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                ),
                description: `${bookmarkletName} bookmarklet`,
                category: 'General',
                author: 'chrisribe'
            };

            if (fs.existsSync(metaPath)) {
                const metaContent = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                meta = { ...meta, ...metaContent };
            }

            const minifiedCode = `javascript:${result.code}`;
            const outputPath = path.join(distDir, `${bookmarkletName}.js`);
            
            fs.writeFileSync(outputPath, minifiedCode);
            
            bookmarklets.push({
                ...meta,
                filename: `${bookmarkletName}.js`,
                code: minifiedCode,
                size: Buffer.byteLength(minifiedCode, 'utf8')
            });

            console.log(`✓ Built ${bookmarkletName}.js (${Buffer.byteLength(minifiedCode, 'utf8')} bytes)`);
        } catch (error) {
            console.error(`Error processing ${bookmarkletName}:`, error.message);
        }
    }
    
    return bookmarklets;
}

buildBookmarklets().then(bookmarklets => {
    // Generate index.html
    const indexHtml = generateIndexHtml(bookmarklets);
    fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml);

    console.log(`\n✓ Generated index.html with ${bookmarklets.length} bookmarklets`);
    console.log(`Open dist/index.html in your browser to browse and install bookmarklets.`);
}).catch(error => {
    console.error('Build failed:', error);
});

function generateIndexHtml(bookmarklets) {
    const categories = [...new Set(bookmarklets.map(b => b.category))].sort();
    
    // Helper function to escape HTML attributes
    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    
    // Helper function to escape JavaScript strings
    function escapeJs(text) {
        return text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
    }
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bookmarklets Collection</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            text-align: center;
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        
        .subtitle {
            color: #7f8c8d;
            font-size: 1.1em;
            margin-bottom: 20px;
        }
        
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }
        
        .stat-label {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        
        .category {
            background: white;
            margin-bottom: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .category-header {
            background: #3498db;
            color: white;
            padding: 15px 20px;
            font-weight: bold;
            font-size: 1.2em;
        }
        
        .bookmarklets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
            padding: 20px;
        }
        
        .bookmarklet {
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 20px;
            background: #fafafa;
            transition: all 0.3s ease;
        }
        
        .bookmarklet:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .bookmarklet-name {
            font-size: 1.3em;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .bookmarklet-description {
            color: #666;
            margin-bottom: 15px;
            line-height: 1.5;
        }
        
        .bookmarklet-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            font-size: 0.9em;
            color: #7f8c8d;
        }
        
        .bookmarklet-size {
            background: #ecf0f1;
            padding: 2px 8px;
            border-radius: 3px;
        }
        
        .bookmarklet-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .bookmarklet-code {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 10px;
            margin-top: 10px;
        }
        
        .code-textarea {
            width: 100%;
            height: 120px;
            margin: 0;
            padding: 8px;
            font-family: 'Courier New', Monaco, monospace;
            font-size: 11px;
            line-height: 1.4;
            color: #495057;
            background: #fff;
            border: 1px solid #ced4da;
            border-radius: 3px;
            resize: vertical;
            word-break: break-all;
        }
        
        .code-textarea:focus {
            outline: none;
            border-color: #80bdff;
            box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
        }
        
        .btn {
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
            text-decoration: none;
            display: inline-block;
            text-align: center;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .btn-primary {
            background: #3498db;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2980b9;
        }
        
        .btn-secondary {
            background: #95a5a6;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #7f8c8d;
        }
        
        .instructions {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .instructions h3 {
            color: #856404;
            margin-bottom: 10px;
        }
        
        .instructions p {
            color: #856404;
            margin-bottom: 8px;
        }
        
        footer {
            text-align: center;
            margin-top: 50px;
            padding: 20px;
            color: #7f8c8d;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
            .bookmarklets-grid {
                grid-template-columns: 1fr;
            }
            
            .stats {
                flex-direction: column;
                gap: 15px;
            }
            
            .bookmarklet-actions {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔖 Bookmarklets Collection</h1>
            <p class="subtitle">A curated collection of useful browser bookmarklets</p>
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${bookmarklets.length}</div>
                    <div class="stat-label">Bookmarklets</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${categories.length}</div>
                    <div class="stat-label">Categories</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${Math.round(bookmarklets.reduce((sum, b) => sum + b.size, 0) / 1024)}KB</div>
                    <div class="stat-label">Total Size</div>
                </div>
            </div>
        </header>

        <div class="instructions">
            <h3>🚀 How to Install Bookmarklets</h3>
            <p><strong>Method 1 (Easiest):</strong> Drag the bookmarklet button (e.g., "📌 Multi Select") directly to your bookmarks bar</p>
            <p><strong>Method 2:</strong> Right-click the bookmarklet button and select "Bookmark this link" or "Add to favorites"</p>
            <p><strong>Method 3:</strong> Click "📋 Copy Code" and manually create a new bookmark with the copied code as the URL</p>
        </div>

        ${categories.map(category => {
            const categoryBookmarklets = bookmarklets.filter(b => b.category === category);
            return `
                <div class="category">
                    <div class="category-header">${category} (${categoryBookmarklets.length})</div>
                    <div class="bookmarklets-grid">
                        ${categoryBookmarklets.map((bookmarklet, categoryIndex) => {
                            const globalIndex = bookmarklets.indexOf(bookmarklet);
                            return `
                            <div class="bookmarklet">
                                <div class="bookmarklet-name">${escapeHtml(bookmarklet.name)}</div>
                                <div class="bookmarklet-description">${escapeHtml(bookmarklet.description)}</div>
                                <div class="bookmarklet-meta">
                                    <span>by ${escapeHtml(bookmarklet.author)}</span>
                                    <span class="bookmarklet-size">${bookmarklet.size} bytes</span>
                                </div>
                                <div class="bookmarklet-actions">
                                    <a href="${escapeHtml(bookmarklet.code)}" class="btn btn-primary" title="Drag this link to your bookmarks bar or right-click and select 'Bookmark this link'">
                                        📌 ${escapeHtml(bookmarklet.name)}
                                    </a>
                                    <button class="btn btn-secondary" onclick="copyFromTextarea('code-${globalIndex}', '${escapeJs(bookmarklet.name)}')">
                                        📋 Copy Code
                                    </button>
                                </div>
                                <div class="bookmarklet-code">
                                    <textarea readonly onclick="this.select()" class="code-textarea" id="code-${globalIndex}">${bookmarklet.code}</textarea>
                                </div>
                            </div>
                        `;}).join('')}
                    </div>
                </div>
            `;
        }).join('')}

        <footer>
            <p>Generated on ${new Date().toLocaleString()} | Total bookmarklets: ${bookmarklets.length}</p>
            <p>Build this collection with <code>npm run build</code></p>
        </footer>
    </div>

    <script>
        function copyFromTextarea(textareaId, name) {
            const textarea = document.getElementById(textareaId);
            if (!textarea) {
                alert('Could not find code to copy.');
                return;
            }
            
            const code = textarea.value;
            navigator.clipboard.writeText(code).then(function() {
                // Show temporary success message
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = '✅ Copied!';
                button.style.background = '#27ae60';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                }, 2000);
            }).catch(function(err) {
                // Fallback: select the textarea content
                textarea.select();
                textarea.setSelectionRange(0, 99999); // For mobile devices
                
                try {
                    document.execCommand('copy');
                    const button = event.target;
                    const originalText = button.textContent;
                    button.textContent = '✅ Copied!';
                    button.style.background = '#27ae60';
                    
                    setTimeout(() => {
                        button.textContent = originalText;
                        button.style.background = '';
                    }, 2000);
                } catch (err) {
                    alert('Failed to copy to clipboard. Please copy manually from the text box.');
                }
                console.error('Copy failed:', err);
            });
        }

        // Add some interactivity
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📚 Bookmarklets Collection loaded');
            console.log('Available bookmarklets:', ${JSON.stringify(bookmarklets.map(b => b.name))});
        });
    </script>
</body>
</html>`;
}

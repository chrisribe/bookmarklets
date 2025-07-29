# Archived Components

This folder contains useful code that was part of the original bookmarklet system but is no longer needed for the current self-contained bookmarklet architecture.

## dynamic-widget-loader.js (formerly core.js)

A robust JavaScript library for dynamically loading and managing web widgets/components.

### Features
- ✅ Cross-browser script loading with callbacks
- ✅ CSS injection with cleanup
- ✅ HTML fetching and injection  
- ✅ ID-based element management
- ✅ Configurable root URLs
- ✅ Widget lifecycle management

### Use Cases

#### 1. Browser Extension Development
```javascript
// Load extension modules dynamically
bmCore.setConfig({
    app: {
        root: "chrome-extension://xyz/modules",
        folder: "content-scripts",
        name: "page-analyzer"
    }
});
```

#### 2. Micro-Frontend Architecture
```javascript
// Load different app sections on demand
bmCore.setConfig({
    app: {
        root: "https://cdn.myapp.com/modules",
        folder: "dashboard",
        name: "user-profile"
    }
});
```

#### 3. Plugin Systems
```javascript
// WordPress-style plugin loading
bmCore.setConfig({
    app: {
        root: "https://mysite.com/plugins",
        folder: "ecommerce",
        name: "payment-gateway"
    }
});
```

#### 4. Educational Platforms
```javascript
// Load interactive lessons
bmCore.setConfig({
    app: {
        root: "https://learn.example.com/lessons",
        folder: "javascript-basics",
        name: "variables-demo"
    }
});
```

#### 5. A/B Testing & Feature Flags
```javascript
// Load different UI versions
const variant = getUserVariant();
bmCore.setConfig({
    app: {
        root: "https://cdn.myapp.com/variants",
        folder: variant,
        name: "checkout-flow"
    }
});
```

### API Reference

#### Configuration
```javascript
bmCore.setConfig({
    app: {
        root: "https://your-cdn.com",    // Base URL for resources
        folder: "widget-category",       // Widget folder name
        name: "widget-name"             // Widget name (loads name.js, name.css, name.html)
    }
});
```

#### Manual Loading
```javascript
// Load a specific widget
bmCore.loadWidget(folderName, appName);

// Remove elements by ID
bmCore.removeIfExists(elementId);
```

### File Structure Expected
```
https://your-cdn.com/
├── widget-category/
│   ├── widget-name.js      # Widget JavaScript
│   ├── widget-name.css     # Widget styles  
│   └── widget-name.html    # Widget HTML template
```

## Migration Notes

If you want to use the dynamic widget loader in a new project:

1. **Copy `dynamic-widget-loader.js`** to your project
2. **Set up your CDN structure** with folders containing .js/.css/.html files
3. **Initialize with your configuration**
4. **Consider modernizing** - add ES6 modules, TypeScript, better error handling

The core concepts are solid for any dynamic content loading system!

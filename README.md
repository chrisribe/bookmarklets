# 🔖 Bookmarklets Collection

A well-organized collection of useful browser bookmarklets with a modern build system and user-friendly browser interface.

## 🌐 Live Demo

**👉 [Browse and Install Bookmarklets](https://chrisribe.github.io/bookmarklets/)**

Visit the live page to see all available bookmarklets with easy installation options.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build bookmarklets:**
   ```bash
   npm run build
   ```

3. **Browse and install bookmarklets:**
   - **Live site:** Visit [https://chrisribe.github.io/bookmarklets/](https://chrisribe.github.io/bookmarklets/)
   - **Local:** Open `dist/index.html` in your browser

## 📁 Project Structure

```
bookmarklets/
├── dist/                          # Generated minified bookmarklets
│   ├── index.html                 # Browser interface for bookmarklets
│   ├── multi-select.js            # Minified bookmarklet files
│   └── azure-*.js
├── src/
│   ├── bookmarklets/              # Source code for each bookmarklet
│   │   ├── multi-select/
│   │   │   ├── index.js           # Bookmarklet source code
│   │   │   └── meta.json          # Metadata (name, description, etc.)
│   │   ├── azure-container-delete-cmds/
│   │   └── azure-select-delete-top10/
│   ├── loader/                    # Demo/testing environment
│   └── core.js                    # Shared utilities
├── build.js                       # Build script
├── package.json                   # Dependencies and scripts
└── README.md
```

## 📋 Available Bookmarklets

### Productivity
- **Multi-Select Table Rows** - Enable multi-selection of table rows with Ctrl+Click and auto-select options

### Azure
- **Azure Container Delete Commands** - Generate CLI commands to delete all containers in a storage account
- **Azure Select & Delete Top 10** - Automatically select and delete the top 10 items in Azure portal grids

## ➕ Adding New Bookmarklets

1. **Create the bookmarklet directory:**
   ```bash
   mkdir src/bookmarklets/my-new-bookmarklet
   ```

2. **Create the source file:**
   ```javascript
   // src/bookmarklets/my-new-bookmarklet/index.js
   (function() {
       'use strict';
       
       // Your bookmarklet code here
       console.log('My new bookmarklet is running!');
       
   })();
   ```

3. **Create metadata (optional):**
   ```json
   {
       "name": "My New Bookmarklet",
       "description": "A description of what this bookmarklet does",
       "category": "Productivity",
       "author": "your-name",
       "version": "1.0.0",
       "tags": ["tag1", "tag2"]
   }
   ```

4. **Build and test:**
   ```bash
   npm run build
   ```

## 🔧 Build System Features

- **Automatic minification** using Terser
- **Metadata support** for rich descriptions and categorization
- **Browser interface generation** with searchable bookmarklet library
- **Size optimization** and reporting
- **Error handling** during build process

## 🌐 Browser Interface Features

The generated `dist/index.html` includes:

- **📱 Responsive design** that works on desktop and mobile
- **🏷️ Category organization** for easy browsing
- **📋 One-click copying** of bookmarklet code
- **🔖 Drag-to-install** functionality
- **📊 Size and metadata display**
- **🎨 Modern, clean UI** with hover effects

## 🛠️ Development

For development with auto-rebuild on changes:
```bash
npm run dev
```

## 📝 Usage Instructions

**🌐 Easy way:** Visit [https://chrisribe.github.io/bookmarklets/](https://chrisribe.github.io/bookmarklets/) and use the drag-and-drop interface.

**📁 Local way:** Use the methods below with your locally built `dist/index.html`:

### Method 1: Drag and Drop
1. Open `dist/index.html` in your browser
2. Drag the "Add to Bookmarks" button to your bookmarks bar

### Method 2: Right-Click Bookmark
1. Right-click the "Add to Bookmarks" button
2. Select "Bookmark this link"

### Method 3: Manual Copy
1. Click "Copy Code" button
2. Create a new bookmark manually
3. Paste the copied code as the bookmark URL

## 🤝 Contributing

1. Fork the repository
2. Create a new bookmarklet following the structure above
3. Test your bookmarklet thoroughly
4. Submit a pull request with a clear description

## 📄 License

This project is open source. Feel free to use, modify, and distribute these bookmarklets.

## 🐛 Troubleshooting

**Build fails with minification error:**
- Check your JavaScript syntax in the bookmarklet source
- Ensure all functions are properly closed
- Look for console errors during build

**Bookmarklet doesn't work on a site:**
- Check browser console for errors
- Some sites may have Content Security Policy restrictions
- Try the bookmarklet on a different site to isolate the issue

---

Built with ❤️ for productivity and automation.

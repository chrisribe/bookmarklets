# IcM Link Child Incident Bookmarklet

## Overview
Automates the process of linking a child incident in the Microsoft IcM (Incident Management) portal.

## Features
- ✅ KISS principle: Simple, single-file implementation
- ✅ Clicks through the UI: Links → Child tab → Add link
- ✅ Automatically pastes from clipboard
- ✅ Waits for search results and selects the first incident checkbox
- ✅ Error handling with console logging and user alerts
- ✅ Uses efficient MutationObserver for element waiting

## Installation
1. Open `dist/index.html` in your browser
2. Find "IcM Link Child Incident" under the IcM category
3. Drag the "Add to Bookmarks" button to your bookmarks bar
   OR right-click and select "Bookmark this link"

## Usage
1. Copy an incident ID to your clipboard (e.g., "693960543")
2. Navigate to an IcM incident page (e.g., `https://portal.microsofticm.com/imp/v5/incidents/details/693479120/summary`)
3. Click the bookmarklet
4. The automation will:
   - Click "Links" button
   - Click "Child" tab
   - Click "Add link" button
   - Paste incident ID into search box
   - Wait for search results
   - Select the first incident checkbox
5. Review and confirm the link manually

## Technical Details
- **Size**: 1,796 bytes (minified)
- **Category**: IcM
- **Dependencies**: None (vanilla JavaScript)
- **Browser Requirements**: Modern browser with clipboard API support

## Code Structure
```
src/bookmarklets/icm-link-child/
├── index.js      # Main bookmarklet logic
└── meta.json     # Metadata (name, description, category)
```

## Workflow Steps
1. **Click Links** - Finds and clicks the "Links" button
2. **Click Child Tab** - Selects the "Child" pivot tab
3. **Click Add Link** - Opens the add link dialog
4. **Paste & Search** - Focuses search box and pastes clipboard content
5. **Select Checkbox** - Waits for results and checks the first incident

## Error Handling
- Timeout protection (5s default for element waiting)
- Console logging for debugging
- User-friendly error alerts
- Graceful failure at each step

## Build Command
```bash
npm run build
```

This generates the minified bookmarklet in `dist/icm-link-child.js`.

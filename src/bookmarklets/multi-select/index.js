// Multi-Select Bookmarklet for TR elements with data-row-index
// Drag this to your bookmarks bar or copy the minified version below

(function () {
    'use strict';

    // Maximum selections allowed (can be overridden)
    let MAX_SELECTIONS = 20;

    // Track selected rows
    let selectedRows = new Set();

    // Apply native selection state by simulating clicks
    function selectRow(row) {
        const rowIndex = row.getAttribute('data-row-index');
        if (selectedRows.has(rowIndex)) return; // Already selected

        selectedRows.add(rowIndex);

        // Simulate Ctrl+Click to trigger native UI selection
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            ctrlKey: true,
            view: window
        });

        // Temporarily remove our handler to avoid infinite loop
        row.removeEventListener('click', handleRowClick, true);

        // Dispatch the click to trigger native selection
        row.dispatchEvent(clickEvent);

        // Re-add our handler
        setTimeout(() => {
            row.addEventListener('click', handleRowClick, true);
        }, 10);

        // Add our tracking class
        row.classList.add('multi-selected');
    }

    // Remove native selection state
    function deselectRow(row) {
        const rowIndex = row.getAttribute('data-row-index');
        if (!selectedRows.has(rowIndex)) return; // Not selected

        selectedRows.delete(rowIndex);

        // If row is currently selected, simulate click to deselect
        if (row.classList.contains('selected') || row.getAttribute('aria-selected') === 'true') {
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                ctrlKey: true,
                view: window
            });

            row.removeEventListener('click', handleRowClick, true);
            row.dispatchEvent(clickEvent);
            setTimeout(() => {
                row.addEventListener('click', handleRowClick, true);
            }, 10);
        }

        // Remove our tracking class
        row.classList.remove('multi-selected');
    }

    function createStatusIndicator() {
        const existing = document.getElementById('multiselect-status');
        if (existing) existing.remove();

        const status = document.createElement('div');
        status.id = 'multiselect-status';
        status.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #0078d4;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(status);
        return status;
    }

    // Update status display
    function updateStatus() {
        const status = document.getElementById('multiselect-status');
        if (status) {
            status.textContent = `Selected: ${selectedRows.size}/${MAX_SELECTIONS}`;
        }
    }

    // Handle row selection
    function handleRowClick(event) {
        const row = event.target.closest('tr[data-row-index]');
        if (!row) return;

        // Only handle Ctrl+click
        if (!event.ctrlKey) return;

        event.preventDefault();
        event.stopPropagation();

        const rowIndex = row.getAttribute('data-row-index');

        if (selectedRows.has(rowIndex)) {
            deselectRow(row);
        } else {
            if (selectedRows.size >= MAX_SELECTIONS) {
                if (confirm(`Maximum ${MAX_SELECTIONS} selections reached! Increase limit and continue?`)) {
                    MAX_SELECTIONS += 50;
                    selectRow(row);
                }
                return;
            }
            selectRow(row);
        }

        updateStatus();
    }

    // Add click handlers to all rows with data-row-index
    function addClickHandlers() {
        const rows = document.querySelectorAll('tr[data-row-index]');
        rows.forEach(row => {
            row.addEventListener('click', handleRowClick, true);
        });
    }

    // Clear all selections
    function clearSelections() {
        selectedRows.forEach(rowIndex => {
            const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
            if (row) {
                deselectRow(row);
            }
        });
        selectedRows.clear();
        updateStatus();
    }

    // Get selected rows data
    function getSelectedData() {
        const data = [];
        selectedRows.forEach(rowIndex => {
            const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
            if (row) {
                data.push({
                    rowIndex: rowIndex,
                    element: row,
                    text: row.textContent.trim()
                });
            }
        });
        return data;
    }

    // Auto-select rows with delays to allow UI processing
    function autoSelectRows(count = MAX_SELECTIONS) {
        clearSelections();
        const rows = document.querySelectorAll('tr[data-row-index]');
        const limit = Math.min(count, rows.length);

        // Update MAX_SELECTIONS if needed
        if (count > MAX_SELECTIONS) {
            MAX_SELECTIONS = count;
        }

        // Select rows with small delays to allow UI to process
        for (let i = 0; i < limit; i++) {
            setTimeout(() => {
                const row = rows[i];
                if (row) {
                    selectRow(row);
                    updateStatus();
                }
                if (i === limit - 1) {
                    setTimeout(() => {
                        console.log(`Auto-selected ${limit} rows`);
                    }, 50);
                }
            }, i * 20);
        }
    }

    // Cleanup and destroy the bookmarklet
    function destroyBookmarklet() {
        // Clear all selections
        clearSelections();

        // Remove event listeners from all rows
        const rows = document.querySelectorAll('tr[data-row-index]');
        rows.forEach(row => {
            row.removeEventListener('click', handleRowClick, true);
            row.classList.remove('multi-selected');
        });

        // Remove UI elements
        const status = document.getElementById('multiselect-status');
        const controls = document.getElementById('multiselect-controls');
        if (status) status.remove();
        if (controls) controls.remove();

        // Clear global debug object
        if (window.multiSelectDebug) {
            delete window.multiSelectDebug;
        }

        // Clear selected rows set
        selectedRows.clear();

        console.log('Multi-select bookmarklet destroyed and cleaned up.');
    }

    function createControlPanel() {
        const existing = document.getElementById('multiselect-controls');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'multiselect-controls';
        panel.style.cssText = `
            position: fixed;
            top: 50px;
            right: 10px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 10px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            min-width: 200px;
        `;

        panel.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold;">
                Multi-Select Controls
                <button id="close-bookmarklet" style="float: right; background: #dc3545; color: white; border: none; border-radius: 2px; padding: 2px 6px; font-size: 11px; cursor: pointer;" title="Close and destroy bookmarklet">×</button>
            </div>
            <button id="select-all-20" style="margin: 2px; padding: 4px 8px; background: #0078d4; color: white; border: none; border-radius: 2px;">Select 20</button>
            <button id="select-all-available" style="margin: 2px; padding: 4px 8px; background: #28a745; color: white; border: none; border-radius: 2px;">Select All</button>
            <button id="clear-selections" style="margin: 2px; padding: 4px 8px;">Clear All</button>
            <button id="hide-controls" style="margin: 2px; padding: 4px 8px;">Hide</button>
            <div style="margin-top: 8px; font-size: 11px; color: #666;">Auto-select or Ctrl+Click rows individually</div>
        `;

        document.body.appendChild(panel);

        // Add event listeners
        document.getElementById('select-all-20').onclick = () => autoSelectRows(20);
        document.getElementById('select-all-available').onclick = () => {
            const totalRows = document.querySelectorAll('tr[data-row-index]').length;
            autoSelectRows(totalRows);
        };
        document.getElementById('clear-selections').onclick = clearSelections;
        document.getElementById('hide-controls').onclick = () => {
            panel.style.display = 'none';
        };
        document.getElementById('close-bookmarklet').onclick = () => {
            if (confirm('Close and destroy the multi-select bookmarklet?')) {
                destroyBookmarklet();
            }
        };
    }

    // Initialize
    function init() {
        // Clean up any existing instances
        const existingRows = document.querySelectorAll('tr.multi-selected');
        existingRows.forEach(row => {
            deselectRow(row);
        });
        selectedRows.clear();

        // Set up the bookmarklet
        addClickHandlers();
        createStatusIndicator();
        createControlPanel();
        updateStatus();

        // Expose debug interface
        window.multiSelectDebug = {
            getSelectedData,
            clearSelections,
            selectedRows,
            addClickHandlers,
            autoSelectRows,
            selectRow,
            deselectRow,
            destroyBookmarklet
        };

        console.log('Multi-select bookmarklet activated! Use buttons for auto-select or Ctrl+click for manual selection.');
    }

    init();
})();

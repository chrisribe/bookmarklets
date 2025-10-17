# IcM Resolve Mitigated Bookmarklet

## Purpose
Automates the workflow for resolving mitigated IcM incidents by searching for a pattern in incident titles/descriptions, selecting matching incidents, and initiating the resolve process.

## Usage

1. Navigate to the IcM incidents list page
2. Click the bookmarklet
3. Enter the search pattern when prompted (e.g., "has high latency")
4. The bookmarklet will:
   - Find incidents matching the pattern
   - Select up to 6 matching incidents
   - Click the Resolve button
   - Wait for the resolve dialog to appear
   - Monitor for the dialog's Resolve button to become enabled
   - Optionally auto-click the final Resolve button

## Features

- **Pattern Search**: User-configurable search string
- **Smart Selection**: Searches row text for matches (case-insensitive)
- **Batch Limit**: Automatically limits to 6 incidents maximum
- **Dialog Monitoring**: Waits up to 2 minutes for the resolve button to become enabled
- **Manual Override**: Option to manually confirm final resolution
- **Error Handling**: Console logging and user-friendly alerts

## Technical Details

### Workflow Steps
1. Prompt for search pattern
2. Find all checkboxes (`input.gridCheckbox.item-checkbox`)
3. Filter by searching parent row text content
4. Select up to 6 matching checkboxes
5. Click main Resolve button (`button[data-test-id="resolveIncidentAction"]`)
6. Wait for dialog to open
7. Monitor for dialog Resolve button to become enabled (up to 2 minutes)
8. Prompt user to auto-click or manually confirm

### Selectors Used
- Checkboxes: `input.gridCheckbox.item-checkbox[type="checkbox"]`
- Main Resolve: `button[data-test-id="resolveIncidentAction"]`
- Dialog Resolve: Searches for enabled submit/resolve buttons in modal footers

### Timing
- 200ms delay between checkbox selections
- 500ms delay after selections complete
- 1s delay after clicking main Resolve

## Shared Library

This bookmarklet uses shared helper functions from `src/lib/helpers.js`:
- `waitForElement()` - Waits for elements to appear in the DOM
- `delay()` - Adds timing delays between actions

These helpers are automatically injected by the build system.
- Up to 120s (2 minutes) waiting for dialog button to enable

## Example Use Cases

- Resolving multiple "has high latency" incidents after mitigation
- Batch resolving incidents with specific error messages
- Cleaning up mitigated incidents with common patterns

## Notes

- The dialog Resolve button may take seconds to minutes to become enabled (IcM API validation)
- Console logging provides detailed progress information
- Safe to re-run if interrupted - won't re-select already checked items

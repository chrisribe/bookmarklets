(function() {
    'use strict';

    async function resolveIncidents() {
        try {
            // Prompt user for search string
            const searchString = prompt('Enter the text to search for in incidents (e.g., "has high latency"):', 'has high latency');
            
            if (!searchString) {
                alert('Search cancelled.');
                return;
            }

            console.log(`Searching for incidents containing: "${searchString}"`);

            // Find all checkboxes
            const allCheckboxes = Array.from(document.querySelectorAll('input.gridCheckbox.item-checkbox[type="checkbox"]'));
            console.log(`Found ${allCheckboxes.length} total checkboxes`);

            if (allCheckboxes.length === 0) {
                alert('No incident checkboxes found on this page.');
                return;
            }

            // Filter checkboxes by finding matching text in the row
            const matchingCheckboxes = [];
            for (const checkbox of allCheckboxes) {
                // Get the row containing this checkbox
                const row = checkbox.closest('tr') || checkbox.closest('[role="row"]') || checkbox.closest('.grid-row');
                
                if (row && row.textContent.toLowerCase().includes(searchString.toLowerCase())) {
                    matchingCheckboxes.push(checkbox);
                    if (matchingCheckboxes.length >= 6) {
                        break; // Limit to max 6 items
                    }
                }
            }

            console.log(`Found ${matchingCheckboxes.length} matching incidents`);

            if (matchingCheckboxes.length === 0) {
                alert(`No incidents found containing "${searchString}"`);
                return;
            }

            // Select the matching checkboxes
            for (const checkbox of matchingCheckboxes) {
                if (!checkbox.checked) {
                    console.log(`Selecting incident: ${checkbox.getAttribute('aria-label') || checkbox.id}`);
                    checkbox.click();
                    await delay(200); // Small delay between clicks
                }
            }

            console.log(`Selected ${matchingCheckboxes.length} incidents`);
            await delay(500);

            // Find and click the Resolve button
            console.log('Looking for Resolve button...');
            const resolveButton = await waitForElement(() => {
                const buttons = Array.from(document.querySelectorAll('button[data-test-id="resolveIncidentAction"]'));
                return buttons.find(btn => 
                    btn.textContent.includes('Resolve') && 
                    !btn.disabled
                );
            }, 3000);

            if (!resolveButton) {
                alert('Resolve button not found or is disabled. Make sure incidents are selected.');
                return;
            }

            console.log('Clicking Resolve button...');
            resolveButton.click();
            await delay(1000);

            // Dialog opened - user will handle the rest manually
            console.log('Resolve dialog opened');
            alert(`✓ Selected ${matchingCheckboxes.length} incident(s) and opened Resolve dialog.\n\nPlease set the cause and click the Resolve button manually.`);

        } catch (error) {
            console.error('Error in resolveIncidents:', error);
            alert(`Error: ${error.message}\n\nCheck console for details.`);
        }
    }

    // Start the automation
    resolveIncidents();
})();

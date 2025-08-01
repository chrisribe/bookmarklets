(function(){

	var rows = document.querySelectorAll('.azc-grid-multiselectable tr');
	
	if (rows.length === 0) {
		console.warn('No Azure grid rows found. Make sure you are on the correct Azure portal page.');
		return;
	}
	
	//List all labels for debug
	var names = [];
	rows.forEach((row) => {  
		let ariaLabel = row.getAttribute('aria-label');
		if(ariaLabel){
			names.push(ariaLabel)
		}
	});
	console.log('Found rows:', names);  


	//Select the top 10
	var maxIndex = Math.min(rows.length, 2 + 10);  
	var selectedCount = 0;
	for (var _i = 2; _i < maxIndex; _i++) {  	
		var row = rows[_i];
		if (row && row.getAttribute('aria-selected') == 'false'){
			row.click();
			selectedCount++;
		}
	}
	
	console.log(`Selected ${selectedCount} rows`);
	
	setTimeout(function(){
		var deleteButton = document.querySelector('.fxs-blade-commandBarContainer [title="Delete"] div');
		if (deleteButton) {
			deleteButton.click();
			console.log('Delete button clicked');
		} else {
			console.warn('Delete button not found. Make sure you are on the correct Azure portal page.');
		}
	}, 500);
})();

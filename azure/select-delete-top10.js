(function(){

	var rows = document.querySelectorAll('.azc-grid-multiselectable tr');  
	var maxIndex = Math.min(rows.length, 2 + 10);  
	for (var _i = 2; _i < maxIndex; _i++) {  	
		var row = rows[_i];
		console.log("RS:", row.getAttribute('aria-selected'));
		if (row.getAttribute('aria-selected') == 'false'){
			row.click()
		}
	}
	setTimeout(function(){
		document.querySelector('.fxs-blade-commandBarContainer [title="Delete"] div').click();
	}, 500);
})();
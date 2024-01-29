(function(){

	var rows = document.querySelectorAll('.azc-grid-multiselectable tr');
	
	let element = document.querySelector('.fxs-blade-title-titleText');  
	let accountName = element.innerText.split(' | ')[0];  
	console.log(accountName);  

	//List all labels for debug
	var azDeleteCmds = [];
	rows.forEach((row) => {  
		let containerName = row.getAttribute('aria-label');
		if(containerName){
			azDeleteCmds.push(
				`az storage blob delete-batch --account-name ${accountName} --source https://${accountName}.blob.core.windows.net/${containerName}`
			);
		}
	});
	console.log(azDeleteCmds);

})();
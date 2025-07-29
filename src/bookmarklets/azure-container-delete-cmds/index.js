(function(){

	var rows = document.querySelectorAll('.azc-grid-multiselectable tr');
	
	if (rows.length === 0) {
		console.warn('No Azure grid rows found. Make sure you are on the correct Azure portal page.');
		return;
	}
	
	let element = document.querySelector('.fxs-blade-title-titleText');  
	if (!element) {
		console.error('Could not find Azure storage account title. Make sure you are on the correct Azure portal page.');
		return;
	}
	let accountName = element.innerText.split(' | ')[0];  
	console.log('Account name:', accountName);  

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
	
	if (azDeleteCmds.length === 0) {
		console.warn('No containers found to delete.');
		return;
	}
	
	let cmdsString = azDeleteCmds.join('"\n"');
	let bashCmdLoop = `
	commands=(  
		"${cmdsString}"
	)
	for cmd in "\${commands[@]}"  
	do  
		eval $cmd  
	done	
	`;
	console.log(`Generated ${azDeleteCmds.length} delete commands:`);
	console.log("Run in bash to delete all containers", bashCmdLoop);

})();

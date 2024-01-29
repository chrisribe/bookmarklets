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
	console.log("Run in bash to delete all containers", bashCmdLoop);

})();
function setupEventListeners() {
    var myUI = document.getElementById('myUI');

    // Ensure myUI is loaded
    if(myUI) {
        var activateBtn = document.getElementById('activateBtn');
        var closeBtn = document.getElementById('closeBtn');
        var status = document.getElementById('status-text');
        var bmarks = document.getElementById('bmarks');

        activateBtn.addEventListener('click', function() {
			var value = bmarks.value;
			var text = bmarks.options[bmarks.selectedIndex].text;

            status.textContent = `activateBtn was clicked! ${value}, ${text}`;
			
			var jValue = JSON.parse(value);
			bmCore.loadWidget(jValue.folder, jValue.appName);
        });

        closeBtn.addEventListener('click', function() {
            status.textContent = 'closeBtn was clicked!';
			bmCore.removeIfExists('demoCSS');
			bmCore.removeIfExists('demoHTML');
			bmCore.removeIfExists('demoJS');
        });
    } else {
        // If myUI is not yet loaded, try again in 500 milliseconds
        setTimeout(setupEventListeners, 500);
    }
}

// Call the function to start setting up event listeners
setupEventListeners();

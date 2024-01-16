function setupEventListeners() {
    var myUI = document.getElementById('myUI');

    // Ensure myUI is loaded
    if(myUI) {
        var button1 = document.getElementById('button1');
        var button2 = document.getElementById('button2');
        var status = document.getElementById('status-text');

        button1.addEventListener('click', function() {
            status.textContent = 'Button 1 was clicked!';
        });

        button2.addEventListener('click', function() {
            status.textContent = 'Button 2 was clicked!';
        });
    } else {
        // If myUI is not yet loaded, try again in 500 milliseconds
        setTimeout(setupEventListeners, 500);
    }
}

// Call the function to start setting up event listeners
setupEventListeners();

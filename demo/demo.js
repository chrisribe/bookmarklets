document.addEventListener('DOMContentLoaded', function() {
    var button1 = document.getElementById('button1');
    var button2 = document.getElementById('button2');
    var status = document.getElementById('status-text');

    button1.addEventListener('click', function() {
        status.textContent = 'Button 1 was clicked!';
    });

    button2.addEventListener('click', function() {
        status.textContent = 'Button 2 was clicked!';
    });
});

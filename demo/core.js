javascript:(function() {
    function loadScript(url, id, callback) {
        removeIfExists(id);
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.id = id;
		if (script.readyState) {  //IE  
			script.onreadystatechange = function() {  
				if (script.readyState == "loaded" || script.readyState == "complete") {  
					script.onreadystatechange = null;  
					callback();  
				}  
			};  
		} else {  //Others  
			script.onload = function() {  
				callback();  
			};  
		}  
		script.src = url;  
		document.getElementsByTagName("head")[0].appendChild(script);  
    }

    function loadCSS(url, id) {
        removeIfExists(id);
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = url;
        link.id = id;
        document.getElementsByTagName("head")[0].appendChild(link);  
    }

    function loadHTML(url, id, callback) {
        removeIfExists(id);
        var xhr = new XMLHttpRequest();  
        xhr.onload = function() {  
            if (xhr.status >= 200 && xhr.status < 300) {  
                callback(xhr.responseText);  
            }  
        };  
        xhr.open('GET', url);  
        xhr.send();
    }

    function removeIfExists(id) {
        var existingElement = document.getElementById(id);
        if (existingElement) {
            existingElement.parentNode.removeChild(existingElement);
        }
    }

    loadCSS('demo.css', 'demoCSS');
    loadHTML('demo.html', 'demoHTML', function(responseText) {
        var div = document.createElement('div');
        div.id = 'demoHTML';
        div.innerHTML = responseText;
        document.body.appendChild(div);
        loadScript('demo.js', 'demoJS', function() {
            console.log('JS loaded');
        });
    });
})();

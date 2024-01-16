window.bmCore = (function() {
    function loadScript(url, id, callback) {
        removeIfExists(id);
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.id = id;
		if (script.readyState) {
			script.onreadystatechange = function() {  
				if (script.readyState == "loaded" || script.readyState == "complete") {  
					script.onreadystatechange = null;  
					callback();  
				}  
			};  
		} else {
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
	var root = "https://chrisribe.github.io/bookmarklets";
	
	function loadWidget(folderName, appName){
		loadCSS(`${root}/${folderName}/${appName}.css`, `${folderName}CSS`);
		loadHTML(`${root}/${folderName}/${appName}.html`, `${folderName}HTML`, function(responseText) {
			var div = document.createElement('div');
			div.id = `${folderName}HTML`;
			div.innerHTML = responseText;
			document.body.appendChild(div);
			loadScript(`${root}/${folderName}/${appName}.js`, `${folderName}JS`, function() {
				console.log(`JS loaded ${folderName}-${appName}`);
			});
		});
	}
	
	loadWidget('demo', 'demo');
	return {
		loadWidget: loadWidget,
		removeIfExists: removeIfExists
	};
})();

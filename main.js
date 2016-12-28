const {ipcRenderer} = require('electron')
const ipc = ipcRenderer
setInterval(function(){
	// IPC send sends text/json/whatever to index.js or anything on the nodeside that cares to listen
	ipc.send('getServers', "plz send");
}, 1000)

ipc.on("setServers", function(event, data){
	//console.log(data)
	let html = ""
	// generate title row
	for(let turkey in data) {
		// slave ID is same as unique, but fuck cares its easier this way
		html += "<tr><td>Slave ID</td>"
		for(let key in data[turkey]) {
			html += "<td>"+key+"</td>"
		}
		break;
	}
	for(let key in data) {
		// only print servers that has been online some time the last 60 seconds (in ms)
		if(Date.now() - data[key].time < 60000) {
			//console.log(key, data[key]);
			html += "<tr><td>"+key+"</td>";
			for(let key2 in data[key]) {
				// run some special rules depending on the name of the field
				if(key2 == "time"){
					html += "<td>seen "+Math.floor((Date.now()-data[key][key2])/100)/10+"s ago</td>";
				} else {
					html += "<td>"+data[key][key2]+"</td>"
				}
			}
			// add button to join server, also generate buttons with string manipulation because that is SO SAFE!
			html += "<td onclick='launchFactorio(\""+data[key].publicIP+"\",\""+data[key].serverPort+"\")'>Join server</td></tr>"
		}
	}
	// console.log(html)
	document.querySelector("#slaves").innerHTML = html
});

// tell node to launch factorio
function launchFactorio(ip, port) {
	let object = {
		ip:ip,
		port:port,
	}
	ipc.send("launchFactorio", object);
}

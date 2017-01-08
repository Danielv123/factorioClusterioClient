const {ipcRenderer} = require('electron');
const ipc = ipcRenderer;

const Config = require('electron-config');
const config = new Config();

setInterval(function(){
	// IPC send sends text/json/whatever to index.js or anything on the nodeside that cares to listen
	ipc.send('getServers', "plz send");
}, 500)
var globalData;
ipc.on("setServers", function(event, data){
	//console.log(data)
	globalData = data;
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
			// html += "<td onclick='launchFactorio(\""+data[key].publicIP+"\",\""+data[key].serverPort+"\",\""+data[key].rconPort+"\",\""+JSON.stringify(data[key].mods)+"\")'>Join server</td></tr>"
			html += '<td id="temp" onclick="launchFactorio(this)">Join server</td>'
		}
	}
	// console.log(html)
	document.querySelector("#slaves").innerHTML = html
});

// tell node to launch factorio
// this is some shitty patchwork solution that is 100% guaranteed to break
function launchFactorio(element) {
	console.log(element.parentElement.querySelectorAll("td")[0].innerHTML)
	data = globalData[element.parentElement.querySelectorAll("td")[0].innerHTML]
	let object = {
		ip:data.publicIP,
		port:data.serverPort,
		rconPort:data.rconPort,
		mods:data.mods,
	};
	console.log(object);
	ipc.send("launchFactorio", object);
}

// populate master address box at load
document.querySelector('#masterInput').value = config.get("masterAddress")
// change config when master address box changes
function setMasterAddress() {
	// check that the port is probable and won't crash us
	let str = document.querySelector('#masterInput').value;
	if(str.substr(str.indexOf(":") + 1) < 65535) {
		config.set('masterAddress', str);
	}
	
}
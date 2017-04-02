const {ipcRenderer} = require('electron');
const ipc = ipcRenderer;

const Config = require('electron-config');
const config = new Config();

const electron = require("electron");
const remote = require("electron").remote;
const mainProcess = remote.require("./index");

const needle = require("needle");

var globalData;
setInterval(function(){
	// IPC send sends text/json/whatever to index.js or anything on the nodeside that cares to listen
	ipc.send('getServers', "plz send");
	needle.get(config.get("masterAddress")+'/api/slaves', function(error, response, data) {
		if (!error) {
			//console.log(data)
			globalData = data;
			let html = "";
			
			// generate title row
			let keys = {
				"Name":"instanceName",
				"Slave ID":"unique",
				"IP":"publicIP",
				"mods":"mods",
				"Status":"time",
				"Players":"playerCount",
			}
			
			// start with printing keys
			html += "<tr>"
			for (let key in keys) {
				html += "<td>"+key+"</td>";
			}
			html += "</tr>";
			
			// keep going with printing slaves corresponding to the keys
			for(let slave in data){
				// only print servers that has been online some time the last 60 seconds (in ms)
				console.log(data[slave]);
				if(Date.now() - data[slave].time < 120000) {
					html += "<tr>"
					for (let key in keys) {
						let currentKey = keys[key]
						if(currentKey == "time") {
							// print time in seconds instead of unix time
							let seconds = Math.floor((Date.now()-data[slave][currentKey])/1000)
							
							// if slave pinged last 15 seconds, display it as online
							// otherwise alert us to the fact that it is missing.
							if (seconds < 15) {
								html += "<td style='min-width:110px;'>Online</td>";
							} else {
								html += "<td style='min-width:110px;'>seen "+seconds+"s ago</td>";
							}
						} else if (currentKey == "mods") {
							// Make modlist look nice
							html += "<td>"
							for(let i = 0;i<data[slave].mods.length;i++){
								// print one mod per line
								html += data[slave].mods[i].modName + "\n"
							}
							html += "</td>"
						} else if (currentKey == "publicIP") {
							html += "<td>"+data[slave][currentKey] + ":" + data[slave].serverPort
						} else {
							if (data[slave][keys[key]]){
								html += "<td>"+data[slave][keys[key]]+"</td>"
							} else {
								html += "<td>Unsupported</td>"
							}
						}
					}
					html += '<td id="temp" onclick="launchFactorio(this)"><button class="button launchButton">Join server</button></td>'
					html += "</tr>"
				}
			}
			
			// turn our HTML text into dom elements for comparison
			var div = document.createElement('div');
			div.innerHTML = html;
			var div2 = document.createElement('div');
			div2.innerHTML = document.querySelector("#slaves").innerHTML;
			
			// use special browser function for comparing dom elements
			if(!div.isEqualNode(div2)) {
				document.querySelector("#slaves").innerHTML = html
			}
		}
	});
}, 500)

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

// IPC listeners
setInterval(function(){
	ipc.send("tick")
}, 100);
ipc.on("printStatus", function(event, string){
	document.querySelector("#dataDisplay").innerHTML = string
});
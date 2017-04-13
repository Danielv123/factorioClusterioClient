const {ipcRenderer} = require('electron');
const ipc = ipcRenderer;

const Config = require('electron-config');
const config = new Config();

// JS for settings page. Should allow customizing things about the client.

// populate master address box at load
document.querySelector('#masterInput').value = config.get("masterAddress");
// populate factorio directory box at load
document.querySelector("#factorioDirectory").innerHTML = config.get("factorioDirectory");
// change config when master address box changes
function setMasterAddress() {
	// check that the port is probable and won't crash us
	let str = document.querySelector('#masterInput').value;
	if(str.substr(str.indexOf(":") + 1) < 65535) {
		config.set('masterAddress', str);
	}
}

// populate slider settings
if(document.querySelector(".toggleableSetting.devconsole") && config.get("devConsole")){
	document.querySelector(".toggleableSetting.devconsole label").innerHTML = '<input type="checkbox" checked><div class="slider"></div>'
}
document.querySelector(".devconsole .switch .slider").onclick = function() {
	console.log("devConsole", !this.parentElement.childNodes[0].checked);
	config.set("devConsole", !this.parentElement.childNodes[0].checked);
}

if(document.querySelector(".toggleableSetting.offlineSlaves") && config.get("offlineSlaves")){
	document.querySelector(".toggleableSetting.offlineSlaves label").innerHTML = '<input type="checkbox" checked><div class="slider"></div>'
}
document.querySelector(".offlineSlaves .switch .slider").onclick = function() {
	console.log("offlineSlaves", !this.parentElement.childNodes[0].checked);
	config.set("offlineSlaves", !this.parentElement.childNodes[0].checked);
}


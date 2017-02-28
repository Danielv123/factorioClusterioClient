const {app, BrowserWindow, ipcMain, dialog} = require('electron')
const path = require('path')
const url = require('url')
const ipc = ipcMain
const needle = require("needle")
const child_process = require('child_process');
const Rcon = require('simple-rcon');
const http = require('http');
const fs = require('fs');
const mkdirp = require("mkdirp");
const os = require("os")

const Config = require('electron-config');
const config = new Config();

// solve problems with error boxes
// Disable error dialogs by overriding
// FIX: https://goo.gl/YsDdsS
dialog.showErrorBox = function(title, content) {
    console.log(`${title}\n${content}`);
};

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
	// Create the browser window.
	win = new BrowserWindow({width: 1280, height: 800})

	// and load the index.html of the app.
	win.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}))
	
	// Open the DevTools.
	win.webContents.openDevTools()

	// Emitted when the window is closed.
	win.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		win = null
	})
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (win === null) {
		createWindow()
	}
})

// app code down here ---------------------------------------------------------

let lastMessage = "ready!";


app.on("ready", function() { // run main app code
	// ensure default config settings
	if(!config.get("masterAddress")) config.set("masterAddress", "localhost:8080");
	if(!config.get("factorioDirectory")) {
		console.log("Factorio directory not set!");
		selectFactorioDirectory();
	}

	// listen for IPC signal and get JSON data from master
	ipc.on('getServers', function (event, data) {
		//console.log(data)
		needle.get(config.get("masterAddress")+'/slaves', function(error, response, body) {
			if (!error) {
				event.sender.send('setServers', body)
			}
		});
	});

	// manage and download mods, then launch factorio with a server IP
	ipc.on("launchFactorio", function(event, data){
		console.vlog("Preparing to launch factorio with "+data.ip+":"+data.port)
		console.log(data.mods)
		
		// check if you chose the correct factorio directory
		if(os.type() == "Linux" || os.type() == "Darwin") {
			if(!fs.existsSync(config.get("factorioDirectory")+"/bin/x64/factorio")){
				console.error("ERROR: Invalid factorio directory!");
				console.log(config.get("factorioDirectory"));
				return false;
			} else console.log("Valid factorio directory on "+os.type());
		} else {// assume windows
			if(!fs.existsSync(config.get("factorioDirectory")+"/bin/x64/factorio.exe")){
				console.error("ERROR: Invalid factorio directory!");
				console.log(config.get("factorioDirectory"));
				return false;
			} else console.log("Valid factorio directory on "+os.type());
		}
		
		// if this is the first run of the factorio install we need to make a mods folder
		mkdirp.sync(config.get("factorioDirectory")+"/mods/")
		
		// RCON in to check if server is accessible
		var client = new Rcon({
			host: data.ip,
			port: data.rconPort,
			password: "thisisntarealpassword", 
			// people who play at servers shouldn't necessarily have admin access but rcon requires a password to connect
			// and rcon connects even when it doesn't manage to authenticate
			timeout: 10, // timeout is an advantage when we only want to check if its up, if it hasn't answered in 10s its probably not there anyways
		});
		

		// when connected disconnect
		client.on('connected', function () {
			console.log('Connected!');
			console.vlog('RCON confirmed, deleting mods...');
			
			// delete mods we don't want
			let installedMods = fs.readdirSync(config.get("factorioDirectory")+"/mods/")
			for(let i = 0; i < installedMods.length; i++){
				let x = false;
				for(let key in data.mods){
					if(installedMods[i] == data.mods[key].modName) {
						x = true;
					}
				}
				if (!x) {
					console.vlog("Deleting: " + installedMods[i]);
					// Unlink is how you delete files in node
					fs.unlinkSync(config.get("factorioDirectory")+"/mods/"+installedMods[i]);
				}
				
			}
			console.vlog("Downloading mods...");
			// download mods we don't have
			let counter = 0;
			for(let key in data.mods) {
				if(fs.existsSync(config.get("factorioDirectory")+"/mods/"+data.mods[key].modName)){
					console.log("Installed: " + data.mods[key].modName);
					launch(data.mods[key].modName);
				} else {
					console.log("Downloading: " + data.mods[key].modName);
					//progressText("Downloading: " + data.mods[key].modName);
					download("http://"+config.get("masterAddress")+"/"+data.mods[key].modName, config.get("factorioDirectory")+"/mods/"+data.mods[key].modName, launch, data.mods[key].modName);
				}
			}
			function launch(modName, size) {
				if(!size) size = 0;
				console.vlog("Downloading, last: " + modName + " " + Math.round(size/1048576*100)/100 + "mb");
				counter++;
				if(counter == data.mods.length) {
					//spawn factorio and tell it to connect to a server directly
					console.vlog("Starting factorio...");
					var gameprocess = child_process.spawn(config.get("factorioDirectory")+"/bin/x64/factorio", [
						"--mp-connect", data.ip+":"+data.port,
					]);
				}
			}
			
			// this causes error write_after_end, and it is kinda important but I have to leave it out (nope?)
			client.close(); // disconnect once we have connected because we are not actually going to rcon anything
		}).on('disconnected', function () {
			
		});
		// start connection
		client.connect();
	});
	
	ipc.on("tick", function(event, data) {
		event.sender.send('printStatus', lastMessage);
	});

	var download = function(url, dest, cb, name) {
		var file = fs.createWriteStream(dest);
		var request = http.get(url, function(response) {
			let size = response.headers["content-length"];
			if(!name){
				name = "download";
			}
			response.pipe(file);
			file.on('finish', function() {
				// console.log(url);
				file.close();
				if(typeof cb == "function"){
					if(!size) size = 0;
					cb(name, size);
				}
			});
		});
	}
	function progressText(e) {
		// ipc.send("printStatus", e);
		if(typeof e == "string"){
			lastMessage = e;
		} else {
			throw "ERROR not string" + e;
		}
	}
	console.vlog = function(e) {
		console.log(e);
		progressText(e);
	}
	// open file dialog to let you choose your factorio install
	function selectFactorioDirectory() {
		dialog.showOpenDialog({
			properties: ['openDirectory']
		}, function(e){
			if(e && e[0]) {
				config.set('factorioDirectory', e[0]);
			}
		});
	}
	exports.selectFactorioDirectory = selectFactorioDirectory
}); // end of main app code
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const url = require('url')
const ipc = ipcMain
const needle = require("needle")
const child_process = require('child_process');
const Rcon = require('simple-rcon');
const http = require('http');
const fs = require('fs');

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

ipc.on('getServers', function (event, data) {
    //console.log(data)
	needle.get('localhost:8080/slaves', function(error, response, body) {
		if (!error) {
			event.sender.send('setServers', body)
		}
	});
});

ipc.on("launchFactorio", function(event, data){
	console.log("Preparing to launch factorio with "+data.ip+":"+data.port)
	console.log(data.mods)
	
	// RCON in to check if server is accessible
	var client = new Rcon({
		host: data.ip,
		port: data.rconPort,
		password: "thisisntarealpassword", 
		// people who play at servers shouldn't necessarily have admin access but rcon requires a password to connect
		// and rcon connects even when it doesn't manage to authenticate
		timeout: 10, // timeout is an advantage when we only want to check if its up, if it hasn't answered in 10s its probably not there anyways
	});
	// start connection
	client.connect();

	// when connected disconnect
	client.on('connected', function () {
		console.log('Connected!');
		console.log('RCON confirmed!');
		// download mods
		let counter = 0;
		for(let key in data.mods) {
			console.log(data.mods[key]);
			download("http://"+"localhost:8080/"+data.mods[key].modName, "factorio/mods/"+data.mods[key].modName, launch(data.mods[key].modName));
		}
		function launch(modName) {
			counter++;
			console.log("Downloaded: " + modName);
			if(counter == data.mods.length) {
				//download("http://"+"localhost:8080/"+)
				
				//spawn factorio and tell it to connect to a server directly
				console.log("Starting factorio...");
				/*var gameprocess = child_process.spawn("./factorio/bin/x64/factorio", [
					"--mp-connect", data.ip+":"+data.port,
				]);*/
			}
		}
		
		
		// this causes error write_after_end, and it is kinda important but I have to leave it out
		//client.close(); // disconnect once we have connected because we are not actually going to rcon anything
	}).on('disconnected', function () {
		
	});
});

var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}
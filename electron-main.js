// main.js - meditations as an electron app
const electron = require('electron');

const SERVER_PORT = '47353';

const { app, Tray, Menu } = electron;
const BrowserWindow = electron.BrowserWindow;

const { spawn } = require('child_process');
const path = require('path');
const url = require('url');

// Objects which need to persist

// Main window reference
let mainWindow;

// Server process instance
let serverProcess;

// Tray reference
let tray;

const killServer = () => {
  if (serverProcess) {
    serverProcess.kill('SIGINT');
    serverProcess = null;
  }
}

/** Shutdown. Closes window and server, if either exist. */
const shutdown = () => {
  console.log('Received shutdown event');
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }

  if (serverProcess) {
    serverProcess.kill('SIGINT');
    serverProcess = null;
  }

  app.quit();
};

/**
 * Starts an instance of the meditations app server that logs to stdout
 */
const createServer = () => {
  serverProcess = spawn('./meditations', ['serve', '--migrate', '--port', SERVER_PORT]);

  serverProcess.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  serverProcess.stderr.on('data', (data) => {
    console.log(data.toString());
  });

  serverProcess.on('close', (code) => {
    console.log(`server exited with code ${code}`);
  });

  return serverProcess;
};

/** Open window  */
const createWindow = () => {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({ width, height });

  mainWindow.loadURL(url.format({
    protocol: 'http:',
    pathname: `localhost:${SERVER_PORT}`,
    slashes: true,
  }));

  mainWindow.setAutoHideMenuBar(true);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

/** Creates system tray. */
const createTray = () => {
  tray = new Tray('./assets/logo-meditations.png');

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Meditations', type: 'normal', enabled: false },
    { label: 'Open window',
      type: 'normal',
      click: () => {
        createWindow();
      } },
    { label: 'Quit',
      type: 'normal',
      click: () => {
        console.log('Shutdown triggered from tray');
        shutdown();
      },
    },
  ]));
};

app.on('window-all-closed', () => {
});

app.on('quit', () => {
  killServer();
});

app.on('ready', () => {
  createWindow();
  createServer();
  createTray();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

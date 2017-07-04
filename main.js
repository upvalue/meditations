// main.js - meditations as an electron app
const electron = require('electron');

const SERVER_PORT = '47353';

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const { spawn } = require('child_process');
const path = require('path');
const url = require('url');

// Objects which need to persist

// Main window reference
let mainWindow;

// Server process instance
let server;

/**
 * Starts an instance of the meditations app server that logs to stdout
 */
const startServer = () => {
  server = spawn('./meditations', ['serve', '--migrate', '--port', SERVER_PORT]);

  server.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  server.stderr.on('data', (data) => {
    console.log(data.toString());
  });

  server.on('close', (code) => {
    console.log(`server exited with code ${code}`);
  });

  return server;
};


const createWindow = () => {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;

  // Open meditations server
  const server = startServer();

  mainWindow = new BrowserWindow({ width, height });

  mainWindow.loadURL(url.format({
    protocol: 'http:',
    pathname: `localhost:${SERVER_PORT}`,
    slashes: true,
  }));

  mainWindow.setMenuBarVisibility(false);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    server.clo
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

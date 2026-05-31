const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../dist/favicon.svg'),
    show: false // Don't show until ready
  });

  // Load the Vite build output
  win.loadFile(path.join(__dirname, '../dist/index.html'));

  // Show window when content is ready to avoid white flash
  win.once('ready-to-show', () => {
    win.show();
  });

  // Log any load errors for debugging
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

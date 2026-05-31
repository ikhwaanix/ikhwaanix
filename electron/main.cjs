const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// ============================================================
// 🔧 KONFIGURASI AUTO-UPDATER
// ============================================================
autoUpdater.autoDownload = true;       // Otomatis download update
autoUpdater.autoInstallOnAppQuit = true; // Install saat app ditutup

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../dist/favicon.svg'),
    show: false
  });

  // Load the Vite build output
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  // Show window when content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Cek update setelah window tampil
    autoUpdater.checkForUpdatesAndNotify();
  });

  // Izinkan akses Kamera (media) untuk QR Code Desktop
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true;
    return false;
  });
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') return callback(true);
    callback(false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================
// 🔄 AUTO-UPDATE EVENTS
// ============================================================

autoUpdater.on('checking-for-update', () => {
  console.log('🔍 Mengecek pembaruan...');
});

autoUpdater.on('update-available', (info) => {
  console.log('✅ Pembaruan tersedia:', info.version);
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Pembaruan Tersedia',
    message: `Versi terbaru ${info.version} ditemukan!`,
    detail: 'Pembaruan sedang diunduh secara otomatis. Anda akan diberi tahu setelah selesai.',
    buttons: ['OK']
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('👍 Aplikasi sudah versi terbaru.');
});

autoUpdater.on('download-progress', (progress) => {
  const percent = Math.round(progress.percent);
  console.log(`⬇️ Mengunduh: ${percent}%`);
  if (mainWindow) {
    mainWindow.setProgressBar(progress.percent / 100);
    mainWindow.setTitle(`Aplikasi Ikhwan 9 — Mengunduh pembaruan ${percent}%`);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('📦 Pembaruan selesai diunduh:', info.version);
  if (mainWindow) {
    mainWindow.setProgressBar(-1); // Hapus progress bar
    mainWindow.setTitle('Aplikasi Ikhwan 9');
  }

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Pembaruan Siap',
    message: `Versi ${info.version} sudah selesai diunduh.`,
    detail: 'Aplikasi akan dimulai ulang untuk menerapkan pembaruan.',
    buttons: ['Mulai Ulang Sekarang', 'Nanti']
  }).then((result) => {
    if (result.response === 0) {
      // User pilih "Mulai Ulang Sekarang"
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('❌ Error saat update:', err.message);
});

// ============================================================
// 🚀 APP LIFECYCLE
// ============================================================

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

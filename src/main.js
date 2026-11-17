const { app, BrowserWindow, screen, ipcMain } = require('electron');
let win;
function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    width: 360, height: 390, x: workArea.x + workArea.width - 390,
    y: workArea.y + workArea.height - 430, frame: false, transparent: true,
    alwaysOnTop: true, resizable: false, hasShadow: false,
    skipTaskbar: true, backgroundColor: '#00000000',
    webPreferences: { preload: require('path').join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(require('path').join(__dirname, 'index.html'));
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
ipcMain.on('pet:drag', (_event, delta) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + delta.x), Math.round(y + delta.y));
});
ipcMain.on('pet:quit', () => app.quit());

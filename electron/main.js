import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { setupPushReceiver, ON_TOKEN_RECEIVER, ON_NOTIFICATION_RECEIVER } = require('electron-push-receiver')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV === 'development'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'مزرعة الزوين',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: false,
  })

  // ── Push Receiver Setup ──
  setupPushReceiver(mainWindow.webContents)

  // Listen for Token
  ON_TOKEN_RECEIVER((token) => {
    console.log('FCM Token (Desktop):', token)
    mainWindow.webContents.send('fcm-token', token)
  })

  // Listen for Notification
  ON_NOTIFICATION_RECEIVER((notification) => {
    console.log('Push Received (Desktop):', notification)
    mainWindow.webContents.send('push-notification', notification)
  })

  // IPC Handler for Token retrieval
  ipcMain.on('get-fcm-token', () => {
    // electron-push-receiver handles the internal registration
    // We can just wait for the ON_TOKEN_RECEIVER event which is triggered on setup
    console.log('Renderer requested FCM token')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('close', (e) => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['نعم، اخرج من البرنامج', 'إلغاء'],
      title: 'تأكيد الخروج',
      message: 'هل تريد الخروج من البرنامج حقاً؟\nملاحظة: جميع بياناتك محفوظة وتتزامن تلقائياً وبشكل فوري السحابة.',
    });
    if (choice === 1) {
      e.preventDefault();
    }
  });

  // Arabic Menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'مزرعة الزوين',
      submenu: [
        { label: 'الإصدار 2.0', enabled: false },
        { type: 'separator' },
        { label: 'إغلاق', role: 'quit' },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'تكبير', role: 'zoomin' },
        { label: 'تصغير', role: 'zoomout' },
        { label: 'إعادة الضبط', role: 'resetzoom' },
        { type: 'separator' },
        { label: 'ملء الشاشة', role: 'togglefullscreen' },
        { label: 'أدوات المطوّر', role: 'toggleDevTools', visible: isDev },
      ],
    },
    {
      label: 'تحديث',
      submenu: [
        { label: 'إعادة التحميل', role: 'reload', accelerator: 'F5' },
        { label: 'تحميل قسري', role: 'forceReload', accelerator: 'Ctrl+F5' },
      ],
    },
  ])
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

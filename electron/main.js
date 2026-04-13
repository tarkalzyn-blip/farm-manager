import { app, BrowserWindow, Menu, dialog, ipcMain, Tray, nativeImage } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { setupPushReceiver, ON_TOKEN_RECEIVER, ON_NOTIFICATION_RECEIVER } = require('electron-push-receiver')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV === 'development'

let mainWindow
let tray = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'مزرعة الزوين',
    show: false, // Prevent white flash
    backgroundColor: '#121a14', // Default dark background
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: false,
  })

  // Show window only when ready to render
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
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
    if (app.isQuiting) {
      mainWindow = null;
      return;
    }

    e.preventDefault();
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['إغلاق البرنامج', 'التصغير إلى الخلفية (Tray)', 'إلغاء'],
      defaultId: 1,
      cancelId: 2,
      title: 'تأكيد الخروج',
      message: 'هل تريد إغلاق البرنامج بالكامل أم تشغيله في الخلفية لتلقي الإشعارات؟',
    });

    if (choice === 0) {
      // Quit
      app.isQuiting = true;
      app.quit();
    } else if (choice === 1) {
      // Minimize to Tray
      mainWindow.hide();
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
  
  // Setup Tray
  try {
    const iconPath = path.join(__dirname, 'icon.png')
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(trayIcon)
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'فتح البرنامج', click: () => { if (mainWindow) mainWindow.show() } },
      { type: 'separator' },
      { label: 'إغلاق نهائي', click: () => { app.isQuiting = true; app.quit() } }
    ])
    
    tray.setToolTip('مزرعة الزوين')
    tray.setContextMenu(contextMenu)
    
    tray.on('double-click', () => {
      if (mainWindow) mainWindow.show()
    })
  } catch (err) {
    console.error('Failed to create tray icon:', err)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else if (mainWindow) mainWindow.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

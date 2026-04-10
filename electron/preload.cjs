const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  onPushReceived: (callback) => ipcRenderer.on('push-notification', (event, data) => callback(data)),
  onTokenReceived: (callback) => ipcRenderer.on('fcm-token', (event, token) => callback(token)),
  getFCMToken: () => ipcRenderer.send('get-fcm-token')
})

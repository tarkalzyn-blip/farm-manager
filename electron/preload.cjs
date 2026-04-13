const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  onPushReceived: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('push-notification', handler);
    return () => ipcRenderer.removeListener('push-notification', handler);
  },
  onTokenReceived: (callback) => {
    const handler = (event, token) => callback(token);
    ipcRenderer.on('fcm-token', handler);
    return () => ipcRenderer.removeListener('fcm-token', handler);
  },
  getFCMToken: () => ipcRenderer.send('get-fcm-token')
})

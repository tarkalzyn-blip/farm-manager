import { messaging } from '../firebaseConfig'
import { getToken, onMessage } from 'firebase/messaging'

class NotificationService {
  constructor() {
    this.token = null
    this.isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI
    this.vapidKey = 'BNDEi_U6bnXYVX8D2ldw4OwSzwhc-Ltul1GGsoH_n2KojCQBhJCONRVP9dSq18UDvJo_DFqa1N14E4wkx8QcxEo'
  }

  async init() {
    // ── Handle Electron ──
    if (this.isElectron) {
      return new Promise((resolve) => {
        window.electronAPI.onTokenReceived((token) => {
          this.token = token
          localStorage.setItem('farmFCMToken', token)
          resolve(token)
        })
        // Trigger token retrieval
        window.electronAPI.getFCMToken()
      })
    }

    if (!this.isSupported) return null

    try {
      // 1. Request Browser Permissions
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.warn('Notification permission not granted')
        return null
      }

      // 2. Register Service Worker Explicitly
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      console.log('Service Worker registered with scope:', registration.scope)

      // 3. Get FCM Token
      this.token = await getToken(messaging, { 
        vapidKey: this.vapidKey,
        serviceWorkerRegistration: registration 
      })

      if (this.token) {
        console.log('FCM Token:', this.token)
        localStorage.setItem('farmFCMToken', this.token)
      }
      
      return this.token
    } catch (err) {
      console.error('Notification Service Error:', err)
      return null
    }
  }

  // Handle foreground messages
  onMessageReceived(callback) {
    if (this.isElectron) {
      window.electronAPI.onPushReceived((payload) => {
        console.log('Received Electron push:', payload)
        callback(payload)
      })
      return
    }

    if (!messaging) return
    return onMessage(messaging, (payload) => {
      console.log('Received foreground message:', payload)
      callback(payload)
    })
  }

  async createChannel() {
    if (typeof window === 'undefined' || !window.Capacitor) return
    const { PushNotifications } = window.Capacitor.Plugins
    if (!PushNotifications) return

    try {
      await PushNotifications.createChannel({
        id: 'default',
        name: 'Default Notifications',
        description: 'General farm alerts',
        importance: 5, // High
        visibility: 1, // Public
        sound: 'beep.wav',
        vibration: true
      })
      console.log('Notification channel created')
    } catch (err) {
      console.error('Error creating channel:', err)
    }
  }

  // Capacitor (Android/iOS) Specific Logic
  async initCapacitor() {
    if (typeof window === 'undefined' || !window.Capacitor) return

    const { PushNotifications } = window.Capacitor.Plugins
    if (!PushNotifications) return

    // Create channel for Android
    await this.createChannel()

    let permStatus = await PushNotifications.checkPermissions()
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }

    if (permStatus.receive !== 'granted') return

    await PushNotifications.register()

    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value)
      this.token = token.value
    })

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error))
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification))
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification))
      // Handle deep linking logic here
    })
  }

  // Local Notifications (for offline/reminders)
  async scheduleLocal(id, title, body, scheduleAt) {
    if (typeof window === 'undefined' || !window.Capacitor) return

    const { LocalNotifications } = window.Capacitor.Plugins
    if (!LocalNotifications) return

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id,
          schedule: { at: new Date(scheduleAt) },
          channelId: 'default', // crucial for Android
          sound: null,
          attachments: null,
          actionTypeId: '',
          extra: null
        }
      ]
    })
  }
}

export const notificationService = new NotificationService()

import { messaging } from '../firebaseConfig'
import { getToken, onMessage } from 'firebase/messaging'

class NotificationService {
  constructor() {
    this.token = null
    this.isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator
    this.vapidKey = 'BF-GzD-placeholder-key' // Should be replaced with actual VAPID key
  }

  async init() {
    if (!this.isSupported) return null

    try {
      // 1. Request Browser Permissions
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return null

      // 2. Get FCM Token
      this.token = await getToken(messaging, { vapidKey: this.vapidKey })
      console.log('FCM Token:', this.token)
      return this.token
    } catch (err) {
      console.error('Notification Service Error:', err)
      return null
    }
  }

  // Handle foreground messages
  onMessageReceived(callback) {
    if (!messaging) return
    return onMessage(messaging, (payload) => {
      console.log('Received foreground message:', payload)
      callback(payload)
    })
  }

  // Capacitor (Android/iOS) Specific Logic
  async initCapacitor() {
    if (typeof window === 'undefined' || !window.Capacitor) return

    const { PushNotifications } = window.Capacitor.Plugins
    if (!PushNotifications) return

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

// ── Firebase Configuration ──
// مزرعة الأمل — Firebase Project: tarikmanger
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
const firebaseConfig = {
  apiKey:            "AIzaSyBCu8-z7-JZe9Z3BpJMAJ562OZBSa11W0w",
  authDomain:        "tarikmanger.firebaseapp.com",
  projectId:         "tarikmanger",
  storageBucket:     "tarikmanger.firebasestorage.app",
  messagingSenderId: "633933725815",
  appId:             "1:633933725815:web:a07dea02a383cb2d5c0672",
  measurementId:     "G-5K9KTBC196"
}

const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
})
export default app

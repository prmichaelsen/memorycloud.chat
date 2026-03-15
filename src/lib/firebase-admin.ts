import { initializeApp as _initializeApp } from '@prmichaelsen/firebase-admin-sdk-v8'

let initialized = false

export function initFirebaseAdmin() {
  if (initialized) return
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY
  console.log('[firebase-admin] init called, serviceAccount present:', !!serviceAccount, 'length:', serviceAccount?.length ?? 0)
  if (!serviceAccount) {
    console.warn('[firebase-admin] FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY not set — session creation will fail')
    console.warn('[firebase-admin] process.env keys:', Object.keys(process.env).filter(k => k.includes('FIREBASE')))
    return
  }
  try {
    _initializeApp({
      serviceAccount,
      projectId: 'agentbase-prod',
    })
    initialized = true
    console.log('[firebase-admin] initialized successfully')
  } catch (error: any) {
    console.error('[firebase-admin] init failed', error.message)
  }
}

export function getFirebaseAdmin() {
  initFirebaseAdmin()
}

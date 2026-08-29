import { ref, computed, readonly } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// State for flows the server does not implement yet (email verification code,
// password reset). Kept separate from the real auth store so wiring these up
// to a real backend later never has to touch sign-in/sign-up.
const _pending      = ref(null)
const _mockLoading   = ref(false)
const _mockError     = ref(null)

export function useAuth() {
  const store = useAuthStore()
  const { user, isAuthenticated, isLoading: storeLoading, error: storeError } = storeToRefs(store)

  const isLoading = computed(() => storeLoading.value || _mockLoading.value)
  const error     = computed(() => storeError.value ?? _mockError.value)

  function clearError() {
    store.clearError()
    _mockError.value = null
  }

  async function signIn(email, password) {
    await store.signIn(email, password)
  }

  async function signUp(name, email, password) {
    await store.signUp(name, email, password)
  }

  async function signOut() {
    await store.signOut()
  }

  async function changePassword(currentPassword, newPassword) {
    await store.changePassword(currentPassword, newPassword)
  }

  async function deleteAccount(currentPassword) {
    await store.deleteAccount(currentPassword)
  }

  // ---------------------------------------------------------------------
  // Stubs — replace with real API calls once the server supports them.
  // ---------------------------------------------------------------------
  async function verify(code) {
    if (!_pending.value) throw new Error('No pending verification.')
    _mockLoading.value = true
    _mockError.value = null
    try {
      await _delay(700)
      if (code.length !== 6) throw new Error('Enter the full 6-digit code.')
      const { redirectTo } = _pending.value
      _pending.value = null
      return redirectTo
    } catch (e) {
      _mockError.value = e.message || 'Invalid code. Please try again.'
      throw e
    } finally {
      _mockLoading.value = false
    }
  }

  async function resendCode() {
    if (!_pending.value) return
    await _delay(600)
  }

  async function sendPasswordReset(_email) {
    _mockLoading.value = true
    _mockError.value = null
    try {
      await _delay(700)
    } catch (e) {
      _mockError.value = e.message || 'Could not send reset link. Please try again.'
      throw e
    } finally {
      _mockLoading.value = false
    }
  }

  return {
    user,
    isAuthenticated,
    pendingVerification: readonly(_pending),
    isLoading,
    error,
    clearError,
    signIn,
    signUp,
    verify,
    resendCode,
    signOut,
    changePassword,
    deleteAccount,
    sendPasswordReset,
  }
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

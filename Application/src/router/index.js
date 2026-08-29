import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { usePreferences } from '@/composables/usePreferences'

const routes = [
  // ── Setup flow (public, guest-only) ────────────────────────────────────
  {
    path: '/welcome',
    name: 'welcome',
    component: () => import('@/views/auth/WelcomeView.vue'),
    meta: { guestOnly: true },
  },
  // ── Verification (public — requires pending state set by signIn/signUp) ──
  {
    path: '/verify',
    name: 'verify',
    component: () => import('@/views/auth/VerifyCodeView.vue'),
  },

  // ── Auth (public, guest-only) ──────────────────────────────────────────
  {
    path: '/sign-in',
    name: 'sign-in',
    component: () => import('@/views/auth/SignInView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/sign-up',
    name: 'sign-up',
    component: () => import('@/views/auth/SignUpView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/email-sent',
    name: 'email-sent',
    component: () => import('@/views/auth/EmailSentView.vue'),
    meta: { guestOnly: true },
  },

  // ── My Discs ───────────────────────────────────────────────────────────
  {
    path: '/discs',
    name: 'discs',
    component: () => import('@/views/discs/MyDiscsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/discs/add',
    name: 'discs-add',
    component: () => import('@/views/discs/AddDiscView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/discs/:id',
    component: () => import('@/views/discs/DiscDetailView.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '',       redirect: to => `/discs/${to.params.id}/throws` },
      { path: 'throws', name: 'disc-throws', component: () => import('@/views/discs/DiscThrowsView.vue') },
      { path: 'stats',  name: 'disc-stats',  component: () => import('@/views/discs/DiscStatsView.vue') },
      { path: 'people', name: 'disc-people', component: () => import('@/views/discs/DiscPeopleView.vue') },
    ],
  },
  {
    path: '/discs/:id/throw/:throwId',
    name: 'throw-detail',
    component: () => import('@/views/discs/ThrowDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/discs/:id/live',
    name: 'disc-live',
    component: () => import('@/views/discs/DiscLiveView.vue'),
    meta: { requiresAuth: true },
  },

  // ── Shared ─────────────────────────────────────────────────────────────
  {
    path: '/shared',
    name: 'shared',
    component: () => import('@/views/shared/SharedView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/shared/:id',
    name: 'shared-detail',
    component: () => import('@/views/shared/SharedDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/shared/:id/throw/:throwId',
    name: 'shared-throw-detail',
    component: () => import('@/views/discs/ThrowDetailView.vue'),
    meta: { requiresAuth: true },
  },

  // ── Settings ───────────────────────────────────────────────────────────
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/settings/SettingsView.vue'),
    meta: { requiresAuth: true },
  },

  // ── Global screens ─────────────────────────────────────────────────────
  {
    path: '/notifications',
    name: 'notifications',
    component: () => import('@/views/NotificationsInboxView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/friends',
    name: 'friends',
    component: () => import('@/views/friends/FriendsView.vue'),
    meta: { requiresAuth: true },
  },

  // ── Redirects ───────────────────────────────────────────────────────────
  { path: '/', redirect: '/welcome' },
  { path: '/:pathMatch(.*)*', redirect: '/welcome' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Routes whose error state must never leak into one another (e.g. a stale
// "email already exists" error from /sign-up must not still be showing after
// the user clicks through to /sign-in without resubmitting anything).
const AUTH_FORM_ROUTES = ['sign-in', 'sign-up']

router.beforeEach((to, from) => {
  const { isAuthenticated, pendingVerification, clearError } = useAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'welcome' }
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'discs' }
  }

  if (to.name === 'verify' && !pendingVerification.value) {
    return { name: 'welcome' }
  }

  // Landing on the sign-in/sign-up form from any other route (including the
  // other one of the pair) starts with a clean slate — any error still held
  // by the shared auth store/composable is left over from a previous submit
  // and must not bleed into the other form.
  if (AUTH_FORM_ROUTES.includes(to.name) && to.name !== from.name) {
    clearError()
  }
})

export default router

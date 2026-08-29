<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { onUnauthorized } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import SdSessionExpiredModal from '@/components/auth/SdSessionExpiredModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const { sessionExpired } = storeToRefs(authStore)

// Only a 401 that kills an already-signed-in session should surface the
// popup — a failed init() bootstrap (e.g. a stale token from a previous
// install) clears itself silently and redirects to welcome instead.
onUnauthorized(() => {
  if (authStore.isAuthenticated) authStore.flagSessionExpired()
})

// Never show the popup on the pre-auth screens (sign-in, sign-up, welcome,
// forgot-password, email-sent all set guestOnly; verify has none but is
// equally pre-auth) — showing "your session expired, sign in again" there
// makes no sense.
const showSessionExpired = computed(() => sessionExpired.value && !route.meta.guestOnly && route.name !== 'verify')
</script>

<template>
  <RouterView />
  <SdSessionExpiredModal v-if="showSessionExpired" />
</template>

<style>
*,
*::before,
*::after { box-sizing: border-box; }

html,
body {
  margin: 0;
  padding: 0;
  font-family: var(--sd-font-body);
  color: var(--sd-fg1);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* Prevent elastic bounce scroll on iOS outside scroll containers */
  overscroll-behavior: none;
  /* Full viewport including notch area */
  height: 100%;
}

/* Hide scrollbars everywhere while keeping content scrollable */
* {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE / legacy Edge */
}
*::-webkit-scrollbar {
  display: none; /* Chrome, Safari, newer Edge */
}

/* Remove tap highlight on all interactive elements */
a, button, [role="button"], input, select, textarea {
  -webkit-tap-highlight-color: transparent;
}

/* Prevent double-tap zoom, keep touch responsiveness */
button, a {
  touch-action: manipulation;
}
</style>

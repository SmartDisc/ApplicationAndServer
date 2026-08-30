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

/* Remove the WebView tap highlight everywhere.
   `-webkit-tap-highlight-color` is an inherited property, so declaring it on
   the root covers *every* element — including the plain `<div @click>` rows
   and cards that the old `a, button, input…` element list never matched. */
html {
  -webkit-tap-highlight-color: transparent;
}
/* Re-declared on the form controls some UA stylesheets reset it on. */
a, button, [role="button"], input, select, textarea, label,
.sd-tappable, .clickable {
  -webkit-tap-highlight-color: transparent;
}

/* Things meant to be tapped: no long-press callout or text selection.
   Text inputs are deliberately left selectable. */
a, button, [role="button"], .sd-tappable, .clickable {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

/* Prevent double-tap zoom, keep touch responsiveness */
a, button, [role="button"], select, .sd-tappable, .clickable {
  touch-action: manipulation;
}

/* Pointer and touch focus must not leave a ring behind — that grey/blue box
   lingering after a tap is the UA focus outline, not the tap highlight.
   Keyboard focus keeps a visible ring. */
:focus:not(:focus-visible) {
  outline: none;
}
a:focus-visible,
button:focus-visible,
[role="button"]:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--sd-azure);
  outline-offset: 2px;
}
</style>

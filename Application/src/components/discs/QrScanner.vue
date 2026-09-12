<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { CameraOff } from 'lucide-vue-next'
import { useQrScanner } from '@/composables/useQrScanner'
import { useI18n } from '@/i18n'

const emit = defineEmits(['decode', 'error'])
const { t } = useI18n()

const videoRef = ref(null)
const { error, start, stop } = useQrScanner()

onMounted(async () => {
  await start(videoRef.value, text => emit('decode', text))
  if (error.value) emit('error', error.value)
})

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="qr-scanner">
    <video v-show="!error" ref="videoRef" class="qr-scanner__video" playsinline muted></video>

    <div v-if="!error" class="qr-scanner__frame">
      <span class="qr-scanner__corner qr-scanner__corner--tl"></span>
      <span class="qr-scanner__corner qr-scanner__corner--tr"></span>
      <span class="qr-scanner__corner qr-scanner__corner--bl"></span>
      <span class="qr-scanner__corner qr-scanner__corner--br"></span>
    </div>

    <div v-if="error" class="qr-scanner__error">
      <CameraOff :size="32" :stroke-width="1.75" />
      <p>{{ t('discs.add.cameraError') }}</p>
    </div>
  </div>
</template>

<style scoped>
.qr-scanner {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 360px;
  margin: 0 auto;
  border-radius: var(--sd-r-md);
  overflow: hidden;
  background: var(--sd-ink-900, #10182a);
}

.qr-scanner__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qr-scanner__frame {
  position: absolute;
  inset: 14%;
  pointer-events: none;
}

.qr-scanner__corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border: 3px solid #fff;
  opacity: .9;
}
.qr-scanner__corner--tl { top: 0; left: 0; border-right: none; border-bottom: none; border-radius: 6px 0 0 0; }
.qr-scanner__corner--tr { top: 0; right: 0; border-left: none; border-bottom: none; border-radius: 0 6px 0 0; }
.qr-scanner__corner--bl { bottom: 0; left: 0; border-right: none; border-top: none; border-radius: 0 0 0 6px; }
.qr-scanner__corner--br { bottom: 0; right: 0; border-left: none; border-top: none; border-radius: 0 0 6px 0; }

.qr-scanner__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  padding: 24px;
  text-align: center;
  font-family: var(--sd-font-body);
  font-size: 14px;
}
</style>

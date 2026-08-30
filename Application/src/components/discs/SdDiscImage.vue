<script setup>
// The disc photo tile, shared by the disc list, the disc detail hero and both
// shared-disc views. Falls back to the SmartDisc mark whenever there is no
// photo, the fetch fails, or the bytes don't decode — the tile always renders
// at the same size, so a broken image can never disturb a list layout.
import { computed, ref, watch } from 'vue'
import { useDiscImage } from '@/composables/useDiscImage'

const props = defineProps({
  imageUrl: { type: String, default: null },
  size:     { type: Number, default: 48 },
  radius:   { type: String, default: 'var(--sd-r-md)' },
  alt:      { type: String, default: '' },
})

const { src, loading } = useDiscImage(() => props.imageUrl)

const decodeFailed = ref(false)
watch(src, () => { decodeFailed.value = false })

const showPhoto = computed(() => !!src.value && !decodeFailed.value)

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: props.radius,
}))
</script>

<template>
  <div :class="['disc-image', { 'disc-image--loading': loading && !showPhoto }]" :style="boxStyle">
    <img
      v-if="showPhoto"
      class="disc-image__photo"
      :src="src"
      :alt="alt"
      @error="decodeFailed = true"
    />
    <img v-else class="disc-image__mark" src="/images/SmartDisc_Mark.png" alt="" />
  </div>
</template>

<style scoped>
.disc-image {
  flex: none;
  overflow: hidden;
  background: linear-gradient(140deg, #1d3d72, #0a1c3d);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--sd-shadow-sm);
}

.disc-image__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.disc-image__mark {
  width: 74%;
  height: 74%;
  object-fit: contain;
}

.disc-image--loading .disc-image__mark {
  opacity: 0.45;
  animation: disc-image-pulse 1.1s var(--sd-ease-out) infinite alternate;
}

@keyframes disc-image-pulse {
  from { opacity: 0.3; }
  to   { opacity: 0.65; }
}

@media (prefers-reduced-motion: reduce) {
  .disc-image--loading .disc-image__mark { animation: none; }
}
</style>

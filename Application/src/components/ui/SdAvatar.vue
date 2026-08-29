<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '?' },
  size: { type: Number, default: 38 },
  hue:  { type: Number, default: 200 },
})

const initials = computed(() =>
  props.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
)

const bg = computed(() =>
  `linear-gradient(140deg, hsl(${props.hue} 35% 45%), hsl(${props.hue + 30} 40% 30%))`
)
</script>

<template>
  <span
    class="avatar"
    :style="{
      width: size + 'px',
      height: size + 'px',
      fontSize: Math.round(size * 0.36) + 'px',
      background: bg,
    }"
  >{{ initials }}</span>
</template>

<style scoped>
.avatar {
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: var(--sd-font-display);
  font-weight: 600;
  flex: none;
}
</style>

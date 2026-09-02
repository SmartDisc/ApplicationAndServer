<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Camera, Circle, ChartLine } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { SdBtn } from '@/components/ui'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()

const slides = [
  { icon: Camera, titleKey: 'onboarding.scan.title', captionKey: 'onboarding.scan.caption' },
  { icon: Circle, iconFill: 'var(--sd-danger)', iconSize: 64, plain: true, blink: true, titleKey: 'onboarding.record.title', captionKey: 'onboarding.record.caption' },
  { icon: ChartLine, titleKey: 'onboarding.analyze.title', captionKey: 'onboarding.analyze.caption' },
]

const trackRef = ref(null)
const activeIndex = ref(0)
const isLast = computed(() => activeIndex.value === slides.length - 1)

function onScroll(e) {
  const el = e.target
  activeIndex.value = Math.round(el.scrollLeft / el.clientWidth)
}

function scrollToIndex(index) {
  const el = trackRef.value
  if (!el) return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollTo({ left: index * el.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' })
}

function handlePrimary() {
  if (isLast.value) {
    finish()
  } else {
    scrollToIndex(activeIndex.value + 1)
  }
}

function finish() {
  router.push('/discs')
}
</script>

<template>
  <AuthLayout dark>
    <div class="onboarding-track" ref="trackRef" @scroll="onScroll">
      <div v-for="slide in slides" :key="slide.titleKey" class="onboarding-slide">
        <div class="onboarding-mark" :class="{ 'onboarding-mark--plain': slide.plain }">
          <component
            :is="slide.icon"
            :size="slide.iconSize ?? 40"
            :stroke-width="1.75"
            :fill="slide.iconFill ?? 'none'"
            :class="{ 'onboarding-mark__icon--blink': slide.blink }"
          />
        </div>
        <h1 class="onboarding-title">{{ t(slide.titleKey) }}</h1>
        <p class="onboarding-caption">{{ t(slide.captionKey) }}</p>
      </div>
    </div>

    <div class="onboarding-dots">
      <button
        v-for="(slide, i) in slides"
        :key="slide.titleKey"
        type="button"
        class="onboarding-dot"
        :class="{ 'onboarding-dot--on': i === activeIndex }"
        :aria-label="t(slide.titleKey)"
        @click="scrollToIndex(i)"
      />
    </div>

    <div class="onboarding-actions">
      <SdBtn variant="gold" size="lg" block @click="handlePrimary">
        {{ isLast ? t('onboarding.getStarted') : t('onboarding.next') }}
      </SdBtn>
    </div>
  </AuthLayout>
</template>

<style scoped>
.onboarding-track {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.onboarding-track::-webkit-scrollbar {
  display: none;
}

.onboarding-slide {
  flex: 0 0 100%;
  scroll-snap-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 8px;
}

.onboarding-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--sd-gold-grad);
  box-shadow: 0 10px 24px rgba(184, 146, 79, .35);
  color: #5a4416;
  margin: 0 0 24px;
}

.onboarding-mark--plain {
  width: auto;
  height: auto;
  background: none;
  box-shadow: none;
  color: var(--sd-fg2-on-dark);
}

.onboarding-mark__icon--blink {
  animation: sd-onboarding-blink 1.1s ease-in-out infinite;
}

@keyframes sd-onboarding-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

@media (prefers-reduced-motion: reduce) {
  .onboarding-mark__icon--blink {
    animation: none;
  }
}

.onboarding-title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 24px;
  letter-spacing: -0.015em;
  line-height: 1.15;
  color: var(--sd-fg-on-dark);
  margin: 0 0 6px;
}

.onboarding-caption {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sd-gold-300);
  margin: 0;
}

.onboarding-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 20px 0;
  flex: none;
}

.onboarding-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--sd-r-pill);
  background: rgba(255, 255, 255, .25);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: width var(--sd-dur-fast) var(--sd-ease-out),
              background var(--sd-dur-fast) var(--sd-ease-out);
}
.onboarding-dot--on {
  width: 22px;
  background: var(--sd-gold-grad);
}

.onboarding-actions {
  flex: none;
  padding-bottom: 40px;
}
</style>

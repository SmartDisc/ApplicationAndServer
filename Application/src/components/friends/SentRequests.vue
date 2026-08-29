<script setup>
import {Clock} from 'lucide-vue-next'
import SdAvatar from '@/components/ui/SdAvatar.vue'
import {SdList, SdListRow, SdSectionLabel} from '@/components/ui'
import {useFriends} from '@/composables/useFriends'
import {useI18n} from '@/i18n'

const {t} = useI18n()
const {sentRequests} = useFriends()
</script>

<template>
  <div v-if="sentRequests.length" class="friends-section">
    <SdSectionLabel>{{ t('friends.sent.label', { count: sentRequests.length }) }}</SdSectionLabel>
    <SdList>
      <SdListRow
        v-for="r in sentRequests"
        :key="r.id"
        :title="r.toName"
        :subtitle="r.toEmail"
      >
        <template #icon><SdAvatar :name="r.toName" :size="38" /></template>
        <template #trailing>
          <span class="pending-status">
            <Clock :size="14" />
            {{ t('friends.sent.pendingBadge') }}
          </span>
        </template>
      </SdListRow>
    </SdList>
  </div>
</template>

<style scoped>
.friends-section { margin-bottom: 24px; }

.pending-status {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: none;
  font-family: var(--sd-font-display);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--sd-gold-400);
  white-space: nowrap;
}
</style>

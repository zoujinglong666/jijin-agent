<template>
  <view class="add-fund-page">
    <view class="form-card">
      <wd-form ref="formRef" :model="formData" :schema="formSchema" border>
        <wd-form-item title="基金代码" prop="code">
          <wd-input
            v-model="formData.code"
            placeholder="输入代码或名称搜索"
            clearable
            @input="onCodeInput"
            @clear="onSearchClear"
          />
        </wd-form-item>

        <view v-if="searchResults.length > 0" class="search-results">
          <view
            v-for="item in searchResults"
            :key="item.code"
            class="search-item"
            @click="selectFund(item)"
          >
            <view class="search-item-main">
              <text class="search-item-name">{{ item.name }}</text>
              <text class="search-item-code">{{ item.code }}</text>
            </view>
            <view class="search-item-meta">
              <text v-if="item.type" class="search-item-type">{{ item.type }}</text>
              <text v-if="item.latestNav" class="search-item-nav">净值 {{ item.latestNav }}</text>
              <text v-if="item.dayChange !== null && item.dayChange !== 0" class="search-item-change" :class="item.dayChange >= 0 ? 'up' : 'down'">
                {{ item.dayChange >= 0 ? '+' : '' }}{{ item.dayChange }}%
              </text>
            </view>
          </view>
        </view>

        <view v-if="selectedFundInfo" class="auto-fill-hint">
          <text class="hint-icon">✓</text>
          <text class="hint-text">已自动填充: {{ selectedFundInfo.name }} · {{ selectedFundInfo.sector }}</text>
          <text v-if="selectedFundInfo.latestNav" class="hint-nav">净值 {{ selectedFundInfo.latestNav }}</text>
        </view>

        <wd-form-item title="基金名称" prop="name">
          <wd-input v-model="formData.name" placeholder="自动填充" clearable />
        </wd-form-item>
        <wd-form-item title="持有金额" prop="amount">
          <wd-input v-model="formData.amount" placeholder="请输入持有金额" type="number" clearable>
            <template #suffix>
              <text class="suffix-text">元</text>
            </template>
          </wd-input>
        </wd-form-item>
        <wd-form-item title="当前收益率" prop="profitRate">
          <wd-input v-model="formData.profitRate" placeholder="自动计算或手动输入" type="digit" clearable>
            <template #suffix>
              <text class="suffix-text">%</text>
            </template>
          </wd-input>
        </wd-form-item>
        <wd-form-item title="所属主题" prop="sector" is-link :value="sectorDisplay" placeholder="自动填充或选择" @click="showSectorPicker = true" />
      </wd-form>
    </view>

    <view class="submit-area">
      <wd-button
        type="primary"
        block
        :loading="submitting"
        @click="handleSubmit"
        custom-style="border-radius: 20rpx; height: 88rpx; font-size: 30rpx; background-color: #6B7FD7; border-color: #6B7FD7;"
      >
        {{ isEdit ? '保存修改' : '添加基金' }}
      </wd-button>
    </view>

    <wd-select-picker
      v-model="formData.sector"
      v-model:visible="showSectorPicker"
      :columns="sectorOptions"
      type="radio"
    />

    <wd-toast selector="add-fund-toast" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useFundStore } from '@/store'
import { SECTOR_LIST } from '@/types'
import { fundDataApi } from '@/services/api'
import type { FundSearchResult } from '@/services/api'
import type { FormSchema } from '@wot-ui/ui/components/wd-form/types'

const fundStore = useFundStore()
const formRef = ref()
const submitting = ref(false)
const editFundId = ref<string>('')
const showSectorPicker = ref(false)
const searchResults = ref<FundSearchResult[]>([])
const selectedFundInfo = ref<FundSearchResult | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const isEdit = computed(() => !!editFundId.value)

const formData = ref({
  name: '',
  code: '',
  amount: '',
  profitRate: '',
  sector: '',
})

const sectorOptions = SECTOR_LIST.map(s => ({ value: s, label: s }))

const sectorDisplay = computed(() => {
  if (!formData.value.sector) return ''
  const item = sectorOptions.find(s => s.value === formData.value.sector)
  return item ? item.label : formData.value.sector
})

const formSchema: FormSchema = {
  validate(model) {
    const issues: { path: string[]; message: string }[] = []
    if (!model.name || !model.name.trim()) {
      issues.push({ path: ['name'], message: '请输入基金名称' })
    }
    if (!model.code || !model.code.trim()) {
      issues.push({ path: ['code'], message: '请输入基金代码' })
    }
    if (!model.amount || isNaN(Number(model.amount)) || Number(model.amount) <= 0) {
      issues.push({ path: ['amount'], message: '请输入有效的持有金额' })
    }
    if (model.profitRate === '' || model.profitRate === undefined || isNaN(Number(model.profitRate))) {
      issues.push({ path: ['profitRate'], message: '请输入有效的收益率' })
    }
    if (!model.sector) {
      issues.push({ path: ['sector'], message: '请选择所属主题' })
    }
    return issues
  },
  isRequired(path: string) {
    return ['name', 'code', 'amount', 'profitRate', 'sector'].includes(path)
  }
}

function onCodeInput(value: string) {
  if (searchTimer) clearTimeout(searchTimer)
  searchResults.value = []
  selectedFundInfo.value = null

  if (!value || value.trim().length < 2) return

  searchTimer = setTimeout(async () => {
    try {
      const result = await fundDataApi.search(value.trim())
      searchResults.value = result.results || []
    } catch {
      searchResults.value = []
    }
  }, 400)
}

function onSearchClear() {
  searchResults.value = []
  selectedFundInfo.value = null
}

function selectFund(item: FundSearchResult) {
  formData.value.code = item.code
  formData.value.name = item.name
  formData.value.sector = item.sector
  selectedFundInfo.value = item
  searchResults.value = []
}

onLoad((options) => {
  if (options?.fundId) {
    editFundId.value = options.fundId
    const fund = fundStore.funds.find(f => f.id === options.fundId)
    if (fund) {
      formData.value = {
        name: fund.name,
        code: fund.code,
        amount: String(fund.amount),
        profitRate: String(fund.profitRate),
        sector: fund.sector,
      }
      uni.setNavigationBarTitle({ title: '编辑基金' })
    }
  } else {
    uni.setNavigationBarTitle({ title: '添加基金' })
  }
})

async function handleSubmit() {
  try {
    const { valid } = await formRef.value?.validate()
    if (!valid) return
  } catch {
    return
  }

  const amount = parseFloat(formData.value.amount)
  const profitRate = parseFloat(formData.value.profitRate)

  submitting.value = true

  try {
    if (isEdit.value) {
      fundStore.updateFund(editFundId.value, {
        name: formData.value.name.trim(),
        code: formData.value.code.trim(),
        amount,
        profitRate,
        sector: formData.value.sector,
      })
      uni.showToast({ title: '修改成功', icon: 'success' })
    } else {
      fundStore.addFund({
        name: formData.value.name.trim(),
        code: formData.value.code.trim(),
        amount,
        profitRate,
        sector: formData.value.sector,
      })
      uni.showToast({ title: '添加成功', icon: 'success' })
    }

    setTimeout(() => {
      uni.navigateBack()
    }, 1200)
  } catch {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.add-fund-page {
  min-height: 100vh;
  background-color: #F8FAFC;
  padding: 24rpx 32rpx;
}

.form-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.search-results {
  background: #FFFFFF;
  border-top: 1rpx solid #F1F5F9;
  max-height: 400rpx;
  overflow-y: auto;
}

.search-item {
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #F1F5F9;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:active {
    background-color: #F8FAFC;
  }
}

.search-item-main {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.search-item-name {
  font-size: 28rpx;
  color: #1E293B;
  font-weight: 500;
}

.search-item-code {
  font-size: 24rpx;
  color: #94A3B8;
}

.search-item-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.search-item-type {
  font-size: 22rpx;
  color: #64748B;
  background: #F1F5F9;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.search-item-nav {
  font-size: 24rpx;
  color: #64748B;
}

.search-item-change {
  font-size: 24rpx;
  font-weight: 500;

  &.up { color: #EF4444; }
  &.down { color: #22C55E; }
}

.auto-fill-hint {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 32rpx;
  background: #F0FDF4;
  border-top: 1rpx solid #DCFCE7;
}

.hint-icon {
  color: #22C55E;
  font-size: 28rpx;
  font-weight: bold;
}

.hint-text {
  font-size: 24rpx;
  color: #166534;
  flex: 1;
}

.hint-nav {
  font-size: 24rpx;
  color: #166534;
  font-weight: 500;
}

.suffix-text {
  font-size: 28rpx;
  color: #94A3B8;
}

.submit-area {
  margin-top: 48rpx;
  padding: 0 16rpx;
}
</style>

<template>
  <view class="add-fund-page">
    <view class="form-card">
      <wd-form ref="formRef" :model="formData" :schema="formSchema" border>
        <wd-form-item title="基金名称" prop="name">
          <wd-input v-model="formData.name" placeholder="请输入基金名称" clearable />
        </wd-form-item>
        <wd-form-item title="基金代码" prop="code">
          <wd-input v-model="formData.code" placeholder="请输入基金代码" clearable />
        </wd-form-item>
        <wd-form-item title="持有金额" prop="amount">
          <wd-input v-model="formData.amount" placeholder="请输入持有金额" type="number" clearable>
            <template #suffix>
              <text class="suffix-text">元</text>
            </template>
          </wd-input>
        </wd-form-item>
        <wd-form-item title="当前收益率" prop="profitRate">
          <wd-input v-model="formData.profitRate" placeholder="请输入当前收益率" type="digit" clearable>
            <template #suffix>
              <text class="suffix-text">%</text>
            </template>
          </wd-input>
        </wd-form-item>
        <wd-form-item title="所属主题" prop="sector" is-link :value="sectorDisplay" placeholder="请选择所属主题" @click="showSectorPicker = true" />
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
import type { FormSchema } from '@wot-ui/ui/components/wd-form/types'

const fundStore = useFundStore()
const formRef = ref()
const submitting = ref(false)
const editFundId = ref<string>('')
const showSectorPicker = ref(false)

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

.suffix-text {
  font-size: 28rpx;
  color: #94A3B8;
}

.submit-area {
  margin-top: 48rpx;
  padding: 0 16rpx;
}
</style>

<template>
  <view class="monthly-report">
    <view class="header">
      <text class="title">月度投资行为报告</text>
      <view class="header-actions">
        <picker 
          :value="selectedMonthIndex" 
          :range="monthOptions" 
          @change="onMonthChange"
          class="month-picker"
        >
          <view class="picker-content">
            <text class="selected-month">{{ monthOptions[selectedMonthIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <button @click="generateReport" class="generate-btn">
          生成
        </button>
      </view>
    </view>

    <view v-if="currentReport" class="report-content">
      <!-- 报告摘要 -->
      <view class="report-summary">
        <text class="summary-title">{{ currentReport.title }}</text>
        <text class="summary-text">{{ currentReport.summary }}</text>
        
        <view class="risk-indicator">
          <text class="risk-label">风险等级:</text>
          <view class="risk-badge" :class="currentReport.riskLevel">
            {{ getRiskLevelLabel(currentReport.riskLevel) }}
          </view>
        </view>
      </view>

      <!-- 操作统计 -->
      <view class="stats-section">
        <text class="section-title">操作统计</text>
        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-value">{{ currentReport.operationsCount }}</text>
            <text class="stat-label">总操作次数</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ insightsCount }}</text>
            <text class="stat-label">行为洞察</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ recommendationsCount }}</text>
            <text class="stat-label">投资建议</text>
          </view>
        </view>
      </view>

      <!-- 行为洞察 -->
      <view v-if="currentReport.insights.length > 0" class="insights-section">
        <text class="section-title">行为洞察</text>
        <view class="insights-list">
          <view 
            v-for="(insight, index) in currentReport.insights" 
            :key="index" 
            class="insight-item"
          >
            <view class="insight-icon">💡</view>
            <text class="insight-text">{{ insight }}</text>
          </view>
        </view>
      </view>

      <!-- 投资建议 -->
      <view v-if="currentReport.recommendations.length > 0" class="recommendations-section">
        <text class="section-title">投资建议</text>
        <view class="recommendations-list">
          <view 
            v-for="(recommendation, index) in currentReport.recommendations" 
            :key="index" 
            class="recommendation-item"
          >
            <view class="recommendation-icon">🎯</view>
            <text class="recommendation-text">{{ recommendation }}</text>
          </view>
        </view>
      </view>

      <!-- 板块分布 -->
      <view class="sector-section">
        <text class="section-title">持仓板块分布</text>
        <view class="sector-chart">
          <!-- 这里可以集成图表组件 -->
          <view class="chart-placeholder">
            <text class="chart-text">板块分布图表</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <text class="empty-text">暂无月度报告</text>
      <text class="empty-subtext">点击"生成"按钮创建您的月度投资行为报告</text>
    </view>

    <!-- 历史报告 -->
    <view class="history-section">
      <text class="section-title">历史报告</text>
      <view class="history-list">
        <view 
          v-for="report in reportHistory" 
          :key="report.id" 
          class="history-item"
          @click="selectReport(report)"
        >
          <view class="history-header">
            <text class="report-title">{{ report.title }}</text>
            <view class="risk-badge small" :class="report.riskLevel">
              {{ getRiskLevelLabel(report.riskLevel) }}
            </view>
          </view>
          <text class="report-date">{{ formatDate(report.createdAt) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '../stores/notification'
import { useAuthStore } from '@/store'

const notificationStore = useNotificationStore()
const authStore = useAuthStore()

// 状态
const selectedMonthIndex = ref(0)
const monthOptions = ref<string[]>([])
const currentReport = ref<any>(null)

// 计算属性
const reportHistory = computed(() => notificationStore.monthlyReports)
const insightsCount = computed(() => currentReport.value?.insights?.length || 0)
const recommendationsCount = computed(() => currentReport.value?.recommendations?.length || 0)

// 生成月份选项
const generateMonthOptions = () => {
  const options: string[] = []
  const now = new Date()
  
  // 生成最近6个月的选项
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    options.push(`${year}年${month}月`)
  }
  
  monthOptions.value = options
}

// 获取风险等级标签
const getRiskLevelLabel = (level: string): string => {
  const labels: Record<string, string> = {
    'low': '低风险',
    'medium': '中风险',
    'high': '高风险'
  }
  return labels[level] || level
}

// 格式化日期
const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// 月份选择
const onMonthChange = (e: any) => {
  selectedMonthIndex.value = e.detail.value
}

// 生成报告
const generateReport = async () => {
  try {
    uni.showLoading({ title: '生成中...' })
    
    // 从月份选项中提取年月
    const selectedMonth = monthOptions.value[selectedMonthIndex.value]
    const match = selectedMonth.match(/(\d+)年(\d+)月/)
    let monthString = ''
    
    if (match) {
      const year = match[1]
      const month = match[2].padStart(2, '0')
      monthString = `${year}-${month}`
    }
    
    const report = await notificationStore.generateMonthlyReport(monthString)
    if (report) {
      currentReport.value = report
      uni.showToast({
        title: '报告生成成功',
        icon: 'success'
      })
    } else {
      uni.showToast({
        title: '生成失败',
        icon: 'error'
      })
    }
  } catch (error) {
    console.error('生成报告失败:', error)
    uni.showToast({
      title: '生成失败',
      icon: 'error'
    })
  } finally {
    uni.hideLoading()
  }
}

// 选择历史报告
const selectReport = (report: any) => {
  currentReport.value = report
}

// 初始化
onMounted(async () => {
  generateMonthOptions()
  
  // 加载历史报告
  await notificationStore.getReportHistory()
  
  // 如果有历史报告，显示最新的
  if (reportHistory.value.length > 0) {
    currentReport.value = reportHistory.value[0]
  }
})
</script>

<style scoped>
.monthly-report {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-picker {
  background: #f0f0f0;
  border-radius: 6px;
  padding: 4px 8px;
}

.picker-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.selected-month {
  font-size: 14px;
  color: #333;
}

.picker-arrow {
  font-size: 10px;
  color: #666;
}

.generate-btn {
  background: #007aff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
}

.report-content {
  margin-bottom: 24px;
}

.report-summary {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.summary-title {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.summary-text {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.risk-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.risk-label {
  font-size: 14px;
  color: #666;
}

.risk-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  color: white;
}

.risk-badge.low {
  background: #34c759;
}

.risk-badge.medium {
  background: #ff9500;
}

.risk-badge.high {
  background: #ff3b30;
}

.risk-badge.small {
  font-size: 10px;
  padding: 1px 6px;
}

.section-title {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #007aff;
  margin-bottom: 4px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #666;
}

.insights-list, .recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.insight-item, .recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.insight-icon, .recommendation-icon {
  font-size: 16px;
  margin-top: 2px;
}

.insight-text, .recommendation-text {
  font-size: 14px;
  color: #333;
  flex: 1;
}

.sector-chart {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-text {
  font-size: 14px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 32px 16px;
}

.empty-text {
  display: block;
  font-size: 16px;
  color: #666;
  margin-bottom: 8px;
}

.empty-subtext {
  display: block;
  font-size: 12px;
  color: #999;
}

.history-section {
  margin-top: 24px;
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.report-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.report-date {
  font-size: 12px;
  color: #999;
}
</style>
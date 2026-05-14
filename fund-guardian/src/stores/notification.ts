import { defineStore } from 'pinia'
import { ref } from 'vue'
import { behaviorInterventionApi } from '../services/api'

export interface BehaviorIntervention {
  id: string
  type: 'panic' | 'frequent_check' | 'chase_rise' | 'frequent_trade' | 'concentration_risk'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  createdAt: string
  isRead: boolean
  isIgnored: boolean
  fundCode?: string
  fundName?: string
  suggestion?: string
}

export interface MonthlyReport {
  id: string
  month: string
  title: string
  summary: string
  operationsCount: number
  riskLevel: 'low' | 'medium' | 'high'
  insights: string[]
  recommendations: string[]
  createdAt: string
}

export const useNotificationStore = defineStore('notification', () => {
  // 状态
  const interventions = ref<BehaviorIntervention[]>([])
  const monthlyReports = ref<MonthlyReport[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)

  // 获取行为干预提醒
  const getBehaviorInterventions = async (): Promise<BehaviorIntervention[]> => {
    try {
      const result = await behaviorInterventionApi.getInterventions()
      interventions.value = result.interventions || []
      updateUnreadCount()
      return interventions.value
    } catch (error) {
      console.error('获取行为干预失败:', error)
      return []
    }
  }

  // 检查行为干预
  const checkBehaviorInterventions = async (): Promise<BehaviorIntervention[]> => {
    try {
      const result = await behaviorInterventionApi.checkInterventions()
      const newInterventions = result.interventions || []
      
      // 合并新的干预提醒
      interventions.value = [...newInterventions, ...interventions.value]
      updateUnreadCount()
      
      return newInterventions
    } catch (error) {
      console.error('检查行为干预失败:', error)
      return []
    }
  }

  // 标记干预为已读
  const markInterventionRead = async (id: string): Promise<boolean> => {
    try {
      const result = await behaviorInterventionApi.markInterventionRead(id)
      if (result.success) {
        const intervention = interventions.value.find(item => item.id === id)
        if (intervention) {
          intervention.isRead = true
          updateUnreadCount()
        }
      }
      return result.success || false
    } catch (error) {
      console.error('标记已读失败:', error)
      return false
    }
  }

  // 忽略干预
  const ignoreIntervention = async (id: string): Promise<boolean> => {
    try {
      const result = await behaviorInterventionApi.ignoreIntervention(id)
      if (result.success) {
        const index = interventions.value.findIndex(item => item.id === id)
        if (index >= 0) {
          interventions.value.splice(index, 1)
          updateUnreadCount()
        }
      }
      return result.success || false
    } catch (error) {
      console.error('忽略干预失败:', error)
      return false
    }
  }

  // 生成月度报告
  const generateMonthlyReport = async (month?: string): Promise<MonthlyReport | null> => {
    try {
      const result = await behaviorInterventionApi.generateMonthlyReport(month)
      const report = result.report
      
      if (report) {
        // 添加到报告列表
        monthlyReports.value.unshift(report)
      }
      
      return report
    } catch (error) {
      console.error('生成月度报告失败:', error)
      return null
    }
  }

  // 获取月度报告
  const getMonthlyReport = async (date?: string): Promise<MonthlyReport | null> => {
    try {
      const result = await behaviorInterventionApi.getMonthlyReport(date)
      return result.report || null
    } catch (error) {
      console.error('获取月度报告失败:', error)
      return null
    }
  }

  // 获取历史报告
  const getReportHistory = async (): Promise<MonthlyReport[]> => {
    try {
      const result = await behaviorInterventionApi.getReportHistory()
      monthlyReports.value = result.reports || []
      return monthlyReports.value
    } catch (error) {
      console.error('获取历史报告失败:', error)
      return []
    }
  }

  // 更新未读数量
  const updateUnreadCount = () => {
    unreadCount.value = interventions.value.filter(item => !item.isRead && !item.isIgnored).length
  }

  // 按类型筛选干预
  const getInterventionsByType = (type: string): BehaviorIntervention[] => {
    return interventions.value.filter(item => item.type === type)
  }

  // 获取高优先级干预
  const getHighPriorityInterventions = (): BehaviorIntervention[] => {
    return interventions.value.filter(item => item.severity === 'high' && !item.isRead && !item.isIgnored)
  }

  // 加载所有通知数据
  const loadAllNotifications = async () => {
    loading.value = true
    try {
      await Promise.all([
        getBehaviorInterventions(),
        getReportHistory()
      ])
    } catch (error) {
      console.error('加载通知数据失败:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    interventions,
    monthlyReports,
    unreadCount,
    loading,

    // 方法
    getBehaviorInterventions,
    checkBehaviorInterventions,
    markInterventionRead,
    ignoreIntervention,
    generateMonthlyReport,
    getMonthlyReport,
    getReportHistory,
    getInterventionsByType,
    getHighPriorityInterventions,
    loadAllNotifications
  }
})
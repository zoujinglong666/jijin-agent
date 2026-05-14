import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '../utils/http'

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
      const response = await http.get('/api/notification/interventions')
      interventions.value = response.data.interventions || []
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
      const response = await http.post('/api/notification/interventions/check')
      const newInterventions = response.data.interventions || []
      
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
      const response = await http.post(`/api/notification/interventions/${id}/mark-read`)
      if (response.data.success) {
        const intervention = interventions.value.find(item => item.id === id)
        if (intervention) {
          intervention.isRead = true
          updateUnreadCount()
        }
      }
      return response.data.success || false
    } catch (error) {
      console.error('标记已读失败:', error)
      return false
    }
  }

  // 忽略干预
  const ignoreIntervention = async (id: string): Promise<boolean> => {
    try {
      const response = await http.post(`/api/notification/interventions/${id}/ignore`)
      if (response.data.success) {
        const index = interventions.value.findIndex(item => item.id === id)
        if (index >= 0) {
          interventions.value.splice(index, 1)
          updateUnreadCount()
        }
      }
      return response.data.success || false
    } catch (error) {
      console.error('忽略干预失败:', error)
      return false
    }
  }

  // 生成月度报告
  const generateMonthlyReport = async (month?: string): Promise<MonthlyReport | null> => {
    try {
      const response = await http.post('/api/notification/reports/generate', { month })
      const report = response.data.report
      
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
      const response = await http.get(`/api/notification/reports/monthly${date ? `?date=${date}` : ''}`)
      return response.data.report || null
    } catch (error) {
      console.error('获取月度报告失败:', error)
      return null
    }
  }

  // 获取历史报告
  const getReportHistory = async (): Promise<MonthlyReport[]> => {
    try {
      const response = await http.get('/api/notification/reports/history')
      monthlyReports.value = response.data.reports || []
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
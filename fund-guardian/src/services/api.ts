const BASE_URL = import.meta.env.VITE_API_BASE_URL + '/api'

interface ApiResult<T = any> {
  code: number
  message: string
  data: T
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  data?: any
  noAuth?: boolean
}

function getToken(): string {
  return uni.getStorageSync('fg_auth_token') || ''
}

export function setToken(token: string): void {
  uni.setStorageSync('fg_auth_token', token)
}

export function clearToken(): void {
  uni.removeStorageSync('fg_auth_token')
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

class ApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'ApiError'
  }
}

async function request<T>(options: RequestOptions): Promise<T> {
  const { method, url, data, noAuth } = options
  const header: Record<string, string> = { 'Content-Type': 'application/json' }

  if (!noAuth) {
    const token = getToken()
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
  }

  try {
    const response = await uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
    })

    // HTTP 层面的 401 处理
    if (response.statusCode === 401) {
      clearToken()
      uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/login/index' })
      }, 1500)
      throw new ApiError(20001, '未授权，请重新登录')
    }

    // HTTP 层面的 429 限流
    if (response.statusCode === 429) {
      throw new ApiError(10003, '请求过于频繁，请稍后再试')
    }

    // HTTP 成功状态码，解析统一返回结构 { code, message, data }
    if (response.statusCode >= 200 && response.statusCode < 300) {
      const result = response.data as ApiResult<T>
      // 兼容：如果后端返回的不是统一结构（如SSE），直接返回
      if (result && typeof result.code === 'number') {
        if (result.code === 0) {
          return result.data
        }
        // 业务错误（code !== 0）
        throw new ApiError(result.code, result.message || '操作失败')
      }
      // 非统一结构（如直接返回的数据），直接透传
      return response.data as T
    }

    // 其他HTTP错误
    const errMsg = (response.data as any)?.message || `API Error: ${response.statusCode}`
    throw new ApiError(10000, errMsg)
  } catch (error) {
    if (error instanceof ApiError) throw error
    console.error('API request failed:', error)
    throw new ApiError(10000, error instanceof Error ? error.message : '网络请求失败')
  }
}

export const authApi = {
  register(email: string, password: string) {
    return request<{ user: any; token: string }>({
      method: 'POST',
      url: '/auth/register',
      data: { email, password },
      noAuth: true,
    })
  },
  login(email: string, password: string) {
    return request<{ user: any; token: string }>({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
      noAuth: true,
    })
  },
  getProfile() {
    return request({ method: 'GET', url: '/auth/profile' })
  },
  updateSettings(updates: any) {
    return request({ method: 'POST', url: '/auth/settings', data: updates })
  },
}

export const agentApi = {
  run() {
    return request({ method: 'POST', url: '/agent/run' })
  },
  getContext() {
    return request({ method: 'GET', url: '/agent/context' })
  },
  triggerBehavior(event: string) {
    return request({ method: 'POST', url: '/agent/trigger/behavior', data: { event } })
  },
  getMemory() {
    return request({ method: 'GET', url: '/agent/memory' })
  },
  getTrends() {
    return request({ method: 'GET', url: '/agent/memory/trends' })
  },
}

export const portfolioApi = {
  getFunds() {
    return request({ method: 'GET', url: '/portfolio/funds' })
  },
  addFund(fund: any) {
    return request({ method: 'POST', url: '/portfolio/funds', data: fund })
  },
  updateFund(fundId: string, updates: any) {
    return request({ method: 'PUT', url: `/portfolio/funds/${fundId}`, data: updates })
  },
  deleteFund(fundId: string) {
    return request({ method: 'DELETE', url: `/portfolio/funds/${fundId}` })
  },
  getAnalysis() {
    return request({ method: 'GET', url: '/portfolio/analysis' })
  },
  addAction(action: any) {
    return request({ method: 'POST', url: '/portfolio/actions', data: action })
  },
  getActions(fundId?: string) {
    const query = fundId ? `?fundId=${fundId}` : ''
    return request({ method: 'GET', url: `/portfolio/actions${query}` })
  },
  importFunds(funds: any[]) {
    return request({ method: 'POST', url: '/portfolio/import', data: { funds } })
  },
}

export const behaviorApi = {
  recordEvent(event: string) {
    return request({ method: 'POST', url: '/behavior/events', data: { event } })
  },
  getState() {
    return request({ method: 'GET', url: '/behavior/state' })
  },
  getCount(event: string, hours: number) {
    return request({ method: 'GET', url: `/behavior/count/${event}/${hours}` })
  },
  getPersonality() {
    return request({ method: 'GET', url: '/behavior/personality' })
  },
  getTags() {
    return request({ method: 'GET', url: '/behavior/tags' })
  },
  getStats() {
    return request({ method: 'GET', url: '/behavior/stats' })
  },
  getLogs() {
    return request({ method: 'GET', url: '/behavior/logs' })
  },
}

export const riskApi = {
  getSnapshot() {
    return request({ method: 'GET', url: '/risk/snapshot' })
  },
  getScenarios() {
    return request({ method: 'GET', url: '/risk/scenarios' })
  },
  runStressTest(scenario: any) {
    return request({ method: 'POST', url: '/risk/stress-test', data: scenario })
  },
  getAlerts() {
    return request({ method: 'GET', url: '/risk/alerts' })
  },
  getHistory() {
    return request({ method: 'GET', url: '/risk/history' })
  },
}

export const regretApi = {
  getScenarios() {
    return request({ method: 'GET', url: '/regret/scenarios' })
  },
  runSimulation(scenarioId: string) {
    return request({ method: 'POST', url: '/regret/simulate', data: { scenarioId } })
  },
}

export const chatApi = {
  chat(messages: any[], modelId?: string) {
    return request<{ content: string }>({ method: 'POST', url: '/chat', data: { messages, modelId } })
  },
  chatStream(messages: any[], modelId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const token = getToken()
      const task = uni.request({
        url: `${BASE_URL}/chat/stream`,
        method: 'POST',
        data: { messages, modelId },
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'text/event-stream',
        },
        enableChunked: true,
        success: (res) => {
          if (res.statusCode === 401) {
            clearToken()
            uni.showToast({ title: '登录已过期', icon: 'none' })
            setTimeout(() => { uni.reLaunch({ url: '/pages/login/index' }) }, 1500)
            reject(new ApiError(20001, '未授权'))
            return
          }
          if (res.statusCode === 429) {
            reject(new ApiError(10003, '请求过于频繁'))
            return
          }
          if (res.statusCode !== 200) {
            const result = res.data as any
            const errMsg = result?.message || `API Error: ${res.statusCode}`
            reject(new ApiError(result?.code || 10000, errMsg))
            return
          }
          resolve(res.data as string)
        },
        fail: (err) => {
          reject(new ApiError(10000, err.errMsg || '网络请求失败'))
        },
      })
      return task
    })
  },
}

export const growthApi = {
  getMetrics() {
    return request({ method: 'GET', url: '/growth/metrics' })
  },
  updateMetrics(updates: any) {
    return request({ method: 'PUT', url: '/growth/metrics', data: updates })
  },
}

export const newsApi = {
  getEvents(sectors?: string[], limit?: number) {
    const params: string[] = []
    if (sectors) params.push(`sectors=${sectors.join(',')}`)
    if (limit) params.push(`limit=${limit}`)
    const query = params.length > 0 ? `?${params.join('&')}` : ''
    return request({ method: 'GET', url: `/news${query}` })
  },
}

export const llmApi = {
  chat(messages: any[], modelId?: string) {
    return request({ method: 'POST', url: '/llm/chat', data: { messages, modelId } })
  },
  chatStream(messages: any[], modelId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const token = getToken()
      const task = uni.request({
        url: `${BASE_URL}/llm/chat/stream`,
        method: 'POST',
        data: { messages, modelId },
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'text/event-stream',
        },
        enableChunked: true,
        success: (res) => {
          if (res.statusCode === 401) {
            clearToken()
            uni.showToast({ title: '登录已过期', icon: 'none' })
            setTimeout(() => {
              uni.reLaunch({ url: '/pages/login/index' })
            }, 1500)
            reject(new ApiError(20001, '未授权'))
            return
          }
          if (res.statusCode === 429) {
            reject(new ApiError(10003, '请求过于频繁'))
            return
          }
          if (res.statusCode !== 200) {
            const result = res.data as any
            const errMsg = result?.message || `API Error: ${res.statusCode}`
            reject(new ApiError(result?.code || 10000, errMsg))
            return
          }
          resolve(res.data as string)
        },
        fail: (err) => {
          reject(new ApiError(10000, err.errMsg || '网络请求失败'))
        },
      })
      return task
    })
  },
  getModels() {
    return request({ method: 'GET', url: '/llm/models' })
  },
  setModel(modelId: string) {
    return request({ method: 'PUT', url: '/llm/model', data: { modelId } })
  },
  getCurrentModel() {
    return request({ method: 'GET', url: '/llm/model' })
  },
  getApiKey() {
    return request<{ hasKey: boolean; maskedKey: string }>({ method: 'GET', url: '/llm/key' })
  },
  setApiKey(apiKey: string) {
    return request<{ hasKey: boolean; maskedKey: string }>({ method: 'PUT', url: '/llm/key', data: { apiKey } })
  },
}

export const fundDataApi = {
  search(keyword: string, limit?: number) {
    const params = [`keyword=${encodeURIComponent(keyword)}`]
    if (limit) params.push(`limit=${limit}`)
    return request<{ results: FundSearchResult[] }>({ method: 'GET', url: `/fund-data/search?${params.join('&')}` })
  },
  getDetail(code: string) {
    return request<FundSearchResult>({ method: 'GET', url: `/fund-data/detail?code=${code}` })
  },
}

export const notificationApi = {
  getList(limit?: number) {
    const query = limit ? `?limit=${limit}` : ''
    return request<{ list: NotificationItem[] }>({ method: 'GET', url: `/notifications${query}` })
  },
  getUnreadCount() {
    return request<{ count: number }>({ method: 'GET', url: '/notifications/unread-count' })
  },
  markRead(id: number) {
    return request({ method: 'PUT', url: `/notifications/${id}/read` })
  },
  markAllRead() {
    return request<{ count: number }>({ method: 'PUT', url: '/notifications/read-all' })
  },
}

export interface FundSearchResult {
  code: string
  name: string
  type: string
  sector: string
  latestNav: number | null
  accNav: number | null
  dayChange: number | null
  weekChange: number | null
  monthChange: number | null
  threeMonthChange: number | null
  yearChange: number | null
  navDate: string | null
}

export interface NotificationItem {
  id: number
  type: string
  title: string
  content: string
  level: string
  sector?: string
  read: boolean
  createdAt: string
}
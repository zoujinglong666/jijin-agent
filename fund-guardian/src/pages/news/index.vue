<template>
  <view class="news-page">
    <view class="header-section">
      <view class="header-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: currentTab === tab.id }"
          @tap="switchTab(tab.id)"
        >
          <text class="tab-text">{{ tab.name }}</text>
          <view v-if="currentTab === tab.id" class="tab-indicator"></view>
        </view>
      </view>
    </view>

    <view class="content-section">
      <view v-if="loading" class="loading-section">
        <wd-loading size="40rpx" />
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="newsList.length === 0" class="empty-section">
        <wd-empty description="暂无相关资讯" />
      </view>

      <view v-else class="news-list">
        <view
          v-for="news in newsList"
          :key="news.id"
          class="news-card"
          @tap="openNewsDetail(news)"
        >
          <view class="news-header">
            <view class="news-source">
              <text class="source-tag">{{ news.source }}</text>
              <text class="news-time">{{ formatTime(news.publishTime) }}</text>
            </view>
            <view v-if="news.impact" class="impact-badge" :class="getImpactClass(news.impact)">
              {{ news.impact }}
            </view>
          </view>
          
          <view class="news-content">
            <text class="news-title">{{ news.title }}</text>
            <text class="news-summary">{{ news.summary }}</text>
          </view>
          
          <view class="news-footer">
            <view class="news-tags">
              <text v-for="tag in news.tags" :key="tag" class="tag-item">{{ tag }}</text>
            </view>
            <view class="news-actions">
              <view class="action-item" @tap.stop="toggleBookmark(news)">
                <CarbonIcon 
                  :name="news.bookmarked ? 'bookmark-filled' : 'bookmark'" 
                  size="16" 
                  :color="news.bookmarked ? '#6B7FD7' : '#94A3B8'" 
                />
              </view>
              <view class="action-item" @tap.stop="shareNews(news)">
                <CarbonIcon name="share" size="16" color="#94A3B8" />
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <wd-popup
      v-model="showDetail"
      position="bottom"
      custom-style="border-radius: 32rpx 32rpx 0 0; padding: 40rpx 32px; max-height: 85vh;"
    >
      <view v-if="selectedNews" class="news-detail">
        <view class="detail-header">
          <text class="detail-title">{{ selectedNews.title }}</text>
          <view class="detail-meta">
            <text class="detail-source">{{ selectedNews.source }}</text>
            <text class="detail-time">{{ formatTime(selectedNews.publishTime, true) }}</text>
          </view>
        </view>
        
        <view class="detail-content">
          <text class="detail-text">{{ selectedNews.content }}</text>
          
          <view v-if="selectedNews.relatedFunds?.length" class="related-funds">
            <text class="related-title">相关基金</text>
            <view class="funds-list">
              <view
                v-for="fund in selectedNews.relatedFunds"
                :key="fund.code"
                class="fund-item"
                @tap="viewFundDetail(fund)"
              >
                <text class="fund-name">{{ fund.name }}</text>
                <text class="fund-code">{{ fund.code }}</text>
                <view class="fund-change" :class="{ positive: fund.change >= 0 }">
                  {{ fund.change >= 0 ? '+' : '' }}{{ fund.change.toFixed(2) }}%
                </view>
              </view>
            </view>
          </view>
        </view>
        
        <view class="detail-actions">
          <view class="action-btn" @tap="toggleBookmark(selectedNews)">
            <CarbonIcon 
              :name="selectedNews.bookmarked ? 'bookmark-filled' : 'bookmark'" 
              size="20" 
              :color="selectedNews.bookmarked ? '#6B7FD7' : '#64748B'" 
            />
            <text>{{ selectedNews.bookmarked ? '已收藏' : '收藏' }}</text>
          </view>
          <view class="action-btn" @tap="shareNews(selectedNews)">
            <CarbonIcon name="share" size="20" color="#64748B" />
            <text>分享</text>
          </view>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFundStore } from '@/store'
import { newsApi } from '@/services/api'

const fundStore = useFundStore()

const tabs = ref([
  { id: 'all', name: '全部' },
  { id: 'market', name: '市场' },
  { id: 'policy', name: '政策' },
  { id: 'company', name: '公司' },
  { id: 'analysis', name: '分析' }
])

const currentTab = ref('all')
const loading = ref(false)
const newsList = ref<any[]>([])
const selectedNews = ref<any>(null)
const showDetail = ref(false)

onMounted(() => {
  loadNews()
})

async function loadNews() {
  loading.value = true
  try {
    const result = await newsApi.getNews({ category: currentTab.value }) as any
    newsList.value = result?.news || []
  } catch (e) {
    console.error('loadNews failed:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function switchTab(tabId: string) {
  currentTab.value = tabId
  loadNews()
}

function formatTime(timestamp: number, full = false): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes}分钟前`
  } else if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours}小时前`
  } else if (full) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

function getImpactClass(impact: string): string {
  const map: Record<string, string> = {
    '重大利好': 'impact-positive',
    '利好': 'impact-positive',
    '利空': 'impact-negative', 
    '重大利空': 'impact-negative'
  }
  return map[impact] || 'impact-neutral'
}

function openNewsDetail(news: any) {
  selectedNews.value = news
  showDetail.value = true
}

function toggleBookmark(news: any) {
  news.bookmarked = !news.bookmarked
  try {
    if (news.bookmarked) {
      newsApi.bookmarkNews(news.id)
    } else {
      newsApi.unbookmarkNews(news.id)
    }
  } catch (e) {
    console.error('toggleBookmark failed:', e)
  }
}

function shareNews(news: any) {
  // 这里可以实现分享功能
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

function viewFundDetail(fund: any) {
  // 跳转到基金详情页
  uni.navigateTo({
    url: `/pages/fund-detail/index?code=${fund.code}&name=${encodeURIComponent(fund.name)}`
  })
}
</script>

<style lang="scss" scoped>
.news-page {
  min-height: 100vh;
  background: #F8FAFC;
  padding-bottom: 60rpx;
}

.header-section {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #FFFFFF;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.header-tabs {
  display: flex;
  padding: 24rpx 32rpx 0;
  border-bottom: 1rpx solid #F1F5F9;
}

.tab-item {
  position: relative;
  padding: 0 24rpx 20rpx;
  margin-right: 32rpx;
}

.tab-text {
  font-size: 28rpx;
  color: #94A3B8;
  font-weight: 500;
}

.tab-item.active .tab-text {
  color: #1E293B;
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background: #6B7FD7;
  border-radius: 2rpx;
}

.content-section {
  padding: 24rpx 32rpx;
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 26rpx;
  color: #94A3B8;
  margin-top: 16rpx;
}

.empty-section {
  padding: 120rpx 0;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.news-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.news-source {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.source-tag {
  font-size: 22rpx;
  color: #6B7FD7;
  background: #F0F5FF;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.news-time {
  font-size: 22rpx;
  color: #94A3B8;
}

.impact-badge {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  font-weight: 500;
}

.impact-positive {
  color: #8B9DC3;
  background: #F0F9FF;
}

.impact-negative {
  color: #C4A882;
  background: #FEF7F0;
}

.impact-neutral {
  color: #64748B;
  background: #F8FAFC;
}

.news-content {
  margin-bottom: 20rpx;
}

.news-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1E293B;
  line-height: 1.5;
  margin-bottom: 12rpx;
  display: block;
}

.news-summary {
  font-size: 26rpx;
  color: #64748B;
  line-height: 1.6;
}

.news-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #F8FAFC;
}

.news-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.tag-item {
  font-size: 20rpx;
  color: #94A3B8;
  background: #F8FAFC;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.news-actions {
  display: flex;
  gap: 24rpx;
}

.action-item {
  padding: 8rpx;
}

.news-detail {
  width: 100%;
}

.detail-header {
  margin-bottom: 32rpx;
}

.detail-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1E293B;
  line-height: 1.5;
  margin-bottom: 16rpx;
  display: block;
}

.detail-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-source {
  font-size: 24rpx;
  color: #6B7FD7;
  background: #F0F5FF;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
}

.detail-time {
  font-size: 24rpx;
  color: #94A3B8;
}

.detail-content {
  margin-bottom: 32rpx;
}

.detail-text {
  font-size: 28rpx;
  color: #334155;
  line-height: 1.8;
  display: block;
  margin-bottom: 32rpx;
}

.related-funds {
  background: #F8FAFC;
  border-radius: 16rpx;
  padding: 24rpx;
}

.related-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 16rpx;
  display: block;
}

.funds-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.fund-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F1F5F9;
}

.fund-item:last-child {
  border-bottom: none;
}

.fund-name {
  font-size: 26rpx;
  color: #334155;
  flex: 1;
  margin-right: 12rpx;
}

.fund-code {
  font-size: 24rpx;
  color: #94A3B8;
  margin-right: 16rpx;
}

.fund-change {
  font-size: 26rpx;
  font-weight: 600;
}

.fund-change.positive {
  color: #8B9DC3;
}

.fund-change.negative {
  color: #C4A882;
}

.detail-actions {
  display: flex;
  gap: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #F1F5F9;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx;
  background: #F8FAFC;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #64748B;
}

.action-btn:active {
  background: #F1F5F9;
}
</style>
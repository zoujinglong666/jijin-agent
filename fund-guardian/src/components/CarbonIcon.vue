<template>
  <component
    :is="iconComponent"
    :class="['carbon-icon', props.className]"
    :style="iconStyle"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'

// 经过验证的 Carbon 图标映射（确保路径存在）
const iconModules: Record<string, () => Promise<any>> = {
  // 核心导航/操作（最常用）
  'view': () => import('@carbon/icons-vue/es/view/24.js'),
  'user': () => import('@carbon/icons-vue/es/user/24.js'),
  'setting': () => import('@carbon/icons-vue/es/settings/24.js'),
  'home': () => import('@carbon/icons-vue/es/home/24.js'),
  'add': () => import('@carbon/icons-vue/es/add/24.js'),
  'edit': () => import('@carbon/icons-vue/es/edit/24.js'),
  'delete': () => import('@carbon/icons-vue/es/trash-can/24.js'),
  'search': () => import('@carbon/icons-vue/es/search/24.js'),
  'back': () => import('@carbon/icons-vue/es/arrow--left/24.js'),
  'forward': () => import('@carbon/icons-vue/es/arrow--right/24.js'),
  'refresh': () => import('@carbon/icons-vue/es/renew/24.js'),
  'loading': () => import('@carbon/icons-vue/es/renew/24.js'),
  
  // 状态指示
  'success': () => import('@carbon/icons-vue/es/checkmark--filled/24.js'),
  'warning': () => import('@carbon/icons-vue/es/warning--filled/24.js'),
  'error': () => import('@carbon/icons-vue/es/error--filled/24.js'),
  'info': () => import('@carbon/icons-vue/es/information/24.js'),
  'help': () => import('@carbon/icons-vue/es/help/24.js'),
  'close': () => import('@carbon/icons-vue/es/close/24.js'),
  'menu': () => import('@carbon/icons-vue/es/menu/24.js'),
  'filter': () => import('@carbon/icons-vue/es/filter/24.js'),
  'sort': () => import('@carbon/icons-vue/es/arrows--vertical/24.js'),
  'download': () => import('@carbon/icons-vue/es/download/24.js'),
  'upload': () => import('@carbon/icons-vue/es/upload/24.js'),
  'share': () => import('@carbon/icons-vue/es/share/24.js'),
  
  // 收藏/评分
  'favorite': () => import('@carbon/icons-vue/es/favorite/24.js'),
  'star': () => import('@carbon/icons-vue/es/star/24.js'),
  'heart': () => import('@carbon/icons-vue/es/favorite--filled/24.js'),
  'like': () => import('@carbon/icons-vue/es/thumbs-up/24.js'),
  'dislike': () => import('@carbon/icons-vue/es/thumbs-down/24.js'),
  
  // 通信
  'comment': () => import('@carbon/icons-vue/es/chat/24.js'),
  'message': () => import('@carbon/icons-vue/es/chat/24.js'),
  'notification': () => import('@carbon/icons-vue/es/notification/24.js'),
  'bell': () => import('@carbon/icons-vue/es/notification/24.js'),
  'chat': () => import('@carbon/icons-vue/es/chat/24.js'),
  
  // 时间
  'calendar': () => import('@carbon/icons-vue/es/calendar/24.js'),
  'clock': () => import('@carbon/icons-vue/es/time/24.js'),
  'time': () => import('@carbon/icons-vue/es/time/24.js'),
  'alarm': () => import('@carbon/icons-vue/es/alarm/24.js'),
  'timer': () => import('@carbon/icons-vue/es/timer/24.js'),
  
  // 位置
  'location': () => import('@carbon/icons-vue/es/location/24.js'),
  'map': () => import('@carbon/icons-vue/es/map/24.js'),
  'navigation': () => import('@carbon/icons-vue/es/location/24.js'),
  'compass': () => import('@carbon/icons-vue/es/compass/24.js'),
  
  // 媒体
  'camera': () => import('@carbon/icons-vue/es/camera/24.js'),
  'image': () => import('@carbon/icons-vue/es/image/24.js'),
  'picture': () => import('@carbon/icons-vue/es/image/24.js'),
  'video': () => import('@carbon/icons-vue/es/video/24.js'),
  'music': () => import('@carbon/icons-vue/es/music/24.js'),
  'play': () => import('@carbon/icons-vue/es/play--filled/24.js'),
  'pause': () => import('@carbon/icons-vue/es/pause--filled/24.js'),
  'stop': () => import('@carbon/icons-vue/es/stop--filled/24.js'),
  'volume': () => import('@carbon/icons-vue/es/volume--up/24.js'),
  'mute': () => import('@carbon/icons-vue/es/volume--mute/24.js'),
  
  // 联系
  'phone': () => import('@carbon/icons-vue/es/phone/24.js'),
  'email': () => import('@carbon/icons-vue/es/email/24.js'),
  'link': () => import('@carbon/icons-vue/es/link/24.js'),
  'attachment': () => import('@carbon/icons-vue/es/attachment/24.js'),
  
  // 文件/文档
  'folder': () => import('@carbon/icons-vue/es/folder/24.js'),
  'file': () => import('@carbon/icons-vue/es/document/24.js'),
  'document': () => import('@carbon/icons-vue/es/document/24.js'),
  'article': () => import('@carbon/icons-vue/es/document/24.js'),
  'book': () => import('@carbon/icons-vue/es/book/24.js'),
  'read': () => import('@carbon/icons-vue/es/book/24.js'),
  'save': () => import('@carbon/icons-vue/es/save/24.js'),
  'send': () => import('@carbon/icons-vue/es/send/24.js'),
  'reply': () => import('@carbon/icons-vue/es/reply/24.js'),
  'undo': () => import('@carbon/icons-vue/es/undo/24.js'),
  'redo': () => import('@carbon/icons-vue/es/redo/24.js'),
  'copy': () => import('@carbon/icons-vue/es/copy/24.js'),
  'paste': () => import('@carbon/icons-vue/es/paste/24.js'),
  'cut': () => import('@carbon/icons-vue/es/cut/24.js'),
  
  // 其他常用
  'qr-code': () => import('@carbon/icons-vue/es/qr-code/24.js'),
  'barcode': () => import('@carbon/icons-vue/es/barcode/24.js'),
  'scan': () => import('@carbon/icons-vue/es/scan/24.js'),
  'printer': () => import('@carbon/icons-vue/es/printer/24.js'),
  'tag': () => import('@carbon/icons-vue/es/tag/24.js'),
  'price': () => import('@carbon/icons-vue/es/tag/24.js'),
  'gift': () => import('@carbon/icons-vue/es/gift/24.js'),
  'trophy': () => import('@carbon/icons-vue/es/trophy/24.js'),
  'badge': () => import('@carbon/icons-vue/es/badge/24.js'),
  'gem': () => import('@carbon/icons-vue/es/gem/24.js'),
  'fire': () => import('@carbon/icons-vue/es/fire/24.js'),
  'flash': () => import('@carbon/icons-vue/es/flash/24.js'),
  'lightning': () => import('@carbon/icons-vue/es/lightning/24.js'),
  'bolt': () => import('@carbon/icons-vue/es/lightning/24.js'),
  'power': () => import('@carbon/icons-vue/es/power/24.js'),
  'battery': () => import('@carbon/icons-vue/es/battery--full/24.js'),
  'charging': () => import('@carbon/icons-vue/es/charging-station/24.js'),
  'plug': () => import('@carbon/icons-vue/es/plug/24.js'),
  'wifi': () => import('@carbon/icons-vue/es/wifi/24.js'),
  'signal': () => import('@carbon/icons-vue/es/signal-strength/24.js'),
  'bluetooth': () => import('@carbon/icons-vue/es/bluetooth/24.js'),
  
  // 安全
  'safe': () => import('@carbon/icons-vue/es/security/24.js'),
  'shield': () => import('@carbon/icons-vue/es/security/24.js'),
  'security': () => import('@carbon/icons-vue/es/security/24.js'),
  'lock': () => import('@carbon/icons-vue/es/locked/24.js'),
  'unlock': () => import('@carbon/icons-vue/es/unlocked/24.js'),
  'key': () => import('@carbon/icons-vue/es/password/24.js'),
  'password': () => import('@carbon/icons-vue/es/password/24.js'),
  'login': () => import('@carbon/icons-vue/es/login/24.js'),
  'logout': () => import('@carbon/icons-vue/es/logout/24.js'),
  'register': () => import('@carbon/icons-vue/es/user/24.js'),
  'signup': () => import('@carbon/icons-vue/es/user/24.js'),
  
  // 社交
  'follow': () => import('@carbon/icons-vue/es/user--follow/24.js'),
  'unfollow': () => import('@carbon/icons-vue/es/user--follow/24.js'),
  'friend': () => import('@carbon/icons-vue/es/user--multiple/24.js'),
  'group': () => import('@carbon/icons-vue/es/user--multiple/24.js'),
  'team': () => import('@carbon/icons-vue/es/user--multiple/24.js'),
  'forum': () => import('@carbon/icons-vue/es/forum/24.js'),
  'education': () => import('@carbon/icons-vue/es/education/24.js'),
  'task': () => import('@carbon/icons-vue/es/task/24.js'),
  'todo': () => import('@carbon/icons-vue/es/task/24.js'),
  'schedule': () => import('@carbon/icons-vue/es/calendar/24.js'),
  'reminder': () => import('@carbon/icons-vue/es/reminder/24.js'),
  
  // 天气
  'cloudy': () => import('@carbon/icons-vue/es/cloudy/24.js'),
  'rainy': () => import('@carbon/icons-vue/es/rain/24.js'),
  'snowy': () => import('@carbon/icons-vue/es/snow/24.js'),
  'windy': () => import('@carbon/icons-vue/es/windy/24.js'),
  'storm': () => import('@carbon/icons-vue/es/thunderstorm/24.js'),
  'fog': () => import('@carbon/icons-vue/es/fog/24.js'),
  'moon': () => import('@carbon/icons-vue/es/moon/24.js'),
  'cloud': () => import('@carbon/icons-vue/es/cloud/24.js'),
  'rain': () => import('@carbon/icons-vue/es/rain/24.js'),
  'snow': () => import('@carbon/icons-vue/es/snow/24.js'),
  'wind': () => import('@carbon/icons-vue/es/windy/24.js'),
  'thunder': () => import('@carbon/icons-vue/es/thunderstorm/24.js'),
  
  // 环保/自然
  'recycle': () => import('@carbon/icons-vue/es/recycle/24.js'),
  'tree': () => import('@carbon/icons-vue/es/tree/24.js'),
  'sprout': () => import('@carbon/icons-vue/es/sprout/24.js'),
  'plant': () => import('@carbon/icons-vue/es/sprout/24.js'),
  'mountain': () => import('@carbon/icons-vue/es/mountain/24.js'),
  'nature': () => import('@carbon/icons-vue/es/mountain/24.js'),
  'earth': () => import('@carbon/icons-vue/es/earth/24.js'),
  'environment': () => import('@carbon/icons-vue/es/earth/24.js'),
  'ecology': () => import('@carbon/icons-vue/es/earth/24.js'),
  'sustainability': () => import('@carbon/icons-vue/es/sustainability/24.js'),
  'green': () => import('@carbon/icons-vue/es/sustainability/24.js'),
  'light': () => import('@carbon/icons-vue/es/light/24.js'),
  'bulb': () => import('@carbon/icons-vue/es/light/24.js'),
  'lamp': () => import('@carbon/icons-vue/es/light/24.js'),
  'temperature': () => import('@carbon/icons-vue/es/temperature/24.js'),
  'temperature-min': () => import('@carbon/icons-vue/es/temperature--min/24.js'),
  'cool': () => import('@carbon/icons-vue/es/temperature--min/24.js'),
  'temperature-max': () => import('@carbon/icons-vue/es/temperature--max/24.js'),
  'warm': () => import('@carbon/icons-vue/es/temperature--max/24.js'),
  'temperature-hot': () => import('@carbon/icons-vue/es/temperature--hot/24.js'),
  'hot': () => import('@carbon/icons-vue/es/temperature--hot/24.js'),
  'snowflake': () => import('@carbon/icons-vue/es/snowflake/24.js'),
  
  // 金融专用
  'wallet': () => import('@carbon/icons-vue/es/wallet/24.js'),
  'money': () => import('@carbon/icons-vue/es/currency/24.js'),
  'bank': () => import('@carbon/icons-vue/es/building/24.js'),
  'transfer': () => import('@carbon/icons-vue/es/arrow--right/24.js'),
  'receipt': () => import('@carbon/icons-vue/es/receipt/24.js'),
  'report': () => import('@carbon/icons-vue/es/report/24.js'),
  'analytics': () => import('@carbon/icons-vue/es/chart--line/24.js'),
  'dashboard': () => import('@carbon/icons-vue/es/dashboard/24.js'),
  'gauge': () => import('@carbon/icons-vue/es/meter/24.js'),
  'meter': () => import('@carbon/icons-vue/es/meter/24.js'),
  'performance': () => import('@carbon/icons-vue/es/chart--line/24.js'),
  'trend-up': () => import('@carbon/icons-vue/es/arrow--up-right/24.js'),
  'trend-down': () => import('@carbon/icons-vue/es/arrow--down-right/24.js'),
  'chart-line': () => import('@carbon/icons-vue/es/chart--line/24.js'),
  'chart-bar': () => import('@carbon/icons-vue/es/chart--bar/24.js'),
  'chart-area': () => import('@carbon/icons-vue/es/chart--area/24.js'),
  'chart-pie': () => import('@carbon/icons-vue/es/chart--pie/24.js'),
  'chart-scatter': () => import('@carbon/icons-vue/es/chart--bubble/24.js'),
  'data': () => import('@carbon/icons-vue/es/chart--line/24.js'),
  'database': () => import('@carbon/icons-vue/es/chart--line/24.js'),
  'server': () => import('@carbon/icons-vue/es/chart--line/24.js'),
  'cloud-upload': () => import('@carbon/icons-vue/es/cloud--upload/24.js'),
  'cloud-download': () => import('@carbon/icons-vue/es/cloud--download/24.js'),
  'backup': () => import('@carbon/icons-vue/es/cloud/24.js'),
  
  // 业务自定义映射（解决常见问题）
  'portfolio': () => import('@carbon/icons-vue/es/chart--pie/24.js'),
  'behavior': () => import('@carbon/icons-vue/es/chart--line/24.js'),
  'risk': () => import('@carbon/icons-vue/es/warning/24.js'),
  'ai': () => import('@carbon/icons-vue/es/AI/24.js'),
  'history': () => import('@carbon/icons-vue/es/time/24.js'),
  'fund': () => import('@carbon/icons-vue/es/wallet/24.js'),
}

interface Props {
  name: string
  size?: number | string
  color?: string
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  color: 'currentColor',
})

// 动态获取图标组件
const iconComponent = computed(() => {
  const loader = iconModules[props.name]
  if (!loader) {
    console.warn(`[CarbonIcon] Unknown icon name: "${props.name}"`)
    return null
  }
  return defineAsyncComponent(() => 
    loader().catch((err) => {
      console.warn(`[CarbonIcon] Failed to load icon "${props.name}":`, err)
      return null
    })
  )
})

const iconStyle = computed(() => ({
  width: typeof props.size === 'number' ? `${props.size}px` : props.size,
  height: typeof props.size === 'number' ? `${props.size}px` : props.size,
  fill: props.color,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  verticalAlign: 'middle',
}))
</script>

<style scoped>
.carbon-icon {
  flex-shrink: 0;
  line-height: 1;
}
.carbon-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
import { useState } from 'react'
import { Button, Badge } from '../ui'
import { useAccountsStore } from '@/store/accounts'
import {
  Search,
  Plus,
  Upload,
  Download,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react'

interface AccountToolbarProps {
  onAddAccount: () => void
  onImport: () => void
  onExport: () => void
}

export function AccountToolbar({
  onAddAccount,
  onImport,
  onExport
}: AccountToolbarProps): React.ReactNode {
  const {
    filter,
    setFilter,
    selectedIds,
    selectAll,
    deselectAll,
    removeAccounts,
    batchRefreshTokens,
    batchCheckStatus,
    getFilteredAccounts,
    getStats
  } = useAccountsStore()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  const stats = getStats()
  const filteredCount = getFilteredAccounts().length
  const selectedCount = selectedIds.size

  const handleSearch = (value: string): void => {
    setFilter({ ...filter, search: value || undefined })
  }

  const handleBatchRefresh = async (): Promise<void> => {
    if (selectedCount === 0) return
    setIsRefreshing(true)
    await batchRefreshTokens(Array.from(selectedIds))
    setIsRefreshing(false)
  }

  const handleBatchCheck = async (): Promise<void> => {
    if (selectedCount === 0) return
    setIsChecking(true)
    await batchCheckStatus(Array.from(selectedIds))
    setIsChecking(false)
  }

  const handleBatchDelete = (): void => {
    if (selectedCount === 0) return
    if (confirm(`确定要删除选中的 ${selectedCount} 个账号吗？`)) {
      removeAccounts(Array.from(selectedIds))
    }
  }

  const handleToggleSelectAll = (): void => {
    if (selectedCount === filteredCount && filteredCount > 0) {
      deselectAll()
    } else {
      selectAll()
    }
  }

  return (
    <div className="space-y-3">
      {/* 搜索和主要操作 */}
      <div className="flex items-center gap-3">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索账号..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            value={filter.search ?? ''}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* 主要操作按钮 */}
        <Button onClick={onAddAccount}>
          <Plus className="h-4 w-4 mr-1" />
          添加账号
        </Button>
        <Button variant="outline" onClick={onImport}>
          <Upload className="h-4 w-4 mr-1" />
          导入
        </Button>
        <Button variant="outline" onClick={onExport}>
          <Download className="h-4 w-4 mr-1" />
          导出
        </Button>
      </div>

      {/* 统计和选择操作 */}
      <div className="flex items-center justify-between">
        {/* 左侧：统计信息 */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            共 <span className="font-medium text-foreground">{stats.total}</span> 个账号
            {filteredCount !== stats.total && (
              <span>，已筛选 <span className="font-medium text-foreground">{filteredCount}</span> 个</span>
            )}
          </span>
          {stats.expiringSoonCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              {stats.expiringSoonCount} 个即将到期
            </Badge>
          )}
        </div>

        {/* 右侧：批量操作 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchCheck}
            disabled={isChecking || selectedCount === 0}
            title="检查账户信息：刷新用量、订阅详情、封禁状态等"
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            检查
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleBatchDelete}
            disabled={selectedCount === 0}
            title="删除选中的账号"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            删除
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchRefresh}
            disabled={isRefreshing || selectedCount === 0}
            title="刷新 Token：仅刷新访问令牌，用于保持登录状态"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            刷新
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          {/* 全选 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleSelectAll}
          >
            {selectedCount === filteredCount && filteredCount > 0 ? (
              <CheckSquare className="h-4 w-4 mr-1" />
            ) : (
              <Square className="h-4 w-4 mr-1" />
            )}
            {selectedCount > 0 ? `已选 ${selectedCount}` : '全选'}
          </Button>
        </div>
      </div>
    </div>
  )
}

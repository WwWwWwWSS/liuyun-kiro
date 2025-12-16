import { createPortal } from 'react-dom'
import { X, RefreshCw, User, CreditCard, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Account } from '@/types/account'
import { cn } from '@/lib/utils'
import { useAccountsStore } from '@/store/accounts'

interface AccountDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
  onRefresh?: () => void
  isRefreshing?: boolean
}

// 格式化日期
const formatDate = (date: unknown): string => {
  if (!date) return '-'
  try {
    if (typeof date === 'string') return date.split('T')[0]
    if (date instanceof Date) return date.toISOString().split('T')[0]
    return new Date(date as string | number).toISOString().split('T')[0]
  } catch {
    return String(date).split('T')[0]
  }
}

// 格式化完整日期时间
const formatDateTime = (date: unknown): string => {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? new Date(date) : date instanceof Date ? date : new Date(date as number)
    return d.toLocaleString('zh-CN', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return String(date)
  }
}

export function AccountDetailDialog({
  open,
  onOpenChange,
  account,
  onRefresh,
  isRefreshing
}: AccountDetailDialogProps) {
  if (!open || !account) return null

  const usage = account.usage
  const subscription = account.subscription
  const credentials = account.credentials
  const { maskEmail, maskNickname, privacyMode } = useAccountsStore()

  // 计算奖励总计
  const bonusTotal = usage.bonuses?.reduce((sum, b) => sum + b.limit, 0) ?? 0
  const bonusUsed = usage.bonuses?.reduce((sum, b) => sum + b.current, 0) ?? 0

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 animate-in zoom-in-95 duration-200 border">
        {/* 头部 */}
        <div className="sticky top-0 bg-background/95 backdrop-blur z-20 border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{maskEmail(account.email)}</span>
                <Badge className="bg-primary hover:bg-primary/90 text-white shadow-sm">
                  {subscription.title || subscription.type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                 <span className="px-1.5 py-0.5 bg-muted rounded-md font-medium">{account.idp}</span>
                 <span>·</span>
                 <span>添加于 {formatDate(account.createdAt)}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-8">
          {/* 配额总览 */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold text-base text-foreground">
                <CreditCard className="h-5 w-5 text-primary" />
                配额总览
              </h3>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="h-8 rounded-lg">
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefreshing && "animate-spin")} />
                  刷新数据
                </Button>
              )}
            </div>

            <div className="bg-muted/30 border rounded-xl p-5 space-y-4">
               {/* 总使用量 */}
               <div>
                 <div className="flex items-end justify-between mb-2">
                   <div className="space-y-1">
                     <div className="text-sm text-muted-foreground font-medium">总使用量</div>
                     <div className="flex items-baseline gap-1.5">
                       <span className="text-3xl font-bold tracking-tight text-foreground">{usage.current.toLocaleString()}</span>
                       <span className="text-lg text-muted-foreground font-medium">/ {usage.limit.toLocaleString()}</span>
                     </div>
                   </div>
                   <div className={cn(
                     "text-sm font-semibold px-2.5 py-1 rounded-lg",
                     usage.percentUsed > 0.9 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : 
                     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                   )}>
                     {(usage.percentUsed * 100).toFixed(1)}% 已使用
                   </div>
                 </div>
                 <Progress value={usage.percentUsed * 100} className="h-3 rounded-full" indicatorClassName={usage.percentUsed > 0.9 ? "bg-red-500" : "bg-primary"} />
               </div>

               <div className="grid grid-cols-3 gap-4 pt-2">
                 {/* 主配额 */}
                 <div className="p-4 bg-background rounded-xl border shadow-sm">
                   <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                     <div className="w-2 h-2 rounded-full bg-blue-500" />
                     主配额
                   </div>
                   <div className="text-xl font-bold tracking-tight">
                     {usage.baseCurrent ?? 0} <span className="text-sm text-muted-foreground font-normal">/ {usage.baseLimit ?? 0}</span>
                   </div>
                   <div className="text-xs text-muted-foreground mt-1 font-medium">
                     {formatDate(usage.nextResetDate)} 重置
                   </div>
                 </div>
                 
                 {/* 免费试用 */}
                 <div className={cn("p-4 bg-background rounded-xl border shadow-sm", (usage.freeTrialLimit ?? 0) === 0 && "opacity-60 grayscale")}>
                   <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
                     <div className="w-2 h-2 rounded-full bg-purple-500" />
                     免费试用
                     {(usage.freeTrialLimit ?? 0) > 0 && <Badge variant="secondary" className="text-[10px] px-1 h-4 ml-auto">ACTIVE</Badge>}
                   </div>
                   <div className="text-xl font-bold tracking-tight">
                     {usage.freeTrialCurrent ?? 0} <span className="text-sm text-muted-foreground font-normal">/ {usage.freeTrialLimit ?? 0}</span>
                   </div>
                   <div className="text-xs text-muted-foreground mt-1 font-medium">
                     {usage.freeTrialExpiry ? `${formatDate(usage.freeTrialExpiry)} 过期` : '无试用额度'}
                   </div>
                 </div>

                 {/* 奖励总计 */}
                 <div className={cn("p-4 bg-background rounded-xl border shadow-sm", bonusTotal === 0 && "opacity-60 grayscale")}>
                   <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                     <div className="w-2 h-2 rounded-full bg-cyan-500" />
                     奖励总计
                   </div>
                   <div className="text-xl font-bold tracking-tight">
                     {bonusUsed} <span className="text-sm text-muted-foreground font-normal">/ {bonusTotal}</span>
                   </div>
                   <div className="text-xs text-muted-foreground mt-1 font-medium">
                     {usage.bonuses?.length ?? 0} 个生效奖励
                   </div>
                 </div>
               </div>
            </div>
          </section>

          {/* 奖励详情 */}
          {usage.bonuses && usage.bonuses.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider pl-1">生效奖励明细</h3>
              <div className="grid grid-cols-1 gap-2">
                {usage.bonuses.map((bonus) => (
                  <div key={bonus.code} className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{bonus.name}</span>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-green-600 border-green-200 bg-green-50">
                          ACTIVE
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        Code: {bonus.code} · {formatDateTime(bonus.expiresAt)} 过期
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{bonus.current} <span className="text-muted-foreground font-normal">/ {bonus.limit}</span></div>
                      <div className="text-[10px] text-blue-600 font-medium">
                         已用 {((bonus.current / bonus.limit) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 基本信息 & Token 凭证 - 并排布局 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* 基本信息 */}
             <section className="space-y-3">
               <h3 className="flex items-center gap-2 font-bold text-base text-foreground">
                 <User className="h-5 w-5 text-primary" />
                 基本信息
               </h3>
               <div className="bg-muted/30 border rounded-xl p-4 space-y-4">
                 <div className="space-y-1">
                   <label className="text-xs font-medium text-muted-foreground">邮箱地址</label>
                   <div className="text-sm font-mono break-all select-all">{maskEmail(account.email)}</div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">账号别名</label>
                      <div className="text-sm font-medium">{maskNickname(account.nickname) || '-'}</div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">身份提供商</label>
                      <div className="text-sm font-medium">{account.idp}</div>
                   </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">用户 ID</label>
                    <div className="text-xs font-mono break-all bg-background p-2 rounded border select-all">{privacyMode ? '********' : (account.userId || '-')}</div>
                 </div>
               </div>
             </section>

             {/* Token 凭证 */}
             <section className="space-y-3">
               <h3 className="flex items-center gap-2 font-bold text-base text-foreground">
                 <Key className="h-5 w-5 text-primary" />
                 订阅详情
               </h3>
               <div className="bg-muted/30 border rounded-xl p-4 text-sm space-y-3">
                 <div className="flex justify-between items-center py-1 border-b border-border/50">
                   <span className="text-muted-foreground text-xs">Region</span>
                   <Badge variant="outline" className="font-mono">{credentials.region || 'us-east-1'}</Badge>
                 </div>
                 <div className="flex justify-between items-center py-1 border-b border-border/50">
                   <span className="text-muted-foreground text-xs">Token 到期</span>
                   <span className="font-medium text-xs">{credentials.expiresAt ? formatDateTime(credentials.expiresAt) : '-'}</span>
                 </div>
                 <div className="flex justify-between items-center py-1 border-b border-border/50">
                   <span className="text-muted-foreground text-xs">订阅类型</span>
                   <span className="font-mono text-xs" title={subscription.rawType}>{subscription.rawType || '-'}</span>
                 </div>
                 <div className="flex justify-between items-center py-1 border-b border-border/50">
                   <span className="text-muted-foreground text-xs">超额费率</span>
                   <span className="font-mono text-xs">
                     {usage.resourceDetail?.overageRate 
                       ? `$${usage.resourceDetail.overageRate}/${usage.resourceDetail.unit || 'INV'}`
                       : '-'}
                   </span>
                 </div>
                 <div className="flex justify-between items-center py-1 border-b border-border/50">
                   <span className="text-muted-foreground text-xs">资源类型</span>
                   <span className="font-mono text-xs">{usage.resourceDetail?.resourceType || '-'}</span>
                 </div>
                 <div className="flex justify-between items-center py-1">
                   <span className="text-muted-foreground text-xs">可升级</span>
                   <span className={cn("text-xs font-bold", subscription.upgradeCapability === 'UPGRADE_CAPABLE' ? "text-green-600" : "text-muted-foreground")}>
                      {subscription.upgradeCapability === 'UPGRADE_CAPABLE' ? 'YES' : 'NO'}
                   </span>
                 </div>
               </div>
             </section>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

import { useState, useEffect } from 'react'
import { X, Loader2, RefreshCw, Download, CheckCircle } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '../ui'
import { useAccountsStore } from '@/store'
import type { Account, SubscriptionType } from '@/types/account'

interface EditAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
}

export function EditAccountDialog({
  open,
  onOpenChange,
  account
}: EditAccountDialogProps) {
  const { updateAccount } = useAccountsStore()

  // OIDC 凭证（核心）
  const [refreshToken, setRefreshToken] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [region, setRegion] = useState('us-east-1')

  // 可编辑字段
  const [nickname, setNickname] = useState('')

  // 自动获取的信息（只读显示）
  const [accountInfo, setAccountInfo] = useState<{
    email: string
    userId: string
    accessToken: string
    subscriptionType: string
    subscriptionTitle: string
    usage: { 
      current: number
      limit: number
      baseLimit?: number
      baseCurrent?: number
      freeTrialLimit?: number
      freeTrialCurrent?: number
      freeTrialExpiry?: string
      bonuses?: { code: string; name: string; current: number; limit: number; expiresAt?: string }[]
      nextResetDate?: string
    }
    daysRemaining?: number
    expiresAt?: number
  } | null>(null)

  // 状态
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 当账号变化时更新表单
  useEffect(() => {
    if (account) {
      setRefreshToken(account.credentials.refreshToken || '')
      setClientId(account.credentials.clientId || '')
      setClientSecret(account.credentials.clientSecret || '')
      setRegion(account.credentials.region || 'us-east-1')
      setNickname(account.nickname || '')
      
      // 设置当前账号信息
      setAccountInfo({
        email: account.email,
        userId: account.userId || '',
        accessToken: account.credentials.accessToken,
        subscriptionType: account.subscription.type,
        subscriptionTitle: account.subscription.title || account.subscription.type,
        usage: {
          current: account.usage?.current || 0,
          limit: account.usage?.limit || 0
        },
        daysRemaining: account.subscription.daysRemaining,
        expiresAt: account.subscription.expiresAt
      })
      setError(null)
    }
  }, [account])

  // 从本地配置导入
  const handleImportFromLocal = async () => {
    try {
      const result = await window.api.loadKiroCredentials()
      if (result.success && result.data) {
        setRefreshToken(result.data.refreshToken)
        setClientId(result.data.clientId)
        setClientSecret(result.data.clientSecret)
        setRegion(result.data.region)
        setError(null)
      } else {
        setError(result.error || '导入失败')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败')
    }
  }

  // 验证并刷新信息
  const handleVerifyAndRefresh = async () => {
    if (!refreshToken || !clientId || !clientSecret) {
      setError('请填写 Refresh Token、Client ID 和 Client Secret')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const result = await window.api.verifyAccountCredentials({
        refreshToken,
        clientId,
        clientSecret,
        region
      })

      if (result.success && result.data) {
        setAccountInfo({
          email: result.data.email,
          userId: result.data.userId,
          accessToken: result.data.accessToken,
          subscriptionType: result.data.subscriptionType,
          subscriptionTitle: result.data.subscriptionTitle,
          usage: result.data.usage,
          daysRemaining: result.data.daysRemaining,
          expiresAt: result.data.expiresAt
        })
        // 更新 refreshToken（可能返回新的）
        if (result.data.refreshToken) {
          setRefreshToken(result.data.refreshToken)
        }
      } else {
        setError(result.error || '验证失败')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '验证失败')
    } finally {
      setIsVerifying(false)
    }
  }

  // 保存
  const handleSave = () => {
    if (!account || !accountInfo) return

    const now = Date.now()

    updateAccount(account.id, {
      email: accountInfo.email,
      userId: accountInfo.userId,
      nickname: nickname || undefined,
      credentials: {
        accessToken: accountInfo.accessToken,
        csrfToken: '',
        refreshToken,
        clientId,
        clientSecret,
        region,
        expiresAt: now + 3600 * 1000
      },
      subscription: {
        type: accountInfo.subscriptionType as SubscriptionType,
        title: accountInfo.subscriptionTitle,
        daysRemaining: accountInfo.daysRemaining,
        expiresAt: accountInfo.expiresAt
      },
      usage: {
        current: accountInfo.usage.current,
        limit: accountInfo.usage.limit,
        percentUsed: accountInfo.usage.limit > 0 
          ? accountInfo.usage.current / accountInfo.usage.limit 
          : 0,
        lastUpdated: now,
        baseLimit: accountInfo.usage.baseLimit,
        baseCurrent: accountInfo.usage.baseCurrent,
        freeTrialLimit: accountInfo.usage.freeTrialLimit,
        freeTrialCurrent: accountInfo.usage.freeTrialCurrent,
        freeTrialExpiry: accountInfo.usage.freeTrialExpiry,
        bonuses: accountInfo.usage.bonuses,
        nextResetDate: accountInfo.usage.nextResetDate
      },
      status: 'active'
    })

    onOpenChange(false)
  }

  if (!open || !account) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      <Card className="relative w-full max-w-lg max-h-[90vh] overflow-auto z-10 animate-in zoom-in-95 duration-200">
        {/* 头部 */}
        <CardHeader className="pb-4 border-b sticky top-0 bg-background z-20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">编辑账号</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">修改账号配置或更新凭证</p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* 当前账号信息 */}
          {accountInfo && (
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-3">
              <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                <span className="text-sm font-semibold text-foreground/80">当前账号状态</span>
                <div className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  已验证
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">邮箱</span>
                  <span className="font-medium font-mono text-xs truncate block" title={accountInfo.email}>{accountInfo.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">订阅计划</span>
                  <span className="font-medium">{accountInfo.subscriptionTitle}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">使用额度</span>
                  <span className="font-medium">
                    {accountInfo.usage.current.toLocaleString()} / {accountInfo.usage.limit.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">剩余天数</span>
                  <span className="font-medium">{accountInfo.daysRemaining ?? '-'} 天</span>
                </div>
              </div>
            </div>
          )}

          {/* 别名 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">账号别名</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="给这个账号起个好记的名字"
              className="w-full h-10 px-3 py-2 text-sm rounded-xl border border-input bg-background/50 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>

          {/* OIDC 凭证 */}
          <div className="space-y-5 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">OIDC 凭证配置</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={handleImportFromLocal}
              >
                <Download className="h-3 w-3 mr-1.5" />
                从本地导入
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Refresh Token <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="aorAAAAA..."
                  className="w-full min-h-[80px] px-3 py-2.5 text-sm rounded-xl border border-input bg-background/50 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Client ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Client ID"
                    className="w-full h-10 px-3 py-2 text-sm rounded-xl border border-input bg-background/50 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Client Secret <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Client Secret"
                    className="w-full h-10 px-3 py-2 text-sm rounded-xl border border-input bg-background/50 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">AWS Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-xl border border-input bg-background/50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <option value="us-east-1">us-east-1 (N. Virginia)</option>
                  <option value="us-west-2">us-west-2 (Oregon)</option>
                  <option value="eu-west-1">eu-west-1 (Ireland)</option>
                </select>
              </div>

              <Button 
                type="button" 
                variant="secondary"
                className="w-full h-10 rounded-xl font-medium"
                onClick={handleVerifyAndRefresh}
                disabled={isVerifying || !refreshToken || !clientId || !clientSecret}
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                验证并刷新凭证信息
              </Button>
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
              {error}
            </div>
          )}
        </CardContent>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur p-4 border-t flex justify-end gap-3 z-20">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-10 px-6">
            取消
          </Button>
          <Button onClick={handleSave} disabled={!accountInfo} className="rounded-xl h-10 px-6">
            保存更改
          </Button>
        </div>
      </Card>
    </div>
  )
}

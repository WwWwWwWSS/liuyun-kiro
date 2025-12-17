import { useState } from 'react'
import { Ticket, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useAccountsStore } from '@/store/accounts'
import type { SubscriptionType } from '@/types/account'

interface RedeemResult {
  success: boolean
  message: string
  data?: {
    email?: string
    userId?: string
    accessToken?: string
    refreshToken?: string
    clientId?: string
    clientSecret?: string
    region?: string
    expiresIn?: number
    authMethod?: string
    provider?: string
  }
}

// 硬编码服务器地址
const VOUCHER_SERVER_URL = 'http://129.204.108.139:8899'

export function RedeemPage() {
  const [voucherCode, setVoucherCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<RedeemResult | null>(null)
  
  const { addAccount, accounts } = useAccountsStore()

  // 检查账户是否已存在
  const isAccountExists = (email: string, userId: string): boolean => {
    return Array.from(accounts.values()).some(
      acc => acc.email === email || acc.userId === userId
    )
  }

  const handleRedeem = async () => {
    if (!voucherCode.trim()) {
      setResult({ success: false, message: '请输入卡券码' })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      // 使用硬编码的服务器地址
      const url = VOUCHER_SERVER_URL

      console.log('Redeeming voucher:', voucherCode.trim(), 'from:', url)

      // 通过主进程 IPC 调用服务端 API（绕过 CORS 限制）
      const response = await window.api.redeemVoucher(url, voucherCode.trim())
      
      console.log('IPC Response:', response)

      if (!response.success) {
        throw new Error(response.error || '请求失败')
      }

      const data = response.data
      console.log('Response data:', data)

      // 服务端返回格式: { success: true, message: "兑换成功", data: tokenData }
      // 注意: response.data 是服务端的响应体，response.data.data 是 token 数据
      const serverData = data as { success?: boolean; message?: string; data?: unknown; token?: string; error?: string }
      
      if (serverData?.success) {
        // 解析 token 数据 - 服务端返回的 token 数据在 data.data 字段中
        let tokenData: {
          email?: string
          userId?: string
          accessToken?: string
          refreshToken?: string
          clientId?: string
          clientSecret?: string
          region?: string
          expiresIn?: number
          authMethod?: string
          provider?: string
        } = {}
        
        // 获取 token 数据（可能在 data 或 token 字段中）
        const rawTokenData = serverData.data || serverData.token
        
        try {
          // Token 可能是 JSON 字符串或已经是对象
          if (typeof rawTokenData === 'string') {
            tokenData = JSON.parse(rawTokenData)
          } else if (rawTokenData && typeof rawTokenData === 'object') {
            tokenData = rawTokenData as typeof tokenData
          }
        } catch {
          // 如果解析失败，token 可能是简单的凭证字符串
          if (typeof rawTokenData === 'string') {
            tokenData = { accessToken: rawTokenData }
          }
        }
        
        console.log('Parsed token data:', tokenData)
        
        // 检查是否有 refreshToken，如果有则使用 OIDC 验证方式导入
        if (tokenData.refreshToken) {
          setResult({ success: true, message: '正在验证凭证...' })
          
          // 使用 OIDC 验证方式导入账号（与 AddAccountDialog 中的 handleOidcBatchAdd 相同）
          const verifyResult = await window.api.verifyAccountCredentials({
            refreshToken: tokenData.refreshToken,
            clientId: tokenData.clientId || '',
            clientSecret: tokenData.clientSecret || '',
            region: tokenData.region || 'us-east-1',
            authMethod: tokenData.authMethod || 'IdC',
            provider: tokenData.provider || 'BuilderId'
          })
          
          console.log('Verify result:', verifyResult)
          
          if (verifyResult.success && verifyResult.data) {
            const { email, userId } = verifyResult.data
            
            // 检查账户是否已存在
            if (isAccountExists(email, userId)) {
              setResult({
                success: false,
                message: `账号 ${email} 已存在，无需重复添加`
              })
              return
            }
            
            // 根据 provider 确定 idp 和 authMethod
            const provider = (tokenData.provider || 'BuilderId') as 'BuilderId' | 'Github' | 'Google'
            const idpMap: Record<string, 'BuilderId' | 'Github' | 'Google'> = {
              'BuilderId': 'BuilderId',
              'Github': 'Github',
              'Google': 'Google'
            }
            const idp = idpMap[provider] || 'BuilderId'
            const authMethod = tokenData.authMethod || (provider === 'BuilderId' ? 'IdC' : 'social')
            
            const now = Date.now()
            addAccount({
              email,
              userId,
              nickname: email ? email.split('@')[0] : undefined,
              idp,
              credentials: {
                accessToken: verifyResult.data.accessToken,
                csrfToken: '',
                refreshToken: verifyResult.data.refreshToken,
                clientId: tokenData.clientId || '',
                clientSecret: tokenData.clientSecret || '',
                region: tokenData.region || 'us-east-1',
                expiresAt: verifyResult.data.expiresIn ? now + verifyResult.data.expiresIn * 1000 : now + 3600 * 1000,
                authMethod: authMethod as 'IdC' | 'social',
                provider
              },
              subscription: {
                type: verifyResult.data.subscriptionType as SubscriptionType,
                title: verifyResult.data.subscriptionTitle,
                daysRemaining: verifyResult.data.daysRemaining,
                expiresAt: verifyResult.data.expiresAt,
                managementTarget: verifyResult.data.subscription?.managementTarget,
                upgradeCapability: verifyResult.data.subscription?.upgradeCapability,
                overageCapability: verifyResult.data.subscription?.overageCapability
              },
              usage: {
                current: verifyResult.data.usage.current,
                limit: verifyResult.data.usage.limit,
                percentUsed: verifyResult.data.usage.limit > 0
                  ? verifyResult.data.usage.current / verifyResult.data.usage.limit
                  : 0,
                lastUpdated: now,
                baseLimit: verifyResult.data.usage.baseLimit,
                baseCurrent: verifyResult.data.usage.baseCurrent,
                freeTrialLimit: verifyResult.data.usage.freeTrialLimit,
                freeTrialCurrent: verifyResult.data.usage.freeTrialCurrent,
                freeTrialExpiry: verifyResult.data.usage.freeTrialExpiry,
                bonuses: verifyResult.data.usage.bonuses,
                nextResetDate: verifyResult.data.usage.nextResetDate,
                resourceDetail: verifyResult.data.usage.resourceDetail
              },
              groupId: undefined,
              tags: [],
              status: 'active',
              lastUsedAt: now
            })
            
            setResult({
              success: true,
              message: `兑换成功！账号 ${email} 已添加到账号管理`,
              data: tokenData,
            })
            
            // 清空输入
            setVoucherCode('')
          } else {
            // 验证失败
            const errorMsg = typeof verifyResult.error === 'object'
              ? ((verifyResult.error as { message?: string })?.message || '验证失败')
              : (verifyResult.error || '验证失败')
            setResult({
              success: false,
              message: `凭证验证失败: ${errorMsg}`
            })
          }
        } else {
          // 没有 refreshToken，使用旧的方式直接添加（兼容旧版本）
          const now = Date.now()
          const accountData = {
            email: tokenData.email || `account_${Date.now()}@voucher.local`,
            userId: tokenData.userId,
            nickname: tokenData.email ? tokenData.email.split('@')[0] : undefined,
            idp: (tokenData.provider || 'BuilderId') as 'BuilderId' | 'Google' | 'Github',
            credentials: {
              accessToken: tokenData.accessToken || '',
              csrfToken: '',
              refreshToken: tokenData.refreshToken || '',
              clientId: tokenData.clientId || '',
              clientSecret: tokenData.clientSecret || '',
              region: tokenData.region || 'us-east-1',
              expiresAt: tokenData.expiresIn ? now + tokenData.expiresIn * 1000 : now + 3600 * 1000,
              authMethod: tokenData.authMethod as 'IdC' | 'social' | undefined,
              provider: tokenData.provider as 'BuilderId' | 'Github' | 'Google' | undefined,
            },
            subscription: {
              type: 'Free' as const,
            },
            usage: {
              current: 0,
              limit: 25,
              percentUsed: 0,
              lastUpdated: now,
            },
            groupId: undefined,
            tags: [] as string[],
            status: 'unknown' as const,
            lastUsedAt: now,
          }

          addAccount(accountData)

          setResult({
            success: true,
            message: `兑换成功！账号 ${accountData.email} 已添加到账号管理（未验证）`,
            data: tokenData,
          })

          // 清空输入
          setVoucherCode('')
        }
      } else if (data) {
        setResult({
          success: false,
          message: data.message || data.error || '兑换失败',
        })
      } else {
        setResult({
          success: false,
          message: '服务器返回空响应',
        })
      }
    } catch (error) {
      console.error('Redeem error:', error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : '网络错误，请检查服务器地址是否正确',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleRedeem()
    }
  }

  return (
    <div className="h-full p-6">
      <div className="max-w-2xl mx-auto">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-primary/10">
            <Ticket className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">卡券取号</h1>
            <p className="text-muted-foreground">输入卡券码兑换账号</p>
          </div>
        </div>

        {/* 卡券输入 */}
        <div className="mb-6 p-6 rounded-lg border bg-card">
          <label className="block text-sm font-medium mb-2">卡券码</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="flex-1 px-4 py-3 rounded-lg border bg-background text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <button
              onClick={handleRedeem}
              disabled={isLoading || !voucherCode.trim()}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  兑换中...
                </>
              ) : (
                <>
                  <Ticket className="h-5 w-5" />
                  兑换
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            输入从卡券服务器获取的卡券码，格式为 XXXX-XXXX-XXXX-XXXX
          </p>
        </div>

        {/* 结果显示 */}
        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    result.success
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {result.success ? '兑换成功' : '兑换失败'}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    result.success
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-8 p-4 rounded-lg bg-muted/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">使用说明</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>输入从管理员处获取的卡券码</li>
                <li>点击"兑换"按钮，账号将自动添加到账号管理</li>
                <li>每个卡券码只能使用一次</li>
                <li>兑换成功后，账号会自动验证并显示订阅信息</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
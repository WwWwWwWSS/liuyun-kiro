import { useState } from 'react'
import { Ticket, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useAccountsStore } from '@/store/accounts'

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

export function RedeemPage() {
  const [voucherCode, setVoucherCode] = useState('')
  const [serverUrl, setServerUrl] = useState('http://localhost:8899')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<RedeemResult | null>(null)
  
  const { addAccount } = useAccountsStore()

  const handleRedeem = async () => {
    if (!voucherCode.trim()) {
      setResult({ success: false, message: '请输入卡券码' })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      // 调用服务端 API 兑换卡券
      const response = await fetch(`${serverUrl}/api/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: voucherCode.trim() }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        // 兑换成功，添加账号到账号管理
        const tokenData = data.data
        const now = Date.now()

        // 根据返回的 token 数据创建账号
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
          message: `兑换成功！账号 ${accountData.email} 已添加到账号管理`,
          data: tokenData,
        })

        // 清空输入
        setVoucherCode('')
      } else {
        setResult({
          success: false,
          message: data.message || '兑换失败',
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

        {/* 服务器地址配置 */}
        <div className="mb-6 p-4 rounded-lg border bg-card">
          <label className="block text-sm font-medium mb-2">服务器地址</label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:8899"
            className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            请输入卡券服务器的地址，默认为 http://localhost:8899
          </p>
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
                <li>确保卡券服务器已启动并运行</li>
                <li>输入正确的服务器地址（默认为本地 8899 端口）</li>
                <li>输入从管理员处获取的卡券码</li>
                <li>点击"兑换"按钮，账号将自动添加到账号管理</li>
                <li>每个卡券码只能使用一次</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
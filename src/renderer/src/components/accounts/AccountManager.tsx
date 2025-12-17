import { useState } from 'react'
import { useAccountsStore } from '@/store/accounts'
import { AccountToolbar } from './AccountToolbar'
import { AccountGrid } from './AccountGrid'
import { AddAccountDialog } from './AddAccountDialog'
import { EditAccountDialog } from './EditAccountDialog'
import { ExportDialog } from './ExportDialog'
import { ImportMethodDialog, type ImportMethod } from './ImportMethodDialog'
import { Button } from '../ui'
import type { Account, SubscriptionType } from '@/types/account'
import { ArrowLeft, Loader2, Users } from 'lucide-react'

interface AccountManagerProps {
  onBack?: () => void
}

export function AccountManager({ onBack }: AccountManagerProps): React.ReactNode {
  const {
    isLoading,
    accounts,
    importFromExportData,
    importAccounts,
    addAccount,
    selectedIds
  } = useAccountsStore()

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showImportMethodDialog, setShowImportMethodDialog] = useState(false)

  // 获取要导出的账号列表
  const getExportAccounts = () => {
    const accountList = Array.from(accounts.values())
    if (selectedIds.size > 0) {
      return accountList.filter(acc => selectedIds.has(acc.id))
    }
    return accountList
  }

  // 导出
  const handleExport = (): void => {
    setShowExportDialog(true)
  }

  // 解析 CSV 行（处理引号和逗号）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  // 检查账户是否已存在
  const isAccountExists = (email: string, userId?: string): boolean => {
    return Array.from(accounts.values()).some(
      acc => acc.email === email || (userId && acc.userId === userId)
    )
  }

  // 点击导入按钮，显示选择弹窗
  const handleImportClick = (): void => {
    setShowImportMethodDialog(true)
  }

  // 处理导入方式选择
  const handleImportMethodSelect = async (method: ImportMethod): Promise<void> => {
    setShowImportMethodDialog(false)
    
    if (method === 'default') {
      await handleDefaultImport()
    } else if (method === 'oidc') {
      await handleOidcImport()
    }
  }

  // 默认导入（原有逻辑）
  const handleDefaultImport = async (): Promise<void> => {
    const fileData = await window.api.importFromFile()

    if (!fileData) return

    const { content, format } = fileData

    try {
      if (format === 'json') {
        // JSON 格式：完整导出数据
        const data = JSON.parse(content)
        if (data.version && data.accounts) {
          const result = importFromExportData(data)
          const skippedInfo = result.errors.find(e => e.id === 'skipped')
          const skippedMsg = skippedInfo ? `，${skippedInfo.error}` : ''
          alert(`导入完成：成功 ${result.success} 个${skippedMsg}`)
        } else {
          alert('无效的 JSON 文件格式')
        }
      } else if (format === 'csv') {
        // CSV 格式：邮箱,昵称,登录方式,RefreshToken,ClientId,ClientSecret,Region
        const lines = content.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          alert('CSV 文件为空或只有标题行')
          return
        }

        // 跳过标题行，解析数据行
        const items = lines.slice(1).map(line => {
          const cols = parseCSVLine(line)
          return {
            email: cols[0] || '',
            nickname: cols[1] || undefined,
            idp: cols[2] || 'Google',
            refreshToken: cols[3] || '',
            clientId: cols[4] || '',
            clientSecret: cols[5] || '',
            region: cols[6] || 'us-east-1'
          }
        }).filter(item => item.email && item.refreshToken)

        if (items.length === 0) {
          alert('未找到有效的账号数据（需要邮箱和 RefreshToken）')
          return
        }

        const result = importAccounts(items)
        alert(`导入完成：成功 ${result.success} 个，失败 ${result.failed} 个`)
      } else if (format === 'txt') {
        // TXT 格式：每行一个账号，格式为 邮箱,RefreshToken 或 邮箱|RefreshToken
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'))
        
        const items = lines.map(line => {
          // 支持逗号或竖线分隔
          const parts = line.includes('|') ? line.split('|') : line.split(',')
          return {
            email: parts[0]?.trim() || '',
            refreshToken: parts[1]?.trim() || '',
            nickname: parts[2]?.trim() || undefined,
            idp: parts[3]?.trim() || 'Google'
          }
        }).filter(item => item.email && item.refreshToken)

        if (items.length === 0) {
          alert('未找到有效的账号数据（格式：邮箱,RefreshToken）')
          return
        }

        const result = importAccounts(items)
        alert(`导入完成：成功 ${result.success} 个，失败 ${result.failed} 个`)
      } else {
        alert(`不支持的文件格式：${format}`)
      }
    } catch (e) {
      console.error('Import error:', e)
      alert('解析导入文件失败')
    }
  }

  // OIDC 凭证导入（仅支持 JSON 格式）
  const handleOidcImport = async (): Promise<void> => {
    // 使用特定的文件选择器，仅允许 JSON 文件
    const fileData = await window.api.importFromFile(['json'])

    if (!fileData) return

    const { content, format } = fileData

    if (format !== 'json') {
      alert('OIDC 凭证导入仅支持 JSON 格式文件')
      return
    }

    try {
      // 解析 JSON 数据
      const parsed = JSON.parse(content)
      const credentials: Array<{
        refreshToken: string
        clientId?: string
        clientSecret?: string
        region?: string
        authMethod?: 'IdC' | 'social'
        provider?: string
      }> = Array.isArray(parsed) ? parsed : [parsed]

      if (credentials.length === 0) {
        alert('请输入至少一个凭证')
        return
      }

      const importResult = { total: credentials.length, success: 0, failed: 0, errors: [] as string[] }

      // 单个凭证导入函数
      const importSingleCredential = async (cred: typeof credentials[0], index: number): Promise<void> => {
        try {
          if (!cred.refreshToken) {
            importResult.failed++
            importResult.errors.push(`#${index + 1}: 缺少 refreshToken`)
            return
          }

          // 根据 provider 自动确定 authMethod
          const credProvider = cred.provider || 'BuilderId'
          const credAuthMethod = cred.authMethod || (credProvider === 'BuilderId' ? 'IdC' : 'social')

          const result = await window.api.verifyAccountCredentials({
            refreshToken: cred.refreshToken,
            clientId: cred.clientId || '',
            clientSecret: cred.clientSecret || '',
            region: cred.region || 'us-east-1',
            authMethod: credAuthMethod,
            provider: credProvider
          })

          if (result.success && result.data) {
            const { email, userId } = result.data
            
            if (isAccountExists(email, userId)) {
              // 已存在的不记入失败
              importResult.errors.push(`#${index + 1}: ${email} 已存在`)
              return
            }
            
            // 根据 provider 确定 idp 和 authMethod
            const provider = (cred.provider || 'BuilderId') as 'BuilderId' | 'Github' | 'Google'
            const idpMap: Record<string, 'BuilderId' | 'Github' | 'Google'> = {
              'BuilderId': 'BuilderId',
              'Github': 'Github',
              'Google': 'Google'
            }
            const idp = idpMap[provider] || 'BuilderId'
            // GitHub 和 Google 使用 social 认证方式
            const authMethod = cred.authMethod || (provider === 'BuilderId' ? 'IdC' : 'social')
            
            const now = Date.now()
            addAccount({
              email,
              userId,
              nickname: email ? email.split('@')[0] : undefined,
              idp,
              credentials: {
                accessToken: result.data.accessToken,
                csrfToken: '',
                refreshToken: result.data.refreshToken,
                clientId: cred.clientId || '',
                clientSecret: cred.clientSecret || '',
                region: cred.region || 'us-east-1',
                expiresAt: result.data.expiresIn ? now + result.data.expiresIn * 1000 : now + 3600 * 1000,
                authMethod,
                provider
              },
              subscription: {
                type: result.data.subscriptionType as SubscriptionType,
                title: result.data.subscriptionTitle,
                daysRemaining: result.data.daysRemaining,
                expiresAt: result.data.expiresAt,
                managementTarget: result.data.subscription?.managementTarget,
                upgradeCapability: result.data.subscription?.upgradeCapability,
                overageCapability: result.data.subscription?.overageCapability
              },
              usage: {
                current: result.data.usage.current,
                limit: result.data.usage.limit,
                percentUsed: result.data.usage.limit > 0
                  ? result.data.usage.current / result.data.usage.limit
                  : 0,
                lastUpdated: now,
                baseLimit: result.data.usage.baseLimit,
                baseCurrent: result.data.usage.baseCurrent,
                freeTrialLimit: result.data.usage.freeTrialLimit,
                freeTrialCurrent: result.data.usage.freeTrialCurrent,
                freeTrialExpiry: result.data.usage.freeTrialExpiry,
                bonuses: result.data.usage.bonuses,
                nextResetDate: result.data.usage.nextResetDate,
                resourceDetail: result.data.usage.resourceDetail
              },
              groupId: undefined,
              tags: [],
              status: 'active',
              lastUsedAt: now
            })
            
            importResult.success++
          } else {
            importResult.failed++
            const err = result.error as { message?: string } | string | undefined
            const errorMsg = typeof err === 'object' ? (err?.message || '验证失败') : (err || '验证失败')
            importResult.errors.push(`#${index + 1}: ${errorMsg}`)
          }
        } catch (e) {
          importResult.failed++
          importResult.errors.push(`#${index + 1}: ${e instanceof Error ? e.message : '导入失败'}`)
        }
      }

      // 并发控制：使用配置的并发数，避免 API 限流
      const { batchImportConcurrency } = useAccountsStore.getState()
      const BATCH_SIZE = batchImportConcurrency
      for (let i = 0; i < credentials.length; i += BATCH_SIZE) {
        const batch = credentials.slice(i, i + BATCH_SIZE)
        await Promise.allSettled(
          batch.map((cred, batchIndex) => importSingleCredential(cred, i + batchIndex))
        )
        // 批次间添加短暂延迟，进一步避免限流
        if (i + BATCH_SIZE < credentials.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // 显示导入结果
      if (importResult.failed === 0 && importResult.errors.length === 0) {
        alert(`OIDC 凭证导入完成：成功 ${importResult.success} 个`)
      } else if (importResult.success > 0) {
        const errorMsg = importResult.errors.length > 0
          ? `\n\n详情：\n${importResult.errors.slice(0, 10).join('\n')}${importResult.errors.length > 10 ? `\n...还有 ${importResult.errors.length - 10} 条` : ''}`
          : ''
        alert(`OIDC 凭证导入完成：成功 ${importResult.success} 个，失败 ${importResult.failed} 个${errorMsg}`)
      } else {
        const errorMsg = importResult.errors.length > 0
          ? `\n\n详情：\n${importResult.errors.slice(0, 10).join('\n')}${importResult.errors.length > 10 ? `\n...还有 ${importResult.errors.length - 10} 条` : ''}`
          : ''
        alert(`OIDC 凭证导入失败：全部 ${importResult.failed} 个失败${errorMsg}`)
      }
    } catch (e) {
      console.error('OIDC Import error:', e)
      alert('解析 OIDC 凭证文件失败，请确保文件格式正确')
    }
  }

  // 编辑账号
  const handleEditAccount = (account: Account): void => {
    setEditingAccount(account)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载账号数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold text-primary">账户管理</h1>
          </div>
        </div>
        
        {/* 工具栏 */}
        <AccountToolbar
          onAddAccount={() => setShowAddDialog(true)}
          onImport={handleImportClick}
          onExport={handleExport}
        />
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-4">
        {/* 账号网格 */}
        <div className="flex-1 overflow-hidden">
          <AccountGrid
            onAddAccount={() => setShowAddDialog(true)}
            onEditAccount={handleEditAccount}
          />
        </div>
      </div>

      {/* 添加账号对话框 */}
      <AddAccountDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />

      {/* 编辑账号对话框 */}
      <EditAccountDialog
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        account={editingAccount}
      />

      {/* 导出对话框 */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        accounts={getExportAccounts()}
        selectedCount={selectedIds.size}
      />

      {/* 导入方式选择对话框 */}
      <ImportMethodDialog
        isOpen={showImportMethodDialog}
        onClose={() => setShowImportMethodDialog(false)}
        onSelect={handleImportMethodSelect}
      />
    </div>
  )
}

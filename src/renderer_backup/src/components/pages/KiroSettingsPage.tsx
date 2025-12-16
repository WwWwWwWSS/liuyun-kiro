import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Toggle, Select } from '../ui'
import { SteeringEditor, McpServerEditor } from '../kiro'
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  RefreshCw,
  ExternalLink,
  FolderOpen,
  Save,
  AlertCircle,
  Edit,
  Sparkles,
  Shield,
  Zap,
  Settings2,
  Terminal
} from 'lucide-react'

interface KiroSettings {
  agentAutonomy: string
  modelSelection: string
  enableDebugLogs: boolean
  enableTabAutocomplete: boolean
  enableCodebaseIndexing: boolean
  usageSummary: boolean
  codeReferences: boolean
  configureMCP: string
  trustedCommands: string[]
  commandDenylist: string[]
  ignoreFiles: string[]
  mcpApprovedEnvVars: string[]
  // 通知设置
  notificationsActionRequired: boolean
  notificationsFailure: boolean
  notificationsSuccess: boolean
  notificationsBilling: boolean
}

interface McpServer {
  command: string
  args?: string[]
  env?: Record<string, string>
}

interface McpConfig {
  mcpServers: Record<string, McpServer>
}

// 默认禁止的危险命令
const defaultDenyCommands = [
  'rm -rf *',
  'rm -rf /',
  'rm -rf ~',
  'del /f /s /q *',
  'format',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',
  'chmod -R 777 /',
  'chown -R',
  '> /dev/sda',
  'wget * | sh',
  'curl * | sh',
  'shutdown',
  'reboot',
  'init 0',
  'init 6'
]

// Kiro 默认设置（与 Kiro IDE 内置默认值一致）
const defaultSettings: KiroSettings = {
  agentAutonomy: 'Autopilot',
  modelSelection: 'auto',
  enableDebugLogs: false,
  enableTabAutocomplete: false,
  enableCodebaseIndexing: false,
  usageSummary: true,
  codeReferences: false,
  configureMCP: 'Enabled',
  trustedCommands: [],
  commandDenylist: [],
  ignoreFiles: [],
  mcpApprovedEnvVars: [],
  notificationsActionRequired: true,
  notificationsFailure: false,
  notificationsSuccess: false,
  notificationsBilling: true
}

const modelOptions = [
  { value: 'auto', label: 'Auto', description: '自动选择最佳模型' },
  { value: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5', description: '最新 Sonnet 模型' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4', description: '混合推理与编码' },
  { value: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', description: '最新 Haiku 模型' },
  { value: 'claude-opus-4.5', label: 'Claude Opus 4.5', description: '最强大模型' }
]

const autonomyOptions = [
  { value: 'Autopilot', label: 'Autopilot (自动执行)', description: 'Agent 自动执行任务' },
  { value: 'Supervised', label: 'Supervised (需确认)', description: '每个步骤需要手动确认' }
]

const mcpOptions = [
  { value: 'Enabled', label: '启用', description: '允许 MCP 服务器连接' },
  { value: 'Disabled', label: '禁用', description: '禁用所有 MCP 功能' }
]

export function KiroSettingsPage() {
  const [settings, setSettings] = useState<KiroSettings>(defaultSettings)
  const [mcpConfig, setMcpConfig] = useState<McpConfig>({ mcpServers: {} })
  const [steeringFiles, setSteeringFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [expandedSections, setExpandedSections] = useState({
    agent: true,
    mcp: true,
    steering: true,
    commands: false
  })

  const [newTrustedCommand, setNewTrustedCommand] = useState('')
  const [newDenyCommand, setNewDenyCommand] = useState('')
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [editingMcp, setEditingMcp] = useState<{ name?: string; server?: McpServer } | null>(null)

  useEffect(() => {
    loadKiroSettings()
  }, [])

  const loadKiroSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.getKiroSettings()
      if (result.settings) {
        // 过滤掉 undefined 值，避免覆盖默认值
        const filteredSettings = Object.fromEntries(
          Object.entries(result.settings).filter(([, v]) => v !== undefined)
        ) as Partial<KiroSettings>
        setSettings({ ...defaultSettings, ...filteredSettings })
      }
      if (result.mcpConfig) {
        setMcpConfig(result.mcpConfig as McpConfig)
      }
      if (result.steeringFiles) {
        setSteeringFiles(result.steeringFiles)
      }
    } catch (err) {
      setError('加载 Kiro 设置失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setError(null)
    try {
      await window.api.saveKiroSettings(settings as unknown as Record<string, unknown>)
    } catch (err) {
      setError('保存设置失败')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const openKiroSettingsFile = async () => {
    // 打开 Kiro settings.json 文件
    try {
      await window.api.openKiroSettingsFile()
    } catch (err) {
      console.error(err)
    }
  }

  const openMcpConfig = async (type: 'user' | 'workspace') => {
    try {
      await window.api.openKiroMcpConfig(type)
    } catch (err) {
      console.error(err)
    }
  }

  const openSteeringFolder = async () => {
    try {
      await window.api.openKiroSteeringFolder()
    } catch (err) {
      console.error(err)
    }
  }

  const openSteeringFile = (filename: string) => {
    setEditingFile(filename)
  }

  const openSteeringFileExternal = async (filename: string) => {
    try {
      await window.api.openKiroSteeringFile(filename)
    } catch (err) {
      console.error(err)
    }
  }

  const createDefaultRules = async () => {
    try {
      const result = await window.api.createKiroDefaultRules()
      if (result.success) {
        // 重新加载设置以获取新创建的文件
        await loadKiroSettings()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const deleteSteeringFile = async (filename: string) => {
    if (!confirm(`确定要删除 "${filename}" 吗？此操作无法撤销。`)) {
      return
    }
    try {
      const result = await window.api.deleteKiroSteeringFile(filename)
      if (result.success) {
        await loadKiroSettings()
      } else {
        setError(result.error || '删除文件失败')
      }
    } catch (err) {
      console.error(err)
      setError('删除文件失败')
    }
  }

  const deleteMcpServer = async (name: string) => {
    if (!confirm(`确定要删除 MCP 服务器 "${name}" 吗？`)) {
      return
    }
    try {
      const result = await window.api.deleteMcpServer(name)
      if (result.success) {
        await loadKiroSettings()
      } else {
        setError(result.error || '删除服务器失败')
      }
    } catch (err) {
      console.error(err)
      setError('删除服务器失败')
    }
  }

  const addTrustedCommand = () => {
    if (newTrustedCommand.trim()) {
      setSettings(prev => ({
        ...prev,
        trustedCommands: [...prev.trustedCommands, newTrustedCommand.trim()]
      }))
      setNewTrustedCommand('')
    }
  }

  const removeTrustedCommand = (index: number) => {
    setSettings(prev => ({
      ...prev,
      trustedCommands: prev.trustedCommands.filter((_, i) => i !== index)
    }))
  }

  const addDenyCommand = () => {
    if (newDenyCommand.trim()) {
      setSettings(prev => ({
        ...prev,
        commandDenylist: [...prev.commandDenylist, newDenyCommand.trim()]
      }))
      setNewDenyCommand('')
    }
  }

  const addDefaultDenyCommands = () => {
    setSettings(prev => {
      // 过滤掉已存在的命令
      const newCommands = defaultDenyCommands.filter(
        cmd => !prev.commandDenylist.includes(cmd)
      )
      return {
        ...prev,
        commandDenylist: [...prev.commandDenylist, ...newCommands]
      }
    })
  }

  const removeDenyCommand = (index: number) => {
    setSettings(prev => ({
      ...prev,
      commandDenylist: prev.commandDenylist.filter((_, i) => i !== index)
    }))
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* 页面头部 */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-6 border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary shadow-lg shadow-primary/25">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Kiro 设置</h1>
              <p className="text-muted-foreground">管理 Kiro IDE 的配置、MCP 服务器和用户规则</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadKiroSettings} className="bg-background/50 backdrop-blur-sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
            <Button variant="outline" size="sm" onClick={openKiroSettingsFile} className="bg-background/50 backdrop-blur-sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              打开设置文件
            </Button>
            <Button size="sm" onClick={saveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Agent 设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg" onClick={() => toggleSection('agent')}>
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings2 className="h-4 w-4 text-primary" />
              </div>
              <span>Agent 设置</span>
            </div>
            {expandedSections.agent ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.agent && (
          <CardContent className="space-y-4">
            {/* Agent Autonomy */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Agent 自主模式</p>
                <p className="text-sm text-muted-foreground">控制 Agent 是否自动执行或需要确认</p>
              </div>
              <Select
                value={settings.agentAutonomy}
                options={autonomyOptions}
                onChange={(value) => setSettings(prev => ({ ...prev, agentAutonomy: value }))}
                className="w-[200px]"
              />
            </div>

            {/* Model Selection */}
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-medium">模型选择</p>
                <p className="text-sm text-muted-foreground">选择 Agent 使用的 AI 模型</p>
              </div>
              <Select
                value={settings.modelSelection}
                options={modelOptions}
                onChange={(value) => setSettings(prev => ({ ...prev, modelSelection: value }))}
                className="w-[200px]"
              />
            </div>

            {/* Toggle Options */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">Tab 自动补全</p>
                  <p className="text-sm text-muted-foreground">输入时提供代码建议</p>
                </div>
                <Toggle
                  checked={settings.enableTabAutocomplete}
                  onChange={(checked) => setSettings(prev => ({ ...prev, enableTabAutocomplete: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">使用统计</p>
                  <p className="text-sm text-muted-foreground">显示 Agent 执行时间和用量</p>
                </div>
                <Toggle
                  checked={settings.usageSummary}
                  onChange={(checked) => setSettings(prev => ({ ...prev, usageSummary: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">代码引用追踪</p>
                  <p className="text-sm text-muted-foreground">允许生成带公开代码引用的代码</p>
                </div>
                <Toggle
                  checked={settings.codeReferences}
                  onChange={(checked) => setSettings(prev => ({ ...prev, codeReferences: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">代码库索引</p>
                  <p className="text-sm text-muted-foreground">启用代码库索引以提升搜索性能</p>
                </div>
                <Toggle
                  checked={settings.enableCodebaseIndexing}
                  onChange={(checked) => setSettings(prev => ({ ...prev, enableCodebaseIndexing: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">调试日志</p>
                  <p className="text-sm text-muted-foreground">在输出面板显示调试日志</p>
                </div>
                <Toggle
                  checked={settings.enableDebugLogs}
                  onChange={(checked) => setSettings(prev => ({ ...prev, enableDebugLogs: checked }))}
                />
              </div>
            </div>

            {/* 通知设置 */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="font-medium text-sm">通知设置</p>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">需要操作通知</p>
                  <p className="text-sm text-muted-foreground">Agent 需要确认时发送通知</p>
                </div>
                <Toggle
                  checked={settings.notificationsActionRequired}
                  onChange={(checked) => setSettings(prev => ({ ...prev, notificationsActionRequired: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">失败通知</p>
                  <p className="text-sm text-muted-foreground">Agent 执行失败时发送通知</p>
                </div>
                <Toggle
                  checked={settings.notificationsFailure}
                  onChange={(checked) => setSettings(prev => ({ ...prev, notificationsFailure: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">成功通知</p>
                  <p className="text-sm text-muted-foreground">Agent 执行成功时发送通知</p>
                </div>
                <Toggle
                  checked={settings.notificationsSuccess}
                  onChange={(checked) => setSettings(prev => ({ ...prev, notificationsSuccess: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">账单通知</p>
                  <p className="text-sm text-muted-foreground">账单相关通知</p>
                </div>
                <Toggle
                  checked={settings.notificationsBilling}
                  onChange={(checked) => setSettings(prev => ({ ...prev, notificationsBilling: checked }))}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* MCP 设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg" onClick={() => toggleSection('mcp')}>
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span>MCP 服务器</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                {Object.keys(mcpConfig.mcpServers).length} 个
              </span>
            </div>
            {expandedSections.mcp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.mcp && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">启用 MCP</p>
                <p className="text-sm text-muted-foreground">允许连接外部工具和数据源</p>
              </div>
              <Select
                value={settings.configureMCP}
                options={mcpOptions}
                onChange={(value) => setSettings(prev => ({ ...prev, configureMCP: value }))}
              />
            </div>

            <div className="border-t pt-4">
              <p className="font-medium mb-2">已配置的 MCP 服务器</p>
              {Object.keys(mcpConfig.mcpServers).length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无配置的 MCP 服务器</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(mcpConfig.mcpServers).map(([name, server]) => (
                    <div key={name} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{server.command}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="p-1 hover:bg-background rounded transition-colors"
                          onClick={() => setEditingMcp({ name, server })}
                          title="编辑"
                        >
                          <Edit className="h-4 w-4 text-primary" />
                        </button>
                        <button
                          className="p-1 hover:bg-background rounded transition-colors"
                          onClick={() => deleteMcpServer(name)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingMcp({})}>
                <Plus className="h-4 w-4 mr-2" />
                添加 MCP 服务器
              </Button>
              <Button variant="outline" size="sm" onClick={() => openMcpConfig('user')}>
                <FolderOpen className="h-4 w-4 mr-2" />
                用户 MCP 配置
              </Button>
              <Button variant="outline" size="sm" onClick={() => openMcpConfig('workspace')}>
                <FolderOpen className="h-4 w-4 mr-2" />
                工作区 MCP 配置
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Steering 用户规则 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg" onClick={() => toggleSection('steering')}>
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <span>用户规则 (Steering)</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                {steeringFiles.length} 个文件
              </span>
            </div>
            {expandedSections.steering ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.steering && (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Steering 文件用于定义 AI 助手的行为规则和上下文
            </p>

            {steeringFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无 Steering 文件</p>
            ) : (
              <div className="space-y-2">
                {steeringFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted rounded-md"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono flex-1">{file}</span>
                    <button
                      className="p-1 hover:bg-background rounded transition-colors"
                      onClick={() => openSteeringFile(file)}
                      title="内部编辑"
                    >
                      <Edit className="h-4 w-4 text-primary" />
                    </button>
                    <button
                      className="p-1 hover:bg-background rounded transition-colors"
                      onClick={() => openSteeringFileExternal(file)}
                      title="外部打开"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      className="p-1 hover:bg-background rounded transition-colors"
                      onClick={() => deleteSteeringFile(file)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={createDefaultRules}>
                <Plus className="h-4 w-4 mr-2" />
                创建规则文件
              </Button>
              <Button variant="outline" size="sm" onClick={openSteeringFolder}>
                <FolderOpen className="h-4 w-4 mr-2" />
                打开 Steering 目录
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 命令设置 */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg" onClick={() => toggleSection('commands')}>
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Terminal className="h-4 w-4 text-primary" />
              </div>
              <span>命令配置</span>
            </div>
            {expandedSections.commands ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.commands && (
          <CardContent className="space-y-6">
            {/* Trusted Commands */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <p className="font-medium">信任的命令</p>
              </div>
              <p className="text-sm text-muted-foreground mb-3">这些命令将自动执行，无需确认</p>
              <div className="space-y-2">
                {settings.trustedCommands.map((cmd, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <code className="flex-1 px-2 py-1 bg-muted rounded text-sm">{cmd}</code>
                    <Button variant="ghost" size="sm" onClick={() => removeTrustedCommand(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTrustedCommand}
                    onChange={(e) => setNewTrustedCommand(e.target.value)}
                    placeholder="如: npm *"
                    className="flex-1 px-3 py-1.5 rounded-md border bg-background text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addTrustedCommand()}
                  />
                  <Button variant="outline" size="sm" onClick={addTrustedCommand}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Command Denylist */}
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="font-medium text-destructive">禁止的命令</p>
              </div>
              <p className="text-sm text-muted-foreground mb-3">这些命令总是需要手动确认</p>
              <div className="space-y-2">
                {settings.commandDenylist.map((cmd, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <code className="flex-1 px-2 py-1 bg-muted rounded text-sm">{cmd}</code>
                    <Button variant="ghost" size="sm" onClick={() => removeDenyCommand(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDenyCommand}
                    onChange={(e) => setNewDenyCommand(e.target.value)}
                    placeholder="如: rm -rf *"
                    className="flex-1 px-3 py-1.5 rounded-md border bg-background text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addDenyCommand()}
                  />
                  <Button variant="outline" size="sm" onClick={addDenyCommand}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addDefaultDenyCommands}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加默认禁止命令
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Steering 文件编辑器 */}
      {editingFile && (
        <SteeringEditor
          filename={editingFile}
          onClose={() => setEditingFile(null)}
          onSaved={loadKiroSettings}
        />
      )}

      {/* MCP 服务器编辑器 */}
      {editingMcp && (
        <McpServerEditor
          serverName={editingMcp.name}
          server={editingMcp.server}
          onClose={() => setEditingMcp(null)}
          onSaved={loadKiroSettings}
        />
      )}
    </div>
  )
}

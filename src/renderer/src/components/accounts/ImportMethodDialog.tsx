import { Button, Card, CardContent, CardHeader, CardTitle } from '../ui'
import { X, FileJson, FileText } from 'lucide-react'

export type ImportMethod = 'default' | 'oidc'

interface ImportMethodDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (method: ImportMethod) => void
}

export function ImportMethodDialog({ isOpen, onClose, onSelect }: ImportMethodDialogProps): React.ReactNode {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <Card className="relative w-full max-w-md z-10">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">选择导入方式</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">请选择要使用的导入方式</p>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          {/* 默认导入 */}
          <button
            className="group w-full p-4 flex items-start gap-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-200 hover:shadow-md hover:border-primary/30"
            onClick={() => onSelect('default')}
          >
            <div className="w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-semibold text-foreground">默认导入</span>
              <span className="text-xs text-muted-foreground mt-1">
                支持 JSON、CSV、TXT 格式文件导入账号数据
              </span>
            </div>
          </button>

          {/* OIDC 凭证导入 */}
          <button
            className="group w-full p-4 flex items-start gap-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-200 hover:shadow-md hover:border-primary/30"
            onClick={() => onSelect('oidc')}
          >
            <div className="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
              <FileJson className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-semibold text-foreground">OIDC 凭证导入</span>
              <span className="text-xs text-muted-foreground mt-1">
                仅支持 JSON 格式，按 OIDC 凭证批量方式解析导入
              </span>
            </div>
          </button>

          {/* 取消按钮 */}
          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={onClose}>
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

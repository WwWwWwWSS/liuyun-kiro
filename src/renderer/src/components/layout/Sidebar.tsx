import { Home, Users, Settings, ChevronLeft, ChevronRight, Fingerprint, Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import kiroLogo from '@/assets/Kiro Logo.png'

export type PageType = 'home' | 'accounts' | 'redeem' | 'machineId' | 'settings'

interface SidebarProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const menuItems: { id: PageType; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: '主页', icon: Home },
  { id: 'accounts', label: '账户管理', icon: Users },
  { id: 'redeem', label: '取号', icon: Ticket },
  { id: 'machineId', label: '机器码', icon: Fingerprint },
  { id: 'settings', label: '设置', icon: Settings },
]

export function Sidebar({ currentPage, onPageChange, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <div 
      className={cn(
        "h-screen bg-card border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-52"
      )}
    >
      {/* Logo */}
      <div className="h-12 flex items-center justify-center border-b px-2 gap-2 overflow-hidden">
        <img 
          src={kiroLogo} 
          alt="Kiro" 
          className={cn("shrink-0 transition-all", collapsed ? "h-6 w-auto" : "h-8 w-auto")} 
        />
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "w-full flex items-center rounded-lg text-sm font-medium transition-all overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">收起</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

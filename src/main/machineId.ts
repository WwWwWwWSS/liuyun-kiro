/**
 * 机器码管理模块 - 主进程
 * 支持 Windows、macOS、Linux 三大平台
 */

import { exec, execSync } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { app, dialog } from 'electron'

const execAsync = promisify(exec)

export type OSType = 'windows' | 'macos' | 'linux' | 'unknown'

export interface MachineIdResult {
  success: boolean
  machineId?: string
  error?: string
  requiresAdmin?: boolean
}

/**
 * 获取操作系统类型
 */
export function getOSType(): OSType {
  switch (process.platform) {
    case 'win32':
      return 'windows'
    case 'darwin':
      return 'macos'
    case 'linux':
      return 'linux'
    default:
      return 'unknown'
  }
}

/**
 * 生成随机机器码 (GUID 格式)
 */
export function generateRandomMachineId(): string {
  // 生成符合 Windows MachineGuid 格式的 UUID
  return crypto.randomUUID().toLowerCase()
}

/**
 * 获取当前机器码
 */
export async function getCurrentMachineId(): Promise<MachineIdResult> {
  const osType = getOSType()

  try {
    switch (osType) {
      case 'windows':
        return await getWindowsMachineId()
      case 'macos':
        return await getMacOSMachineId()
      case 'linux':
        return await getLinuxMachineId()
      default:
        return { success: false, error: '不支持的操作系统' }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取机器码失败'
    }
  }
}

/**
 * 设置新机器码
 */
export async function setMachineId(newMachineId: string): Promise<MachineIdResult> {
  const osType = getOSType()

  // 验证机器码格式
  if (!isValidMachineId(newMachineId)) {
    return { success: false, error: '无效的机器码格式' }
  }

  try {
    switch (osType) {
      case 'windows':
        return await setWindowsMachineId(newMachineId)
      case 'macos':
        return await setMacOSMachineId(newMachineId)
      case 'linux':
        return await setLinuxMachineId(newMachineId)
      default:
        return { success: false, error: '不支持的操作系统' }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '设置机器码失败'
    // 检查是否需要管理员权限
    if (
      errorMsg.includes('Access is denied') ||
      errorMsg.includes('permission denied') ||
      errorMsg.includes('Operation not permitted') ||
      errorMsg.includes('EPERM') ||
      errorMsg.includes('EACCES')
    ) {
      return { success: false, error: '需要管理员权限', requiresAdmin: true }
    }
    return { success: false, error: errorMsg }
  }
}

/**
 * 检查是否拥有管理员权限
 */
export async function checkAdminPrivilege(): Promise<boolean> {
  const osType = getOSType()

  try {
    switch (osType) {
      case 'windows':
        // 尝试写入系统目录来检测权限
        try {
          execSync('net session', { stdio: 'ignore' })
          return true
        } catch {
          return false
        }
      case 'macos':
      case 'linux':
        // 检查是否为 root
        return process.getuid?.() === 0
      default:
        return false
    }
  } catch {
    return false
  }
}

/**
 * 请求以管理员权限重新启动应用
 */
export async function requestAdminRestart(): Promise<boolean> {
  const osType = getOSType()
  const appPath = app.getPath('exe')

  console.log('[MachineId] Requesting admin restart, appPath:', appPath)

  try {
    switch (osType) {
      case 'windows': {
        // Windows: 使用 cmd 启动 PowerShell 执行 Start-Process
        // 这种方式更可靠，避免参数解析问题
        const command = `powershell -NoProfile -Command "Start-Process -FilePath \\"${appPath.replace(/\\/g, '\\\\')}\\" -Verb RunAs"`
        console.log('[MachineId] Running command:', command)
        
        exec(command, { windowsHide: true }, (error) => {
          if (error) {
            console.error('[MachineId] Admin restart failed:', error)
          }
        })
        
        // 延迟退出，确保命令有时间执行
        setTimeout(() => {
          console.log('[MachineId] Quitting app...')
          app.quit()
        }, 1000)
        return true
      }

      case 'macos': {
        // macOS: 使用 osascript 请求管理员权限
        const escapedPath = appPath.replace(/'/g, "\\'")
        const script = `do shell script "open -n '${escapedPath}'" with administrator privileges`
        exec(`osascript -e '${script}'`, (error) => {
          if (error) {
            console.error('[MachineId] Admin restart failed:', error)
          }
        })
        setTimeout(() => app.quit(), 1000)
        return true
      }

      case 'linux': {
        // Linux: 尝试使用 pkexec 或 gksudo
        const sudoCommands = ['pkexec', 'gksudo', 'kdesudo']
        for (const cmd of sudoCommands) {
          try {
            execSync(`which ${cmd}`, { stdio: 'ignore' })
            exec(`${cmd} "${appPath}"`, (error) => {
              if (error) {
                console.error('[MachineId] Admin restart failed:', error)
              }
            })
            setTimeout(() => app.quit(), 1000)
            return true
          } catch {
            continue
          }
        }
        return false
      }

      default:
        return false
    }
  } catch (error) {
    console.error('请求管理员权限失败:', error)
    return false
  }
}

/**
 * 验证机器码格式
 */
function isValidMachineId(machineId: string): boolean {
  // UUID 格式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  // 纯32位十六进制 (Linux machine-id 格式)
  const hexRegex = /^[0-9a-f]{32}$/i
  return uuidRegex.test(machineId) || hexRegex.test(machineId)
}

// ==================== Windows ====================

async function getWindowsMachineId(): Promise<MachineIdResult> {
  try {
    const { stdout } = await execAsync(
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid'
    )
    const match = stdout.match(/MachineGuid\s+REG_SZ\s+([a-f0-9-]+)/i)
    if (match && match[1]) {
      return { success: true, machineId: match[1].toLowerCase() }
    }
    return { success: false, error: '无法解析机器码' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取Windows机器码失败'
    }
  }
}

async function setWindowsMachineId(newMachineId: string): Promise<MachineIdResult> {
  try {
    // 需要管理员权限
    await execAsync(
      `reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid /t REG_SZ /d "${newMachineId}" /f`
    )
    return { success: true, machineId: newMachineId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : ''
    if (errorMsg.includes('Access is denied') || errorMsg.includes('拒绝访问')) {
      return { success: false, error: '需要管理员权限', requiresAdmin: true }
    }
    return { success: false, error: errorMsg || '设置Windows机器码失败' }
  }
}

// ==================== macOS ====================

async function getMacOSMachineId(): Promise<MachineIdResult> {
  try {
    // 方法1: 使用 ioreg 获取硬件UUID
    const { stdout } = await execAsync(
      "ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $3 }'"
    )
    const machineId = stdout.trim().replace(/"/g, '').toLowerCase()
    if (machineId && isValidMachineId(machineId)) {
      return { success: true, machineId }
    }

    // 方法2: 读取 /var/db/SystemConfiguration/com.apple.SystemConfiguration.GenerationID.plist
    // 这个文件可以被修改
    return { success: false, error: '无法获取macOS机器码' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取macOS机器码失败'
    }
  }
}

async function setMacOSMachineId(newMachineId: string): Promise<MachineIdResult> {
  // macOS 的硬件 UUID 无法直接修改
  // 但我们可以修改应用层面的标识符
  // 这里使用一个变通方案：创建一个覆盖文件
  const overridePath = path.join(app.getPath('userData'), 'machine-id-override')

  try {
    fs.writeFileSync(overridePath, newMachineId, 'utf-8')
    return { success: true, machineId: newMachineId }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '设置macOS机器码失败'
    }
  }
}

// ==================== Linux ====================

async function getLinuxMachineId(): Promise<MachineIdResult> {
  const paths = ['/etc/machine-id', '/var/lib/dbus/machine-id']

  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8').trim()
        if (content) {
          // Linux machine-id 是32位十六进制，转换为UUID格式
          const formattedId = formatAsUUID(content)
          return { success: true, machineId: formattedId }
        }
      }
    } catch {
      continue
    }
  }

  return { success: false, error: '无法获取Linux机器码' }
}

async function setLinuxMachineId(newMachineId: string): Promise<MachineIdResult> {
  // 转换为32位十六进制格式（移除连字符）
  const rawId = newMachineId.replace(/-/g, '').toLowerCase()

  const paths = ['/etc/machine-id', '/var/lib/dbus/machine-id']

  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, rawId + '\n', 'utf-8')
        return { success: true, machineId: newMachineId }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : ''
      if (errorMsg.includes('EACCES') || errorMsg.includes('EPERM')) {
        return { success: false, error: '需要管理员权限', requiresAdmin: true }
      }
    }
  }

  return { success: false, error: '设置Linux机器码失败' }
}

/**
 * 将32位十六进制转换为UUID格式
 */
function formatAsUUID(hex: string): string {
  const clean = hex.replace(/-/g, '').toLowerCase()
  if (clean.length !== 32) return clean
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`
}

/**
 * 备份机器码到文件
 */
export async function backupMachineIdToFile(
  machineId: string,
  filePath: string
): Promise<boolean> {
  try {
    const backupData = {
      machineId,
      backupTime: Date.now(),
      osType: getOSType(),
      appVersion: app.getVersion()
    }
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('备份机器码失败:', error)
    return false
  }
}

/**
 * 从文件恢复机器码
 */
export async function restoreMachineIdFromFile(filePath: string): Promise<MachineIdResult> {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '备份文件不存在' }
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    if (!data.machineId || !isValidMachineId(data.machineId)) {
      return { success: false, error: '备份文件格式无效' }
    }
    return { success: true, machineId: data.machineId }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '读取备份文件失败'
    }
  }
}

/**
 * 显示需要管理员权限的对话框
 */
export async function showAdminRequiredDialog(): Promise<boolean> {
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: '需要管理员权限',
    message: '修改机器码需要管理员权限',
    detail: '是否以管理员权限重新启动应用程序？',
    buttons: ['取消', '以管理员身份重启'],
    defaultId: 1,
    cancelId: 0
  })
  return result.response === 1
}

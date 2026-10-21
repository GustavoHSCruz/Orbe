import { app, BrowserWindow, dialog, protocol, session } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerHandlers } from './ipc/register'
import type { DownloadManager } from './application/download-manager'
import { logEvent } from './infrastructure/logger'
import {
  migrateBrandEnvironment,
  resolveUserData,
} from './infrastructure/brand-compatibility'

app.setName('Orbe')
migrateBrandEnvironment()
if (!app.commandLine.hasSwitch('user-data-dir'))
  app.setPath(
    'userData',
    resolveUserData(app.getPath('appData'), app.getPath('userData')),
  )

const currentDirectory = fileURLToPath(new URL('.', import.meta.url))
let mainWindow: BrowserWindow | null = null
let manager: DownloadManager | null = null
let closingAfterConfirmation = false

app.on('child-process-gone', (_event, details) => {
  logEvent('error', 'electron.child-process-gone', {
    ...details,
    electron: process.versions.electron,
  })
})
app.on('render-process-gone', (_event, contents, details) => {
  logEvent('error', 'electron.render-process-gone', {
    ...details,
    webContentsId: contents.id,
  })
})
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'orbe-media',
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
    },
  },
])

function createWindow(): void {
  mainWindow = new BrowserWindow({
    icon: join(
      app.isPackaged ? process.resourcesPath : app.getAppPath(),
      app.isPackaged
        ? process.platform === 'win32'
          ? 'icon.ico'
          : 'icon.png'
        : process.platform === 'win32'
          ? 'resources/icon.ico'
          : 'resources/icon.png',
    ),
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(currentDirectory, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const window = mainWindow
  window.once('ready-to-show', () => {
    window.show()
    logEvent('info', 'startup.window-visible')
  })
  window.webContents.on('preload-error', (_event, _path, error) => {
    logEvent('error', 'startup.preload-failed', { message: error.message })
  })
  window.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, _url, isMainFrame) => {
      if (!isMainFrame) return
      logEvent('error', 'startup.renderer-load-failed', {
        errorCode,
        errorDescription,
      })
    },
  )
  mainWindow.on('close', (event) => {
    if (closingAfterConfirmation || !manager?.hasActive() || !mainWindow) return
    event.preventDefault()
    const selection = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      title: 'Downloads em andamento',
      message: 'Existem downloads em andamento.',
      buttons: ['Voltar', 'Continuar em background', 'Cancelar e sair'],
      defaultId: 0,
      cancelId: 0,
    })
    if (selection === 1) mainWindow.minimize()
    if (selection === 2) {
      manager
        .list()
        .filter(
          (item) => item.status === 'downloading' || item.status === 'queued',
        )
        .forEach((item) => manager?.cancel(item.id))
      closingAfterConfirmation = true
      mainWindow.close()
    }
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  logEvent('info', 'startup.renderer-loading', {
    mode: rendererUrl ? 'development' : 'production',
  })
  const loading = rendererUrl
    ? window.loadURL(rendererUrl)
    : window.loadFile(join(currentDirectory, '../renderer/index.html'))
  void loading.then(
    () => logEvent('info', 'startup.renderer-loaded'),
    (error: unknown) => {
      logEvent('error', 'startup.renderer-load-rejected', {
        message: error instanceof Error ? error.message : String(error),
      })
    },
  )
}

void app
  .whenReady()
  .then(() => {
    logEvent('info', 'startup.ready', {
      electron: process.versions.electron,
      node: process.versions.node,
    })
    if (process.platform === 'win32') app.setAppUserModelId('com.orbe.desktop')
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, _permission, callback) => callback(false),
    )
    manager = registerHandlers(() => mainWindow)
    logEvent('info', 'startup.services-ready')
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    logEvent('error', 'startup.failed', { message })
    dialog.showErrorBox('Não foi possível abrir o Orbe', message)
    app.quit()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

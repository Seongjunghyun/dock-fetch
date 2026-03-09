import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { exec } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { searchImages, getTags, getAvailablePlatforms, downloadImageAsTar } from './docker-api'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  if (process.platform === 'darwin') {
    app.setName('DockFetch');
  }

  const iconPath = path.join(process.env.VITE_PUBLIC, 'icon.png')
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath)
  }

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    icon: iconPath,
    title: 'DockFetch',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// IPC Handlers
ipcMain.handle('search-images', async (_, query: string) => {
  return await searchImages(query)
})

ipcMain.handle('get-tags', async (_, repo: string) => {
  return await getTags(repo, await import('./docker-api').then(m => m.getAuthToken(repo)))
})

ipcMain.handle('get-platforms', async (_, repo: string, tag: string) => {
  return await getAvailablePlatforms(repo, tag)
})

let activeControllers: Record<string, AbortController> = {}

ipcMain.handle('cancel-download', async (_, repo: string, tag: string) => {
  const key = `${repo}:${tag}`
  if (activeControllers[key]) {
    activeControllers[key].abort()
    delete activeControllers[key]
    return true
  }
  return false
})

ipcMain.handle('download-image', async (event, repo: string, tag: string, digest: string, defaultPath: string | null) => {
  let targetPath = ''

  if (defaultPath) {
    const fs = await import('node:fs')
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath, { recursive: true })
    }
    targetPath = path.join(defaultPath, `${repo.replace(/\//g, '_')}_${tag.replace(/\//g, '_')}.tar`)
  } else {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Docker Image',
      defaultPath: `${repo.replace(/\//g, '_')}_${tag.replace(/\//g, '_')}.tar`,
      filters: [{ name: 'Tarball', extensions: ['tar'] }]
    })

    if (canceled || !filePath) return null
    targetPath = filePath
  }

  const controller = new AbortController()
  const key = `${repo}:${tag}`
  activeControllers[key] = controller

  try {
    const token = await import('./docker-api').then(m => m.getAuthToken(repo))
    await downloadImageAsTar(repo, tag, digest, token, targetPath, (msg, percent) => {
      // Send progress back to renderer
      event.sender.send('download-progress', { repo, tag, msg, percent })
    }, controller.signal)
    return targetPath
  } catch (err: any) {
    const axios = (await import('axios')).default
    if (axios.isCancel(err) || err.name === 'AbortError' || err.message === 'canceled') {
      console.log('Download canceled by user:', key)
      throw new Error('Canceled by user')
    }
    console.error('Download error:', err)
    throw new Error(err.message)
  } finally {
    delete activeControllers[key]
  }
})

ipcMain.handle('fetch-to-local-docker', async (event, repo: string, tag: string, digest: string) => {
  try {
    const os = await import('node:os')
    const fs = await import('node:fs')
    const path = await import('node:path')

    // 1. Download to temp file
    const tempPath = path.join(os.tmpdir(), `dockfetch_${Date.now()}_${repo.replace(/\//g, '_')}_${tag.replace(/\//g, '_')}.tar`)
    const token = await import('./docker-api').then(m => m.getAuthToken(repo))

    const controller = new AbortController()
    const key = `${repo}:${tag}`
    activeControllers[key] = controller

    try {
      await downloadImageAsTar(repo, tag, digest, token, tempPath, (_msg, percent) => {
        event.sender.send('download-progress', { repo, tag, msg: `Downloading to temp: ${Math.round(percent)}%`, percent })
      }, controller.signal)
    } finally {
      delete activeControllers[key]
    }

    // 2. Load into docker
    event.sender.send('download-progress', { repo, tag, msg: 'Loading into Docker daemon...', percent: 100 })

    return new Promise((resolve, reject) => {
      const env = getDockerEnv()
      exec(`docker load -i "${tempPath}"`, { env }, (error, stdout, stderr) => {
        // 3. Cleanup temp file
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath) } catch (e) { }

        if (error) {
          console.error('Docker load error:', error, stderr)
          reject(new Error(stderr || error.message))
        } else {
          resolve({ success: true, output: stdout })
        }
      })
    })
  } catch (err: any) {
    const axios = (await import('axios')).default
    if (axios.isCancel(err) || err.name === 'AbortError' || err.message === 'canceled') {
      throw new Error('Canceled by user')
    }
    console.error('Fetch to docker error:', err)
    throw new Error(err.message)
  }
})

ipcMain.handle('load-local-image', async (_, targetPath: string) => {
  return new Promise((resolve, reject) => {
    const env = getDockerEnv()
    exec(`docker load -i "${targetPath}"`, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error('Docker load error:', error, stderr)
        reject(new Error(stderr || error.message))
      } else {
        resolve({ success: true, output: stdout })
      }
    })
  })
})

ipcMain.handle('select-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
})

ipcMain.handle('open-path', async (_, targetPath: string) => {
  const fs = await import('node:fs')
  try {
    const stats = fs.statSync(targetPath)
    if (stats.isDirectory()) {
      shell.openPath(targetPath)
    } else {
      shell.showItemInFolder(targetPath)
    }
  } catch (err) {
    console.error('Error opening path:', err)
    shell.showItemInFolder(targetPath) // Fallback
  }
})

function getDockerEnv() {
  const env = { ...process.env }
  const extraPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    'C:\\Program Files\\Docker\\Docker\\resources\\bin',
    'C:\\ProgramData\\DockerDesktop\\version-bin'
  ]
  
  const delimiter = process.platform === 'win32' ? ';' : ':'
  const currentPath = env.PATH || ''
  
  // Ensure we don't have duplicates and add our extra paths
  const allPaths = [...new Set([...extraPaths, ...currentPath.split(delimiter)])]
  env.PATH = allPaths.filter(Boolean).join(delimiter)
  
  return env
}

ipcMain.handle('get-local-images', async () => {
  return new Promise((resolve, _reject) => {
    const env = getDockerEnv()

    exec('docker images --format \'{"repo":"{{.Repository}}","tag":"{{.Tag}}","id":"{{.ID}}","size":"{{.Size}}","created":"{{.CreatedAt}}"}\'', { env }, (error, stdout, stderr) => {
      if (error) {
        console.error('Docker CLI error:', error, stderr)
        return resolve([]) // Return empty array if docker not running/installed
      }

      try {
        const images = stdout.trim().split('\n')
          .filter(line => line.length > 0)
          .map(line => JSON.parse(line))
        resolve(images)
      } catch (err) {
        console.error('JSON parse error:', err)
        resolve([])
      }
    })
  })
})

ipcMain.handle('save-local-image', async (_, repo: string, tag: string, id: string, defaultPath: string | null) => {
  let targetPath = ''

  const fileName = `${repo.replace(/\//g, '_')}_${tag.replace(/\//g, '_')}.tar`

  if (defaultPath) {
    const fs = await import('node:fs')
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath, { recursive: true })
    }
    targetPath = path.join(defaultPath, fileName)
  } else {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Local Docker Image',
      defaultPath: fileName,
      filters: [{ name: 'Tarball', extensions: ['tar'] }]
    })

    if (canceled || !filePath) return null
    targetPath = filePath
  }

  return new Promise((resolve, reject) => {
    const env = getDockerEnv()
    // CRITICAL: For images like python:3.11-slim-bookworm, repo is 'python' and tag is '3.11-slim-bookworm'
    // If either is <none> (dangling), we MUST use the ID.
    const imageRef = (repo === '<none>' || tag === '<none>' || !repo || !tag) ? id : `${repo}:${tag}`
    
    const command = `docker save -o "${targetPath}" "${imageRef}"`
    console.log(`Executing export: ${command}`)

    exec(command, { env }, (error, _stdout, stderr) => {
      if (error) {
        console.error('Docker save error:', error, stderr)
        reject(new Error(stderr || error.message))
      } else {
        console.log('Export successful:', targetPath)
        resolve(targetPath)
      }
    })
  })
})

ipcMain.handle('check-file-exists', async (_, targetPath: string) => {
  const fs = await import('node:fs');
  return fs.existsSync(targetPath);
})

ipcMain.handle('get-directory-tars', async (_, dirPath: string) => {
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')

    if (!fs.existsSync(dirPath)) return []

    const files = fs.readdirSync(dirPath)
    const tarFiles = []

    for (const file of files) {
      if (file.endsWith('.tar')) {
        const fullPath = path.join(dirPath, file)
        const stats = fs.statSync(fullPath)
        tarFiles.push({
          name: file,
          path: fullPath,
          size: stats.size,
          modified: stats.mtime.toISOString()
        })
      }
    }

    // Sort by modified date descending
    return tarFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
  } catch (err) {
    console.error('Error reading directory tars:', err)
    return []
  }
})

ipcMain.handle('delete-file', async (_, targetPath: string) => {
  try {
    const fs = await import('node:fs')
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath)
      return { success: true }
    }
    return { success: false, error: 'File not found' }
  } catch (err: any) {
    console.error('Error deleting file:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('open-external-link', async (_, url: string) => {
  await shell.openExternal(url)
  return true
})

// --- Image Management IPC ---
ipcMain.handle('delete-local-image', async (_, imageId: string) => {
  return new Promise((resolve) => {
    const env = getDockerEnv()
    exec(`docker rmi -f "${imageId}"`, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error('Docker rmi error:', error, stderr)
        resolve({ success: false, error: stderr || error.message })
      } else {
        resolve({ success: true, output: stdout })
      }
    })
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

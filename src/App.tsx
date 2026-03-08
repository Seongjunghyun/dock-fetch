import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Download, Star, FolderOpen, Sun, Moon, Settings, Loader2, X, HardDrive, CheckCircle2, ChevronDown, Package, Heart, Trash2, Github, Info } from 'lucide-react'

// Helper hooks for LocalStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// Helper to format large numbers (e.g. 1000000 -> 1M)
function formatNumber(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

import './index.css'

// Helper component for Docker Image Logos
const ImageLogo = ({ repoName, size = 24 }: { repoName: string, size?: number }) => {
  const [imgError, setImgError] = useState(false);
  const isOfficial = !repoName.includes('/') || repoName.startsWith('library/');
  const displayName = repoName.split('/').pop() || repoName;

  // Map common repo names to devicon names
  const iconNameMap: Record<string, string> = {
    'node': 'nodejs', 'postgres': 'postgresql', 'golang': 'go', 'httpd': 'apache',
    'alpine': 'alpinejs', 'nginx': 'nginx', 'redis': 'redis', 'python': 'python',
    'ubuntu': 'ubuntu', 'mysql': 'mysql', 'mongo': 'mongodb', 'mariadb': 'mariadb',
    'php': 'php', 'ruby': 'ruby', 'rust': 'rust', 'java': 'java', 'openjdk': 'java',
    'wordpress': 'wordpress', 'elasticsearch': 'elasticsearch', 'jenkins': 'jenkins',
    'tomcat': 'tomcat', 'grafana': 'grafana', 'prometheus': 'prometheus', 'vault': 'vault',
    'maven': 'maven', 'gradle': 'gradle', 'dotnet': 'dot-net', 'dart': 'dart',
    'flutter': 'flutter', 'elixir': 'elixir', 'erlang': 'erlang', 'haskell': 'haskell',
    'julia': 'julia', 'perl': 'perl', 'scala': 'scala', 'swift': 'swift',
    'vue': 'vuejs', 'react': 'react', 'Debian': 'debian', 'centos': 'centos',
    'amazonlinux': 'amazonwebservices', 'react-native': 'react', 'archlinux': 'archlinux'
  };

  const deviconName = iconNameMap[displayName] || displayName;
  // Devicons usually prefer -original, but sometimes -plain
  const iconUrl = `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${deviconName}/${deviconName}-original.svg`;

  if (!imgError) {
    return (
      <img
        src={iconUrl}
        alt={displayName}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
        onError={(e) => {
          // Fallback to plain if original fails once, then to initials
          if (e.currentTarget.src.includes('-original.svg')) {
            e.currentTarget.src = iconUrl.replace('-original.svg', '-plain.svg');
          } else {
            setImgError(true);
          }
        }}
      />
    );
  }

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 'var(--radius-sm)',
      background: isOfficial ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: size * 0.5,
      border: isOfficial ? 'none' : '1px solid var(--border-color)',
      flexShrink: 0
    }}>
      {initial}
    </div>
  )
}

const DockFetchLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="0.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="url(#logo-gradient)" fill="rgba(59, 130, 246, 0.15)" filter="url(#glow)" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="url(#logo-gradient)" />
    <line x1="12" y1="22.08" x2="12" y2="12" stroke="url(#logo-gradient)" />
  </svg>
)

function App() {
  const [activeTab, setActiveTab] = useState<'favorites' | 'storage' | 'local' | 'settings'>('favorites')
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('dockfetch-theme', 'dark')
  const [downloadPath, setDownloadPath] = useLocalStorage<string>('dockfetch-dl-path', '')
  const [favorites, setFavorites] = useLocalStorage<any[]>('dockfetch-favorites', [])
  const [libraryHistory, setLibraryHistory] = useLocalStorage<any[]>('dockfetch-library', [])
  const [recentSearches, setRecentSearches] = useLocalStorage<any[]>('dockfetch-recent-searches', [])

  const [fileExistsMap, setFileExistsMap] = useState<Record<string, boolean>>({})
  const defaultTabs = [
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'storage', label: 'Storage', icon: Package },
    { id: 'local', label: 'Local Docker', icon: HardDrive },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light')
    } else {
      document.body.classList.remove('light')
    }
  }, [theme])

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [images, setImages] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const searchContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchFocused(false)
        setSearchQuery('')
        setSelectedImage(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const [selectedImage, setSelectedImage] = useState<any | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [selectedTag, setSelectedTag] = useState('')
  const [platforms, setPlatforms] = useState<any[]>([])
  const [selectedDigest, setSelectedDigest] = useState('')

  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<{ msg: string; percent?: number; error?: boolean; loading?: boolean } | null>(null)
  const isDownloadingRef = useRef(false)
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    setToast({ title, message, type })
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToast(null), duration)
  }

  const [localImages, setLocalImages] = useState<any[]>([])
  const [isFetchingLocal, setIsFetchingLocal] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ msg: string } | null>(null)
  const [deleteProgress, setDeleteProgress] = useState<{ msg: string, loading?: boolean, error?: boolean } | null>(null)

  const [storageSearchQuery, setStorageSearchQuery] = useState('')
  const [localDockerSearchQuery, setLocalDockerSearchQuery] = useState('')
  const [selectedStorageFiles, setSelectedStorageFiles] = useState<string[]>([])
  const [selectedLocalImages, setSelectedLocalImages] = useState<string[]>([])

  // Docker Load Progress
  const [dockerLoadProgress, setDockerLoadProgress] = useState<{ msg: string; loading?: boolean; error?: boolean } | null>(null)

  const [directoryTars, setDirectoryTars] = useState<any[]>([])

  // Check file existence when library history changes or tab switches
  useEffect(() => {
    const checkFiles = async () => {
      const newMap: Record<string, boolean> = {}
      for (const entry of libraryHistory) {
        try {
          // @ts-ignore
          const exists = await window.ipcRenderer.invoke('check-file-exists', entry.path)
          newMap[entry.path] = exists
        } catch (e) {
          newMap[entry.path] = false
        }
      }
      setFileExistsMap(newMap)
    }
    checkFiles()
  }, [libraryHistory, activeTab])

  // Fetch local images when local tab is active
  useEffect(() => {
    fetchLocalImages(true)
  }, [])

  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const [tagSearchMode, setTagSearchMode] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false)

  // Handle click outside to close tag/platform dropdown/search
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tag-select-container')) {
        setIsTagDropdownOpen(false);
        setTagSearchMode(false);
      }
      if (!target.closest('.platform-select-container')) {
        setIsPlatformDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  useEffect(() => {
    setSelectedImage(null)
    setDownloadProgress(null)
    setToast(null)
    setSelectedStorageFiles([])
    setSelectedLocalImages([])

    if (activeTab === 'local') {
      fetchLocalImages()
    }
  }, [activeTab])

  const fetchDirectoryTars = useCallback(async () => {
    if (!downloadPath) return
    try {
      // @ts-ignore
      const tars = await window.ipcRenderer.invoke('get-directory-tars', downloadPath)
      setDirectoryTars(tars || [])
    } catch (err) {
      console.error(err)
    }
  }, [downloadPath])

  // Fetch local .tar files when storage tab is active and downloadPath is set
  useEffect(() => {
    if (activeTab === 'storage' && downloadPath) {
      fetchDirectoryTars()
    }
  }, [activeTab, downloadPath, fetchDirectoryTars])

  const handleDeleteFile = async (filePath: string) => {
    try {
      // @ts-ignore
      const res = await window.ipcRenderer.invoke('delete-file', filePath)
      if (res.success) {
        // Refresh the list and clear selection if deleted
        setSelectedStorageFiles(prev => prev.filter(p => p !== filePath))
        fetchDirectoryTars()
      } else {
        alert(`Failed to delete file:\n${res.error}`)
      }
    } catch (err: any) {
      console.error(err)
      alert(`Error deleting file: ${err.message}`)
    }
  }

  const fetchLocalImages = async (silent: boolean = false) => {
    if (!silent) setIsFetchingLocal(true)
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.invoke('get-local-images')
      setLocalImages(result || [])
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setIsFetchingLocal(false)
    }
  }

  const deleteLocalImage = async (img: any) => {
    const targetImage = (img.repo === '<none>' || img.tag === '<none>' || img.repo === 'untagged') ? img.id : `${img.repo}:${img.tag}`
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.invoke('delete-local-image', targetImage)
      if (result && result.success) {
        setDeleteProgress(null)
        setSelectedLocalImages(prev => prev.filter(id => id !== img.id))
        fetchLocalImages(true)
      } else {
        setDeleteProgress({ msg: `Failed to delete: ${result.error}`, error: true, loading: false })
        setTimeout(() => setDeleteProgress(null), 5000)
      }
    } catch (err: any) {
      setDeleteProgress({ msg: err.message || 'Error deleting local image.', error: true, loading: false })
      setTimeout(() => setDeleteProgress(null), 5000)
    }
  }

  const exportLocalImage = async (img: any) => {
    setExportProgress({ msg: `Exporting ${img.repo}:${img.tag}...` })
    try {
      // @ts-ignore
      const exportedPath = await window.ipcRenderer.invoke('save-local-image', img.repo, img.tag, img.id, downloadPath || null)
      if (exportedPath) {
        setExportProgress({ msg: `Successfully exported to ${exportedPath}` })

        // Add to history
        const newEntry = {
          repo_name: img.repo,
          tag: img.tag,
          digest: img.id,
          path: exportedPath,
          date: new Date().toISOString()
        }
        setLibraryHistory([newEntry, ...libraryHistory])

        setTimeout(() => setExportProgress(null), 3000)
      } else {
        setExportProgress(null)
      }
    } catch (err: any) {
      setExportProgress({ msg: `Error: ${err.message}` })
      setTimeout(() => setExportProgress(null), 4000)
    }
  }

  // Listen to search input
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 2) {
        performSearch(searchQuery)
      } else {
        setImages([])
        setSelectedImage(null)
      }
    }, 500)

    if (searchQuery.length > 0) {
      setSelectedImage(null)
    }

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  // Listen to IPC download progress
  useEffect(() => {
    const handleProgress = (_: any, data: { msg: string, percent: number }) => {
      if (isDownloadingRef.current) {
        setDownloadProgress({ msg: data.msg, percent: data.percent })
      }
    }

    // @ts-ignore
    window.ipcRenderer.on('download-progress', handleProgress)

    return () => {
      // @ts-ignore
      window.ipcRenderer.off('download-progress', handleProgress)
    }
  }, [])

  const performSearch = async (query: string) => {
    setIsSearching(true)
    try {
      // @ts-ignore
      const results = await window.ipcRenderer.invoke('search-images', query)
      setImages(results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  const openImageModal = async (img: any, initialTag?: string) => {
    setSelectedImage(img)
    setTags([])
    setPlatforms([])
    setSelectedTag('')
    setSelectedDigest('')
    setDownloadProgress(null)
    setToast(null)
    setDockerLoadProgress(null)
    setIsFetchingMetadata(true)

    if (!recentSearches.some((r: any) => r.repo_name === img.repo_name)) {
      setRecentSearches([img, ...recentSearches].slice(0, 10))
    }

    try {
      // @ts-ignore
      const fetchedTags = await window.ipcRenderer.invoke('get-tags', img.repo_name)
      // Usually dock hub returns latest first, let's grab top 50 to avoid huge UI hangs
      const recentTags = fetchedTags.slice(0, 50)
      setTags(recentTags)

      const defaultTag = (initialTag && recentTags.includes(initialTag)) ? initialTag : (recentTags.includes('latest') ? 'latest' : recentTags[0])
      if (defaultTag) {
        await handleTagChange(defaultTag, img.repo_name)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsFetchingMetadata(false)
    }
  }

  const handleTagChange = async (tag: string, repo: string) => {
    setSelectedTag(tag)
    setIsTagDropdownOpen(false)
    setTagSearchMode(false)
    setTagSearch('')
    setPlatforms([])
    setSelectedDigest('')
    setIsFetchingMetadata(true)
    try {
      // @ts-ignore
      const fetchedPlatforms = await window.ipcRenderer.invoke('get-platforms', repo, tag)
      setPlatforms(fetchedPlatforms)
      if (fetchedPlatforms.length > 0) {
        // default to first available
        setSelectedDigest(fetchedPlatforms[0].digest)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsFetchingMetadata(false)
    }
  }



  const triggerDownload = async (repo: string, tag: string, digest: string) => {
    isDownloadingRef.current = true
    setDownloadProgress({ msg: 'Starting download...', percent: 0 })
    setToast(null)

    try {
      // @ts-ignore
      const filePath = await window.ipcRenderer.invoke('download-image', repo, tag, digest, downloadPath || null)
      if (filePath) {
        isDownloadingRef.current = false
        showToast('Download Complete', 'Successfully saved image locally.', 'success')
        setDownloadProgress(null)
        // Add to library history
        const newEntry = {
          repo_name: repo,
          tag: tag,
          digest: digest,
          path: filePath,
          date: new Date().toISOString()
        }

        const existingIndex = libraryHistory.findIndex(e => e.repo_name === repo && e.tag === tag)
        if (existingIndex >= 0) {
          const newHistory = [...libraryHistory]
          newHistory.splice(existingIndex, 1)
          setLibraryHistory([newEntry, ...newHistory])
        } else {
          setLibraryHistory([newEntry, ...libraryHistory])
        }
      } else {
        // Canceled
        isDownloadingRef.current = false
        setDownloadProgress(null)
      }
    } catch (err: any) {
      console.error(err)
      isDownloadingRef.current = false
      setDownloadProgress({ msg: err.message || 'Error: Download failed. Check network or tag validity.', percent: 0, error: true })
      showToast('Download Failed', err.message || 'Failed to download the .tar locally.', 'error', 5000)
    }
  }

  const handleDownload = async () => {
    if (!selectedImage || !selectedTag || !selectedDigest) return
    triggerDownload(selectedImage.repo_name, selectedTag, selectedDigest)
  }

  const handleCancelDownload = async () => {
    if (!selectedImage || !selectedTag) return
    isDownloadingRef.current = false
    setDownloadProgress(null)
    setDockerLoadProgress(null)
    try {
      // @ts-ignore
      await window.ipcRenderer.invoke('cancel-download', selectedImage.repo_name, selectedTag)
    } catch (err) {
      console.error('Failed to cancel download', err)
    }
  }

  const handleFetchToDocker = async () => {
    if (!selectedImage || !selectedTag || !selectedDigest) return
    setDockerLoadProgress({ msg: 'Initializing direct docker load...', loading: true })
    setToast(null)

    try {
      // We will listen to the same download-progress event, but it's handled in main.ts
      // @ts-ignore
      const result = await window.ipcRenderer.invoke('fetch-to-local-docker', selectedImage.repo_name, selectedTag, selectedDigest)
      if (result && result.success) {
        setDockerLoadProgress(null)
        setDownloadProgress(null)
        showToast('Load Complete', 'Successfully loaded image into local Docker daemon!', 'success')
        fetchLocalImages(true)
      } else {
        setDockerLoadProgress({ msg: 'Failed to load image', loading: false, error: true })
        setDownloadProgress(null)
      }
    } catch (err: any) {
      console.error(err)
      setDockerLoadProgress({ msg: err.message || 'Error: Direct load failed.', loading: false, error: true })
      setDownloadProgress(null)
      showToast('Docker Load Failed', err.message || 'Failed to initialize docker daemon connection.', 'error', 5000)
    }
  }

  const handleBatchDeleteStorage = async () => {
    if (selectedStorageFiles.length === 0) return
    let successCount = 0
    let failCount = 0
    for (const filePath of selectedStorageFiles) {
      try {
        // @ts-ignore
        const res = await window.ipcRenderer.invoke('delete-file', filePath)
        if (res && res.success !== false) successCount++
        else failCount++
      } catch (err) {
        failCount++
      }
    }
    setSelectedStorageFiles([])
    fetchDirectoryTars()
    if (failCount > 0) {
      showToast('Batch Delete Completed', `Deleted ${successCount} files. Failed: ${failCount}`, 'info')
    } else {
      showToast('Batch Delete', `Successfully deleted ${successCount} files.`, 'success')
    }
  }

  const handleBatchLoadStorage = async () => {
    if (selectedStorageFiles.length === 0) return
    setToast(null)
    setDockerLoadProgress({ msg: `Initializing load for ${selectedStorageFiles.length} files...`, loading: true })
    let successCount = 0
    let failCount = 0
    for (let i = 0; i < selectedStorageFiles.length; i++) {
      const filePath = selectedStorageFiles[i];
      setDockerLoadProgress({ msg: `Loading ${i + 1} of ${selectedStorageFiles.length} files...`, loading: true })
      try {
        // @ts-ignore
        const res = await window.ipcRenderer.invoke('load-local-image', filePath)
        if (res && res.success !== false) successCount++
        else failCount++
      } catch (err) {
        failCount++
      }
    }
    setDockerLoadProgress(null)
    setSelectedStorageFiles([])
    fetchLocalImages(true)
    if (failCount > 0) {
      showToast('Batch Load Completed', `Loaded ${successCount} files. Failed: ${failCount}`, 'info')
    } else {
      showToast('Batch Load', `Successfully loaded ${successCount} files into Docker.`, 'success')
    }
  }

  const handleBatchDeleteLocal = async () => {
    if (selectedLocalImages.length === 0) return
    let successCount = 0
    let failCount = 0
    for (const imageId of selectedLocalImages) {
      const img = localImages.find(i => i.id === imageId)
      if (!img) { failCount++; continue; }
      const targetImage = (img.repo === '<none>' || img.tag === '<none>' || img.repo === 'untagged') ? img.id : `${img.repo}:${img.tag}`
      try {
        // @ts-ignore
        const res = await window.ipcRenderer.invoke('delete-local-image', targetImage)
        if (res && res.success !== false) successCount++
        else failCount++
      } catch (err) {
        failCount++
      }
    }
    setSelectedLocalImages([])
    fetchLocalImages(true)
    if (failCount > 0) {
      showToast('Batch Delete Completed', `Deleted ${successCount} images. Failed: ${failCount}`, 'info')
    } else {
      showToast('Batch Delete', `Successfully deleted ${successCount} images.`, 'success')
    }
  }

  const handleBatchExportLocal = async () => {
    if (selectedLocalImages.length === 0) return
    if (!downloadPath) {
      showToast('Batch Export Failed', 'Please set a Default Download Directory in Settings first.', 'error')
      return
    }
    setExportProgress({ msg: `Exporting ${selectedLocalImages.length} images...` })
    let successCount = 0
    let failCount = 0
    for (const imageId of selectedLocalImages) {
      const image = localImages.find(i => i.id === imageId)
      if (!image) continue
      try {
        // @ts-ignore
        const res = await window.ipcRenderer.invoke('save-local-image', image.repo, image.tag, image.id, downloadPath)
        if (res) successCount++
        else failCount++
      } catch (err) {
        failCount++
      }
    }
    setExportProgress(null)
    setSelectedLocalImages([])
    if (failCount > 0) {
      showToast('Batch Export Completed', `Exported ${successCount} images. Failed: ${failCount}`, 'info')
    } else {
      showToast('Batch Export', `Successfully exported ${successCount} images.`, 'success')
    }
  }



  const toggleFavorite = (e: any, img: any) => {
    e.stopPropagation();
    const isFav = favorites.find((f: any) => f.repo_name === img.repo_name);
    if (isFav) {
      setFavorites(favorites.filter((f: any) => f.repo_name !== img.repo_name));
    } else {
      setFavorites([...favorites, img]);
    }
  }

  const isFavorite = (repo_name: string) => !!favorites.find((f: any) => f.repo_name === repo_name);

  const hasAnyDownloadedFile = (repo_name: string) => {
    return libraryHistory.some(entry => entry.repo_name === repo_name && fileExistsMap[entry.path])
  }

  // Expose these generic wrappers for IPC commands
  const selectDirectory = async () => {
    try {
      // @ts-ignore
      const dir = await window.ipcRenderer.invoke('select-directory')
      if (dir) setDownloadPath(dir)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="app-container">
      <div className="main-wrapper">
        <aside className="sidebar glass">
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem', fontWeight: 800, paddingLeft: '0.5rem', marginBottom: '2.5rem', color: 'var(--text-primary)' }}>
            <DockFetchLogo size={32} />
            <span style={{
              background: 'linear-gradient(45deg, var(--accent-secondary), var(--accent-primary))',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-0.02em'
            }}>DockFetch</span>
          </div>
          <nav>
            {defaultTabs.filter(tab => tab.id !== 'recent').map(tab => (
              <div
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSearchQuery('');
                  setIsSearchFocused(false);
                }}
                style={{ cursor: 'pointer' }}
              >
                <tab.icon size={20} />
                {tab.label}
              </div>
            ))}
          </nav>
          <div style={{
            marginTop: 'auto',
            padding: '1rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 500
          }}>
            v0.4.1
          </div>
        </aside>

        <main className="main-content">
          <div style={{ position: 'sticky', top: 0, zIndex: 50, padding: '1rem 2rem', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'center', borderBottom: '1px solid var(--border-color)' }}>
            <div className="search-container" style={{ width: '100%', maxWidth: 'none', margin: '0' }}>
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="search-input"
                placeholder="Search Docker Hub... (e.g. nginx, alpine)"
                value={searchQuery}
                onFocus={() => {
                  setIsSearchFocused(true)
                  setSelectedImage(null)
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div ref={searchContainerRef} style={{ display: 'contents' }}>
            {(searchQuery.length > 0 || isSearchFocused) && (
              <div className="search-results-overlay">

                <div className="content-area">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
                    <h2 className="page-title" style={{ marginBottom: 0 }}>
                      {searchQuery.length > 0
                        ? (searchQuery.length > 2 ? `Search Results for "${searchQuery}"` : 'Docker registry viewer')
                        : 'Recent'}
                    </h2>
                    {searchQuery.length === 0 && recentSearches.length > 0 && (
                      <button style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 0, flexShrink: 0 }} onClick={() => setRecentSearches([])}>
                        Clear
                      </button>
                    )}
                  </div>

                  {isSearching && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                      <Loader2 className="spinner" size={18} />
                      Searching registry...
                    </div>
                  )}

                  {!isSearching && searchQuery.length > 0 && searchQuery.length <= 2 && (
                    <div style={{ color: 'var(--text-secondary)' }}>Type at least 3 characters to search Docker Hub...</div>
                  )}

                  {!isSearching && images.length === 0 && searchQuery.length > 2 && (
                    <div style={{ color: 'var(--text-secondary)' }}>No images found.</div>
                  )}

                  <div className="image-grid">
                    {((searchQuery.length > 2 && images.length > 0) ? images : (searchQuery.length === 0 ? recentSearches : [])).map((img) => {
                      const isLocalTarDownloaded = (repo: string, tag: string) => {
                        if (!tag) return false;
                        const safeRepoName = repo.replace(/\//g, '_');
                        const expectedName = `${safeRepoName}_${tag}.tar`;
                        const inTars = directoryTars.some(t => t.name === expectedName);
                        const match = libraryHistory.find(e => e.repo_name === repo && e.tag === tag);
                        return inTars || !!(match && fileExistsMap[match.path]);
                      }

                      const isImageInDocker = (repo: string, tag: string) => {
                        if (!tag) return false;
                        return localImages.some(localImg => {
                          const imgName = localImg.repo === 'untagged' ? localImg.id : `${localImg.repo}:${localImg.tag}`;
                          return imgName === `${repo}:${tag}`;
                        });
                      };

                      const tarExists = selectedImage?.repo_name === img.repo_name ? isLocalTarDownloaded(img.repo_name, selectedTag) : false;
                      const dockerExists = selectedImage?.repo_name === img.repo_name ? isImageInDocker(img.repo_name, selectedTag) : false;

                      return (
                        <div
                          key={img.repo_name}
                          className={`image-card glass-panel ${selectedImage?.repo_name === img.repo_name ? 'expanded' : ''}`}
                          onClick={() => {
                            if (selectedImage?.repo_name !== img.repo_name && !downloadProgress) {
                              openImageModal(img)
                            }
                          }}
                          style={{
                            cursor: selectedImage?.repo_name === img.repo_name ? 'default' : 'pointer',
                            border: selectedImage?.repo_name === img.repo_name ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            boxShadow: selectedImage?.repo_name === img.repo_name ? '0 0 15px rgba(var(--accent-primary-rgb), 0.3)' : 'none',
                            zIndex: selectedImage?.repo_name === img.repo_name ? 50 : 1
                          }}
                        >
                          <div className="card-header">
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                              <ImageLogo repoName={img.repo_name} size={40} />
                              <div>
                                <h3 className="repo-name" style={{ fontSize: selectedImage?.repo_name === img.repo_name ? '1.2rem' : '1rem' }}>{img.repo_name}</h3>
                                <p className="repo-desc" style={{ WebkitLineClamp: selectedImage?.repo_name === img.repo_name ? 'unset' : 2 }}>{img.short_description}</p>
                              </div>
                            </div>
                            <div className="card-icon" style={{ background: 'transparent', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', marginLeft: 'auto' }}>
                              {searchQuery.length === 0 ? (
                                <>
                                  <div onClick={(e) => {
                                    e.stopPropagation();
                                    setRecentSearches(recentSearches.filter((r: any) => r.repo_name !== img.repo_name))
                                    if (selectedImage?.repo_name === img.repo_name) setSelectedImage(null);
                                  }} style={{ cursor: 'pointer', zIndex: 10, color: 'var(--text-secondary)' }} title="Remove from history">
                                    <X size={18} />
                                  </div>
                                  <div onClick={(e) => toggleFavorite(e, img)} style={{ cursor: 'pointer', zIndex: 10 }} title="Add to Favorites">
                                    <Heart size={18} fill={isFavorite(img.repo_name) ? '#ef4444' : 'transparent'} color={isFavorite(img.repo_name) ? '#ef4444' : 'var(--text-secondary)'} />
                                  </div>
                                </>
                              ) : (
                                <div onClick={(e) => toggleFavorite(e, img)} style={{ cursor: 'pointer', zIndex: 10 }} title="Add to Favorites">
                                  <Heart size={18} fill={isFavorite(img.repo_name) ? '#ef4444' : 'transparent'} color={isFavorite(img.repo_name) ? '#ef4444' : 'var(--text-secondary)'} />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="card-stats" style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="stat-item" style={{ marginRight: '1rem' }}>
                              <Star size={14} />
                              {formatNumber(img.star_count)}
                            </div>
                            <div className="stat-item">
                              <Download size={14} />
                              {formatNumber(img.pull_count)}
                            </div>

                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {hasAnyDownloadedFile(img.repo_name) && (
                                <div className="stat-item" style={{ color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                                  <CheckCircle2 size={12} />
                                  Local
                                </div>
                              )}
                            </div>
                          </div>

                          {selectedImage?.repo_name === img.repo_name && (
                            <div className="expanded-details" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                              {isFetchingMetadata ? (
                                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                  <Loader2 className="spinner" size={24} style={{ margin: '0 auto 1rem auto', display: 'block' }} />
                                  Fetching tags and architectures...
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                                    <div className="control-group" style={{ marginBottom: 0, minWidth: 0 }}>
                                      <label className="control-label" style={{ fontSize: '0.75rem' }}>Tag / Version</label>

                                      <div className="tag-select-container" style={{ position: 'relative' }}>
                                        {tagSearchMode ? (
                                          <input
                                            type="text"
                                            className="text-input"
                                            style={{ paddingRight: '2rem' }}
                                            placeholder="Search tags..."
                                            value={tagSearch}
                                            onChange={(e) => setTagSearch(e.target.value)}
                                            autoFocus
                                            onBlur={() => {
                                              setTimeout(() => setTagSearchMode(false), 200)
                                            }}
                                          />
                                        ) : (
                                          <div className="select-wrapper">
                                            <div
                                              className="custom-select-trigger"
                                              onClick={(e) => {
                                                if (downloadProgress) return;
                                                if (isTagDropdownOpen) {
                                                  e.preventDefault();
                                                  setTagSearchMode(true);
                                                }
                                                setIsTagDropdownOpen(!isTagDropdownOpen);
                                              }}
                                              style={{
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: '0.75rem 1rem',
                                                paddingRight: '2.5rem',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                cursor: downloadProgress ? 'not-allowed' : 'pointer',
                                                color: downloadProgress ? 'var(--text-secondary)' : 'var(--text-primary)'
                                              }}
                                            >
                                              {selectedTag || 'Select Tag'}
                                            </div>
                                            <ChevronDown className="select-arrow" size={16} />
                                          </div>
                                        )}
                                        {isTagDropdownOpen && !tagSearchMode && (
                                          <ul
                                            className="custom-dropdown-list"
                                            style={{
                                              position: 'absolute',
                                              top: '100%',
                                              left: 0,
                                              right: 0,
                                              maxHeight: '250px',
                                              overflowY: 'auto',
                                              backgroundColor: 'var(--bg-secondary)',
                                              border: '1px solid var(--border-color)',
                                              borderRadius: 'var(--radius-md)',
                                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                              zIndex: 100,
                                              marginTop: '4px',
                                              listStyle: 'none',
                                              padding: '0.5rem 0'
                                            }}
                                          >
                                            {tags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).map(t => (
                                              <li
                                                key={t}
                                                style={{
                                                  padding: '0.5rem 1rem',
                                                  cursor: 'pointer',
                                                  backgroundColor: selectedTag === t ? 'var(--accent-primary)' : 'transparent',
                                                  color: selectedTag === t ? 'white' : 'inherit'
                                                }}
                                                onClick={() => {
                                                  handleTagChange(t, img.repo_name);
                                                }}
                                                onMouseEnter={(e) => { if (selectedTag !== t) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                                                onMouseLeave={(e) => { if (selectedTag !== t) e.currentTarget.style.backgroundColor = 'transparent' }}
                                              >
                                                {t}
                                              </li>
                                            ))}
                                            {tags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                                              <li style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>No tags found</li>
                                            )}
                                          </ul>
                                        )}
                                      </div>
                                    </div>
                                    <div className="control-group" style={{ marginBottom: 0, minWidth: 0, zIndex: 0 }}>
                                      <label className="control-label" style={{ fontSize: '0.75rem' }}>Platform</label>
                                      <div className="platform-select-container" style={{ position: 'relative' }}>
                                        <div className="select-wrapper">
                                          <div
                                            className="custom-select-trigger"
                                            onClick={() => {
                                              if (downloadProgress || platforms.length === 0) return;
                                              setIsPlatformDropdownOpen(!isPlatformDropdownOpen);
                                            }}
                                            style={{
                                              backgroundColor: 'var(--bg-secondary)',
                                              border: '1px solid var(--border-color)',
                                              borderRadius: 'var(--radius-md)',
                                              padding: '0.75rem 1rem',
                                              paddingRight: '2.5rem',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              cursor: (downloadProgress || platforms.length === 0) ? 'not-allowed' : 'pointer',
                                              color: (downloadProgress || platforms.length === 0) ? 'var(--text-secondary)' : 'var(--text-primary)'
                                            }}
                                          >
                                            {platforms.length > 0 && selectedDigest
                                              ? (() => {
                                                const p = platforms.find(pl => pl.digest === selectedDigest);
                                                return p ? `${p.os}/${p.architecture} ${p.variant ? `(${p.variant})` : ''}` : 'Select Platform';
                                              })()
                                              : 'Select Platform'}
                                          </div>
                                          <ChevronDown className="select-arrow" size={16} />
                                        </div>
                                        {isPlatformDropdownOpen && (
                                          <ul
                                            className="custom-dropdown-list"
                                            style={{
                                              position: 'absolute',
                                              top: '100%',
                                              left: 0,
                                              right: 0,
                                              maxHeight: '250px',
                                              overflowY: 'auto',
                                              backgroundColor: 'var(--bg-secondary)',
                                              border: '1px solid var(--border-color)',
                                              borderRadius: 'var(--radius-md)',
                                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                              zIndex: 100,
                                              marginTop: '4px',
                                              listStyle: 'none',
                                              padding: '0.5rem 0'
                                            }}
                                          >
                                            {platforms.map(p => {
                                              const platformLabel = `${p.os}/${p.architecture} ${p.variant ? `(${p.variant})` : ''}`;
                                              return (
                                                <li
                                                  key={p.digest}
                                                  style={{
                                                    padding: '0.5rem 1rem',
                                                    cursor: 'pointer',
                                                    backgroundColor: selectedDigest === p.digest ? 'var(--accent-primary)' : 'transparent',
                                                    color: selectedDigest === p.digest ? 'white' : 'inherit'
                                                  }}
                                                  onClick={() => {
                                                    setSelectedDigest(p.digest);
                                                    setIsPlatformDropdownOpen(false);
                                                  }}
                                                  onMouseEnter={(e) => { if (selectedDigest !== p.digest) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                                                  onMouseLeave={(e) => { if (selectedDigest !== p.digest) e.currentTarget.style.backgroundColor = 'transparent' }}
                                                >
                                                  {platformLabel}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {!downloadProgress && !dockerLoadProgress ? (
                                    <>
                                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        <button
                                          className="btn"
                                          style={{
                                            flex: 1,
                                            background: dockerExists ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                                            color: dockerExists ? 'var(--text-secondary)' : 'white',
                                            cursor: dockerExists ? 'not-allowed' : 'pointer',
                                            boxShadow: dockerExists ? 'none' : '0 2px 5px rgba(0,0,0,0.2)'
                                          }}
                                          onClick={handleFetchToDocker}
                                          disabled={platforms.length === 0 || dockerExists}
                                          title={dockerExists ? "This version is already imported in your Local Docker" : "Load this image directly to your Local Docker Daemon"}
                                        >
                                          <HardDrive size={16} /> Load
                                        </button>
                                        <button
                                          className="btn"
                                          style={{
                                            flex: 1,
                                            background: tarExists ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                                            color: tarExists ? 'var(--text-secondary)' : 'var(--text-primary)',
                                            border: tarExists ? '1px solid var(--border-color)' : '1px solid rgba(255, 255, 255, 0.2)',
                                            cursor: tarExists ? 'not-allowed' : 'pointer',
                                            boxShadow: tarExists ? 'none' : '0 2px 5px rgba(0,0,0,0.2)'
                                          }}
                                          onClick={handleDownload}
                                          disabled={platforms.length === 0 || tarExists}
                                          title={tarExists ? "This .tar file is already downloaded in Storage" : "Save this image to your computer as a .tar file"}
                                        >
                                          <Download size={16} /> Save
                                        </button>
                                      </div>
                                    </>
                                  ) : downloadProgress?.error ? (
                                    <>
                                      <div style={{ textAlign: 'center', color: 'var(--error-color)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
                                        <X size={24} style={{ margin: '0 auto 0.5rem auto' }} />
                                        <p style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Download Failed</p>
                                        <p style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>{downloadProgress.msg}</p>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                          <button className="btn" style={{ flex: 1, padding: '0.5rem' }} onClick={() => setDownloadProgress(null)}>Dismiss</button>
                                          <button className="btn" style={{ flex: 1, padding: '0.5rem', background: 'var(--accent-primary)', color: 'white' }} onClick={handleDownload}>Retry</button>
                                        </div>
                                      </div>
                                    </>
                                  ) : dockerLoadProgress ? (
                                    <>
                                      <div className="progress-container" style={{ margin: '0.5rem 0' }}>
                                        <div className="progress-header" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.5rem', minWidth: 0, color: dockerLoadProgress.loading ? 'var(--text-primary)' : (dockerLoadProgress.error || dockerLoadProgress.msg.toLowerCase().includes('fail') || dockerLoadProgress.msg.toLowerCase().includes('cancel') ? 'var(--error-color)' : 'var(--success-color)') }}>
                                            {dockerLoadProgress.loading ? <Loader2 className="spinner" size={14} color="var(--accent-primary)" /> : (dockerLoadProgress.error || dockerLoadProgress.msg.toLowerCase().includes('fail') || dockerLoadProgress.msg.toLowerCase().includes('cancel') ? <X size={14} /> : <CheckCircle2 size={14} />)}
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dockerLoadProgress.msg}</span>
                                          </div>
                                          <button
                                            onClick={() => {
                                              handleCancelDownload()
                                              setDockerLoadProgress(null)
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                            title="Dismiss"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                        {dockerLoadProgress.loading && (
                                          <div className="progress-bar-bg" style={{ height: '4px' }}>
                                            <div className="progress-bar-fill" style={{ width: '100%' }}></div>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="progress-container" style={{ margin: '0.5rem 0' }}>
                                        <div className="progress-header" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingRight: '0.5rem', minWidth: 0 }}>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{downloadProgress?.msg}</span>
                                            <span style={{ flexShrink: 0, paddingLeft: '0.5rem' }}>{Math.round(downloadProgress?.percent || 0)}%</span>
                                          </div>
                                          <button
                                            onClick={handleCancelDownload}
                                            style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                            title="Cancel Download"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                        <div className="progress-bar-bg" style={{ height: '4px' }}>
                                          <div className="progress-bar-fill" style={{ width: `${downloadProgress?.percent}%` }}></div>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'favorites' && (
            <div className="content-area">
              <h2 className="page-title">My Favorites</h2>
              {favorites.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No favorites yet. Search and star some repositories!</p>
              ) : (
                <div className="image-grid" style={{ marginBottom: '3rem' }}>
                  {favorites.map((img) => {
                    const isLocalTarDownloaded = (repo: string, tag: string) => {
                      if (!tag) return false;
                      const safeRepoName = repo.replace(/\//g, '_');
                      const expectedName = `${safeRepoName}_${tag}.tar`;
                      const inTars = directoryTars.some(t => t.name === expectedName);
                      const match = libraryHistory.find(e => e.repo_name === repo && e.tag === tag);
                      return inTars || !!(match && fileExistsMap[match.path]);
                    }

                    const isImageInDocker = (repo: string, tag: string) => {
                      if (!tag) return false;
                      return localImages.some(localImg => {
                        const imgName = localImg.repo === 'untagged' ? localImg.id : `${localImg.repo}:${localImg.tag}`;
                        return imgName === `${repo}:${tag}`;
                      });
                    };

                    const tarExists = selectedImage?.repo_name === img.repo_name ? isLocalTarDownloaded(img.repo_name, selectedTag) : false;
                    const dockerExists = selectedImage?.repo_name === img.repo_name ? isImageInDocker(img.repo_name, selectedTag) : false;

                    return (
                      <div
                        key={img.repo_name}
                        className={`image-card glass-panel ${selectedImage?.repo_name === img.repo_name ? 'expanded' : ''}`}
                        onClick={() => {
                          if (selectedImage?.repo_name !== img.repo_name && !downloadProgress) {
                            openImageModal(img)
                          }
                        }}
                        style={{
                          cursor: selectedImage?.repo_name === img.repo_name ? 'default' : 'pointer',
                          border: selectedImage?.repo_name === img.repo_name ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          boxShadow: selectedImage?.repo_name === img.repo_name ? '0 0 15px rgba(var(--accent-primary-rgb), 0.3)' : 'none',
                          zIndex: selectedImage?.repo_name === img.repo_name ? 50 : 1
                        }}
                      >
                        <div className="card-header">
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            <ImageLogo repoName={img.repo_name} size={40} />
                            <div>
                              <h3 className="repo-name" style={{ fontSize: selectedImage?.repo_name === img.repo_name ? '1.2rem' : '1rem' }}>{img.repo_name}</h3>
                              <p className="repo-desc" style={{ WebkitLineClamp: selectedImage?.repo_name === img.repo_name ? 'unset' : 2 }}>{img.short_description}</p>
                            </div>
                          </div>
                          <div className="card-icon" style={{ background: 'transparent', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', marginLeft: 'auto' }}>
                            <div onClick={(e) => toggleFavorite(e, img)} style={{ cursor: 'pointer', zIndex: 10 }} title="Remove from Favorites">
                              <Heart size={18} fill="#ef4444" color="#ef4444" />
                            </div>
                          </div>
                        </div>
                        <div className="card-stats" style={{ display: 'flex', alignItems: 'center' }}>
                          <div className="stat-item" style={{ marginRight: '1rem' }}>
                            <Star size={14} />
                            {formatNumber(img.star_count)}
                          </div>
                          <div className="stat-item">
                            <Download size={14} />
                            {formatNumber(img.pull_count)}
                          </div>
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {hasAnyDownloadedFile(img.repo_name) && (
                              <div className="stat-item" style={{ color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                                <CheckCircle2 size={12} />
                                Local
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedImage?.repo_name === img.repo_name && (
                          <div className="expanded-details" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                            {isFetchingMetadata ? (
                              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <Loader2 className="spinner" size={24} style={{ margin: '0 auto 1rem auto', display: 'block' }} />
                                Fetching tags and architectures...
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                                  <div className="control-group" style={{ marginBottom: 0, minWidth: 0 }}>
                                    <label className="control-label" style={{ fontSize: '0.75rem' }}>Tag / Version</label>

                                    <div className="tag-select-container" style={{ position: 'relative' }}>
                                      {tagSearchMode ? (
                                        <input
                                          type="text"
                                          className="text-input"
                                          style={{ paddingRight: '2rem' }}
                                          placeholder="Search tags..."
                                          value={tagSearch}
                                          onChange={(e) => setTagSearch(e.target.value)}
                                          autoFocus
                                          onBlur={() => {
                                            setTimeout(() => setTagSearchMode(false), 200)
                                          }}
                                        />
                                      ) : (
                                        <div className="select-wrapper">
                                          <div
                                            className="custom-select-trigger"
                                            onClick={(e) => {
                                              if (downloadProgress) return;
                                              if (isTagDropdownOpen) {
                                                e.preventDefault();
                                                setTagSearchMode(true);
                                              }
                                              setIsTagDropdownOpen(!isTagDropdownOpen);
                                            }}
                                            style={{
                                              backgroundColor: 'var(--bg-secondary)',
                                              border: '1px solid var(--border-color)',
                                              borderRadius: 'var(--radius-md)',
                                              padding: '0.75rem 1rem',
                                              paddingRight: '2.5rem',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              cursor: downloadProgress ? 'not-allowed' : 'pointer',
                                              color: downloadProgress ? 'var(--text-secondary)' : 'var(--text-primary)'
                                            }}
                                          >
                                            {selectedTag || 'Select Tag'}
                                          </div>
                                          <ChevronDown className="select-arrow" size={16} />
                                        </div>
                                      )}
                                      {isTagDropdownOpen && !tagSearchMode && (
                                        <ul
                                          className="custom-dropdown-list"
                                          style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            maxHeight: '250px',
                                            overflowY: 'auto',
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                            zIndex: 100,
                                            marginTop: '4px',
                                            listStyle: 'none',
                                            padding: '0.5rem 0'
                                          }}
                                        >
                                          {tags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).map(t => (
                                            <li
                                              key={t}
                                              style={{
                                                padding: '0.5rem 1rem',
                                                cursor: 'pointer',
                                                backgroundColor: selectedTag === t ? 'var(--accent-primary)' : 'transparent',
                                                color: selectedTag === t ? 'white' : 'inherit'
                                              }}
                                              onClick={() => {
                                                handleTagChange(t, img.repo_name);
                                              }}
                                              onMouseEnter={(e) => { if (selectedTag !== t) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                                              onMouseLeave={(e) => { if (selectedTag !== t) e.currentTarget.style.backgroundColor = 'transparent' }}
                                            >
                                              {t}
                                            </li>
                                          ))}
                                          {tags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                                            <li style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>No tags found</li>
                                          )}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                  <div className="control-group" style={{ marginBottom: 0, minWidth: 0, zIndex: 0 }}>
                                    <label className="control-label" style={{ fontSize: '0.75rem' }}>Platform</label>
                                    <div className="platform-select-container" style={{ position: 'relative' }}>
                                      <div className="select-wrapper">
                                        <div
                                          className="custom-select-trigger"
                                          onClick={() => {
                                            if (downloadProgress || platforms.length === 0) return;
                                            setIsPlatformDropdownOpen(!isPlatformDropdownOpen);
                                          }}
                                          style={{
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '0.75rem 1rem',
                                            paddingRight: '2.5rem',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            cursor: (downloadProgress || platforms.length === 0) ? 'not-allowed' : 'pointer',
                                            color: (downloadProgress || platforms.length === 0) ? 'var(--text-secondary)' : 'var(--text-primary)'
                                          }}
                                        >
                                          {platforms.length > 0 && selectedDigest
                                            ? (() => {
                                              const p = platforms.find(pl => pl.digest === selectedDigest);
                                              return p ? `${p.os}/${p.architecture} ${p.variant ? `(${p.variant})` : ''}` : 'Select Platform';
                                            })()
                                            : 'Select Platform'}
                                        </div>
                                        <ChevronDown className="select-arrow" size={16} />
                                      </div>
                                      {isPlatformDropdownOpen && (
                                        <ul
                                          className="custom-dropdown-list"
                                          style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            maxHeight: '250px',
                                            overflowY: 'auto',
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                            zIndex: 100,
                                            marginTop: '4px',
                                            listStyle: 'none',
                                            padding: '0.5rem 0'
                                          }}
                                        >
                                          {platforms.map(p => {
                                            const platformLabel = `${p.os}/${p.architecture} ${p.variant ? `(${p.variant})` : ''}`;
                                            return (
                                              <li
                                                key={p.digest}
                                                style={{
                                                  padding: '0.5rem 1rem',
                                                  cursor: 'pointer',
                                                  backgroundColor: selectedDigest === p.digest ? 'var(--accent-primary)' : 'transparent',
                                                  color: selectedDigest === p.digest ? 'white' : 'inherit'
                                                }}
                                                onClick={() => {
                                                  setSelectedDigest(p.digest);
                                                  setIsPlatformDropdownOpen(false);
                                                }}
                                                onMouseEnter={(e) => { if (selectedDigest !== p.digest) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                                                onMouseLeave={(e) => { if (selectedDigest !== p.digest) e.currentTarget.style.backgroundColor = 'transparent' }}
                                              >
                                                {platformLabel}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {!downloadProgress && !dockerLoadProgress ? (
                                  <>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                      <button
                                        className="btn"
                                        style={{
                                          flex: 1,
                                          background: dockerExists ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                                          color: dockerExists ? 'var(--text-secondary)' : 'white',
                                          cursor: dockerExists ? 'not-allowed' : 'pointer',
                                          boxShadow: dockerExists ? 'none' : '0 2px 5px rgba(0,0,0,0.2)'
                                        }}
                                        onClick={handleFetchToDocker}
                                        disabled={platforms.length === 0 || dockerExists}
                                        title={dockerExists ? "This version is already imported in your Local Docker" : "Load this image directly to your Local Docker Daemon"}
                                      >
                                        <HardDrive size={16} style={{ marginRight: '0.5rem' }} /> Load
                                      </button>
                                      <button
                                        className="btn"
                                        style={{
                                          flex: 1,
                                          background: tarExists ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                                          color: tarExists ? 'var(--text-secondary)' : 'var(--text-primary)',
                                          border: tarExists ? '1px solid var(--border-color)' : '1px solid rgba(255, 255, 255, 0.2)',
                                          cursor: tarExists ? 'not-allowed' : 'pointer',
                                          boxShadow: tarExists ? 'none' : '0 2px 5px rgba(0,0,0,0.2)'
                                        }}
                                        onClick={handleDownload}
                                        disabled={platforms.length === 0 || tarExists}
                                        title={tarExists ? "This .tar file is already downloaded in Storage" : "Save this image to your computer as a .tar file"}
                                      >
                                        <Download size={16} style={{ marginRight: '0.5rem' }} /> Save
                                      </button>
                                    </div>
                                  </>
                                ) : downloadProgress?.error ? (
                                  <>
                                    <div style={{ textAlign: 'center', color: 'var(--error-color)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
                                      <X size={24} style={{ margin: '0 auto 0.5rem auto' }} />
                                      <p style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Download Failed</p>
                                      <p style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>{downloadProgress.msg}</p>
                                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn" style={{ flex: 1, padding: '0.5rem' }} onClick={() => setDownloadProgress(null)}>Dismiss</button>
                                        <button className="btn" style={{ flex: 1, padding: '0.5rem', background: 'var(--accent-primary)', color: 'white' }} onClick={handleDownload}>Retry</button>
                                      </div>
                                    </div>
                                  </>
                                ) : dockerLoadProgress ? (
                                  <>
                                    <div className="progress-container" style={{ margin: '0.5rem 0' }}>
                                      <div className="progress-header" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.5rem', minWidth: 0, color: dockerLoadProgress.loading ? 'var(--text-primary)' : (dockerLoadProgress.msg.includes('Failed') ? 'var(--error-color)' : 'var(--success-color)') }}>
                                          {dockerLoadProgress.loading ? <Loader2 className="spinner" size={14} color="var(--accent-primary)" /> : (dockerLoadProgress.msg.includes('Failed') ? <X size={14} /> : <CheckCircle2 size={14} />)}
                                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dockerLoadProgress.msg}</span>
                                        </div>
                                        <button
                                          onClick={() => {
                                            handleCancelDownload()
                                            setDockerLoadProgress(null)
                                          }}
                                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                          title="Dismiss"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                      {dockerLoadProgress.loading && (
                                        <div className="progress-bar-bg" style={{ height: '4px' }}>
                                          <div className="progress-bar-fill" style={{ width: '100%' }}></div>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="progress-container" style={{ margin: '0.5rem 0' }}>
                                      <div className="progress-header" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingRight: '0.5rem', minWidth: 0 }}>
                                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{downloadProgress?.msg}</span>
                                          <span style={{ flexShrink: 0, paddingLeft: '0.5rem' }}>{Math.round(downloadProgress?.percent || 0)}%</span>
                                        </div>
                                        <button
                                          onClick={handleCancelDownload}
                                          style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                          title="Cancel Download"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                      <div className="progress-bar-bg" style={{ height: '4px' }}>
                                        <div className="progress-bar-fill" style={{ width: `${downloadProgress?.percent}%` }}></div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )
                        }
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {activeTab === 'storage' && (
            <div className="content-area">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="page-title" style={{ marginBottom: 0 }}>Files in Storage</h2>
                {downloadPath && (
                  <button className="btn" style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => {
                    // @ts-ignore
                    window.ipcRenderer.invoke('open-path', downloadPath)
                  }}>
                    <FolderOpen size={16} /> Open Folder
                  </button>
                )}
              </div>
              {!downloadPath ? (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No default download directory is set.</p>
                  <button className="btn" style={{ background: 'var(--accent-primary)', color: 'white', display: 'inline-flex', width: 'auto', padding: '0.5rem 1.5rem' }} onClick={() => setActiveTab('settings')}>
                    Go to Settings
                  </button>
                </div>
              ) : (
                <div>
                  {directoryTars.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No .tar images found in your default download directory.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <label style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: selectedStorageFiles.length > 0 ? 'white' : 'var(--text-primary)', userSelect: 'none', whiteSpace: 'nowrap' }}>
                            <input
                              type="checkbox"
                              checked={directoryTars.length > 0 && selectedStorageFiles.length === directoryTars.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedStorageFiles(directoryTars.map(f => f.path))
                                else setSelectedStorageFiles([])
                              }}
                              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                            />
                            {selectedStorageFiles.length > 0 ? `${selectedStorageFiles.length} Selected` : 'Select All'}
                          </label>
                          {selectedStorageFiles.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--accent-primary)', color: 'white' }} onClick={handleBatchLoadStorage}>Load</button>
                              <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--error-color)', color: 'white' }} onClick={handleBatchDeleteStorage}>Delete</button>
                            </div>
                          )}
                        </div>

                        <div className="search-container" style={{ width: '400px', marginBottom: 0, padding: 0, background: 'transparent' }}>
                          <Search className="search-icon" size={20} />
                          <input
                            type="text"
                            className="search-input"
                            placeholder="Filter storage files..."
                            value={storageSearchQuery}
                            onChange={(e) => setStorageSearchQuery(e.target.value)}
                            style={{ height: '44px', fontSize: '0.95rem' }}
                          />
                        </div>
                      </div>

                      {dockerLoadProgress && (
                        <div className="glass-panel" style={{ padding: '0.8rem 1rem', marginBottom: '0.5rem', borderRadius: 'var(--radius-md)', color: dockerLoadProgress.error ? 'var(--error-color)' : (dockerLoadProgress.loading ? 'var(--accent-primary)' : 'var(--success-color)'), display: 'flex', alignItems: 'center', gap: '0.5rem', border: `1px solid ${dockerLoadProgress.error ? 'var(--error-color)' : (dockerLoadProgress.loading ? 'var(--accent-primary)' : 'var(--success-color)')}` }}>
                          {dockerLoadProgress.loading ? <Loader2 className="spinner" size={16} /> : (dockerLoadProgress.error ? <X size={16} /> : <CheckCircle2 size={16} />)} {dockerLoadProgress.msg}
                        </div>
                      )}

                      {directoryTars.filter(f => f.name.toLowerCase().includes(storageSearchQuery.toLowerCase())).map((file, idx) => {
                        const match = libraryHistory.find(e => file.path === e.path);
                        const parts = file.name.replace('.tar', '').split('_');
                        const repoName = match ? match.repo_name : (parts.length >= 3 ? parts[1] : parts[0]);
                        return (
                          <div key={idx} className={`glass-panel ${selectedStorageFiles.includes(file.path) ? 'selected' : ''}`} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', border: selectedStorageFiles.includes(file.path) ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', padding: '0.1rem 0' }}>
                              <input
                                type="checkbox"
                                checked={selectedStorageFiles.includes(file.path)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStorageFiles(prev => [...prev, file.path])
                                  } else {
                                    setSelectedStorageFiles(prev => prev.filter(p => p !== file.path))
                                  }
                                }}
                                style={{ marginRight: '1rem', width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                              />
                              <div style={{ width: '48px', height: '48px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', flexShrink: 0 }}>
                                <ImageLogo repoName={repoName} size={28} />
                              </div>
                              <div>
                                <h3 style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 0.15rem 0' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                                  Size: {formatNumber(file.size)} Bytes • Modified: {new Date(file.modified).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', height: '100%' }}>
                              <div
                                className="card-icon"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleDeleteFile(file.path)}
                                title="Delete file permanently"
                              >
                                <Trash2 size={20} color="var(--error-color)" />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'local' && (
            <div className="content-area">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="page-title" style={{ marginBottom: 0 }}>Local Docker Images</h2>
                <button className="btn" style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={() => fetchLocalImages()}>
                  Refresh
                </button>
              </div>

              {isFetchingLocal ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <Loader2 className="spinner" size={18} />
                  Fetching local images...
                </div>
              ) : localImages.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No local images found or Docker is not running.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <label style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: selectedLocalImages.length > 0 ? 'white' : 'var(--text-primary)', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={localImages.length > 0 && selectedLocalImages.length === localImages.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedLocalImages(localImages.map(i => i.id))
                            else setSelectedLocalImages([])
                          }}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                        />
                        {selectedLocalImages.length > 0 ? `${selectedLocalImages.length} Selected` : 'Select All'}
                      </label>
                      {selectedLocalImages.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--accent-primary)', color: 'white' }} onClick={handleBatchExportLocal}>Export</button>
                          <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--error-color)', color: 'white' }} onClick={handleBatchDeleteLocal}>Delete</button>
                        </div>
                      )}
                    </div>

                    <div className="search-container" style={{ width: '400px', marginBottom: 0, padding: 0, background: 'transparent' }}>
                      <Search className="search-icon" size={20} />
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Filter local images..."
                        value={localDockerSearchQuery}
                        onChange={(e) => setLocalDockerSearchQuery(e.target.value)}
                        style={{ height: '44px', fontSize: '0.95rem' }}
                      />
                    </div>
                  </div>

                  {exportProgress && (
                    <div className="glass-panel" style={{ padding: '0.8rem 1rem', marginBottom: '0.5rem', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 className="spinner" size={16} /> {exportProgress.msg}
                    </div>
                  )}

                  {deleteProgress && (
                    <div className="glass-panel" style={{ padding: '0.8rem 1rem', marginBottom: '0.5rem', borderRadius: 'var(--radius-md)', color: deleteProgress.error ? 'var(--error-color)' : (deleteProgress.loading ? 'var(--accent-primary)' : 'var(--success-color)'), display: 'flex', alignItems: 'center', gap: '0.5rem', border: `1px solid ${deleteProgress.error ? 'var(--error-color)' : (deleteProgress.loading ? 'var(--accent-primary)' : 'var(--success-color)')}` }}>
                      {deleteProgress.loading ? <Loader2 className="spinner" size={16} /> : (deleteProgress.error ? <X size={16} /> : <CheckCircle2 size={16} />)} {deleteProgress.msg}
                    </div>
                  )}

                  {localImages.filter(img => `${img.repo}:${img.tag}`.toLowerCase().includes(localDockerSearchQuery.toLowerCase())).map((img, idx) => (
                    <div key={idx} className={`glass-panel ${selectedLocalImages.includes(img.id) ? 'selected' : ''}`} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', border: selectedLocalImages.includes(img.id) ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0.1rem 0' }}>
                        <input
                          type="checkbox"
                          checked={selectedLocalImages.includes(img.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLocalImages(prev => [...prev, img.id])
                            } else {
                              setSelectedLocalImages(prev => prev.filter(p => p !== img.id))
                            }
                          }}
                          style={{ marginRight: '1rem', width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        />
                        <div style={{ width: '48px', height: '48px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', flexShrink: 0 }}>
                          <ImageLogo repoName={img.repo} size={28} />
                        </div>
                        <div>
                          <h3 style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 0.15rem 0' }}>{img.repo}:{img.tag}</h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                            ID: {img.id} • Size: {img.size} • Created: {img.created}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', height: '100%' }}>
                        <div className="card-icon" style={{ cursor: exportProgress ? 'not-allowed' : 'pointer', opacity: exportProgress ? 0.5 : 1, pointerEvents: exportProgress ? 'none' : 'auto' }} onClick={() => exportLocalImage(img)} title="Export to .tar">
                          <Download size={20} />
                        </div>
                        <div className="card-icon" style={{ cursor: 'pointer' }} onClick={() => deleteLocalImage(img)} title="Delete Image">
                          <Trash2 size={20} color="var(--error-color)" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="content-area">
              <h2 className="page-title">Settings</h2>

              <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={20} /> Application Settings</h3>

                <div className="control-group">
                  <label className="control-label">UI Theme</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      className="btn"
                      style={{ background: theme === 'dark' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: theme === 'dark' ? 'white' : 'var(--text-primary)' }}
                      onClick={() => setTheme('dark')}
                    >
                      <Moon size={18} /> Dark
                    </button>
                    <button
                      className="btn"
                      style={{ background: theme === 'light' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: theme === 'light' ? 'white' : 'var(--text-primary)' }}
                      onClick={() => setTheme('light')}
                    >
                      <Sun size={18} /> Light
                    </button>
                  </div>
                </div>

                <div className="control-group" style={{ marginTop: '2rem' }}>
                  <label className="control-label">Default Download Directory</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="text-input"
                      readOnly
                      value={downloadPath || 'Ask every time'}
                      style={{ flex: 1 }}
                    />
                    <button className="btn" style={{ width: 'auto', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={selectDirectory}>
                      <FolderOpen size={18} /> Browse...
                    </button>
                    {downloadPath && (
                      <button className="btn" style={{ width: 'auto', background: 'var(--bg-tertiary)', color: 'var(--error-color)' }} onClick={() => setDownloadPath('')}>
                        <X size={18} /> Clear
                      </button>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    If set, images will be automatically downloaded here without prompting.
                  </p>
                </div>

                <div className="control-group" style={{ marginTop: '2rem' }}>
                  <label className="control-label">About</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn" style={{ width: 'auto', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={async () => {
                      try {
                        // @ts-ignore
                        await window.ipcRenderer.invoke('open-external-link', 'https://github.com/Seongjunghyun/dock-fetch')
                      } catch (e) {
                        console.error("Failed to open external link", e)
                      }
                    }}>
                      <Github size={18} /> View on GitHub
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div >

      {toast && (
        <div className="toast-container">
          <div className="toast">
            <div className={`toast-icon ${toast.type}`} style={{ color: toast.type === 'error' ? 'var(--error-color)' : (toast.type === 'success' ? 'var(--success-color)' : 'var(--text-primary)') }}>
              {toast.type === 'success' && <CheckCircle2 size={24} />}
              {toast.type === 'error' && <X size={24} />}
              {toast.type === 'info' && <Info size={24} />}
            </div>
            <div className="toast-content">
              <h4 className="toast-title">{toast.title}</h4>
              <p className="toast-message">{toast.message}</p>
            </div>
            <button className="toast-close" onClick={() => setToast(null)}>
              <X size={16} />
            </button>
          </div>
        </div>
      )
      }
    </div >
  )
}

export default App

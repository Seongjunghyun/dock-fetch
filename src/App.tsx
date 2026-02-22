import { useState, useEffect, useCallback } from 'react'
import { Search, Download, Star, FolderOpen, Sun, Moon, Settings, Loader2, X, HardDrive, CheckCircle2, ChevronDown, Package, Heart, History, Trash2 } from 'lucide-react'


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

function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'favorites' | 'recent' | 'storage' | 'local' | 'settings'>('search')
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('dockfetch-theme', 'dark')
  const [downloadPath, setDownloadPath] = useLocalStorage<string>('dockfetch-dl-path', '')
  const [favorites, setFavorites] = useLocalStorage<any[]>('dockfetch-favorites', [])
  const [libraryHistory, setLibraryHistory] = useLocalStorage<any[]>('dockfetch-library', [])

  const [fileExistsMap, setFileExistsMap] = useState<Record<string, boolean>>({})

  const defaultTabs = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'recent', label: 'Recent', icon: History },
    { id: 'storage', label: 'Storage', icon: Package },
    { id: 'local', label: 'Local Docker', icon: HardDrive },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]
  const [tabOrder, setTabOrder] = useLocalStorage<string[]>('dockfetch-tab-order', defaultTabs.map(t => t.id))

  const [draggedTab, setDraggedTab] = useState<string | null>(null)

  const handleDragStart = (id: string) => {
    setDraggedTab(id)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault() // Necessary to allow dropping
    if (!draggedTab || draggedTab === targetId) return

    const currentIndex = tabOrder.indexOf(draggedTab)
    const targetIndex = tabOrder.indexOf(targetId)

    const newOrder = [...tabOrder]
    newOrder.splice(currentIndex, 1)
    newOrder.splice(targetIndex, 0, draggedTab)

    setTabOrder(newOrder)
  }

  const handleDrop = () => {
    setDraggedTab(null)
  }

  // Generate ordered tabs for rendering
  const synchronizedTabOrder = Array.from(new Set([...tabOrder, ...defaultTabs.map(t => t.id)]))
  const ordredTabs = Array.from(new Set(synchronizedTabOrder.map(id => id === 'library' ? 'recent' : id)))
    .map(id => defaultTabs.find(t => t.id === id))
    .filter(Boolean) as typeof defaultTabs;

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light')
    } else {
      document.body.classList.remove('light')
    }
  }, [theme])

  const [searchQuery, setSearchQuery] = useState('')
  const [images, setImages] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [selectedImage, setSelectedImage] = useState<any | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [selectedTag, setSelectedTag] = useState('')
  const [platforms, setPlatforms] = useState<any[]>([])
  const [selectedDigest, setSelectedDigest] = useState('')

  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<{ msg: string, percent: number, error?: boolean } | null>(null)
  const [downloadComplete, setDownloadComplete] = useState<string | null>(null)

  const [localImages, setLocalImages] = useState<any[]>([])
  const [isFetchingLocal, setIsFetchingLocal] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ msg: string } | null>(null)

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
    if (!window.confirm(`Are you sure you want to permanently delete this file?\n${filePath}`)) {
      return
    }

    try {
      // @ts-ignore
      const res = await window.ipcRenderer.invoke('delete-file', filePath)
      if (res.success) {
        // Refresh the list
        fetchDirectoryTars()
      } else {
        alert(`Failed to delete file:\n${res.error}`)
      }
    } catch (err: any) {
      console.error(err)
      alert(`Error deleting file: ${err.message}`)
    }
  }

  const fetchLocalImages = async () => {
    setIsFetchingLocal(true)
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.invoke('get-local-images')
      setLocalImages(result || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsFetchingLocal(false)
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
      if (searchQuery.trim().length > 2) {
        performSearch(searchQuery)
      } else if (searchQuery.trim().length === 0) {
        setImages([])
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  // Listen to IPC download progress
  useEffect(() => {
    const handleProgress = (_: any, data: { msg: string, percent: number }) => {
      setDownloadProgress({ msg: data.msg, percent: data.percent })
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
    setDownloadComplete(null)
    setIsFetchingMetadata(true)

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

  const handleRedownload = (entry: any) => {
    const img = { repo_name: entry.repo_name, short_description: 'Redownload image', star_count: 0, pull_count: 0 }
    openImageModal(img, entry.tag)
  }

  const triggerDownload = async (repo: string, tag: string, digest: string) => {
    setDownloadProgress({ msg: 'Starting download...', percent: 0 })
    setDownloadComplete(null)

    try {
      // @ts-ignore
      const filePath = await window.ipcRenderer.invoke('download-image', repo, tag, digest, downloadPath || null)
      if (filePath) {
        setDownloadComplete(filePath)
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
        setDownloadProgress(null)
      }
    } catch (err: any) {
      console.error(err)
      setDownloadProgress({ msg: err.message || 'Error: Download failed. Check network or tag validity.', percent: 0, error: true })
    }
  }

  const handleDownload = async () => {
    if (!selectedImage || !selectedTag || !selectedDigest) return
    triggerDownload(selectedImage.repo_name, selectedTag, selectedDigest)
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

  const openPath = async (path: string) => {
    try {
      // @ts-ignore
      await window.ipcRenderer.invoke('open-path', path)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="app-container">
      <aside className="sidebar glass">
        <div className="sidebar-logo">
          <Package size={28} />
          <span>DockFetch</span>
        </div>

        <nav>
          {ordredTabs.map(tab => (
            <div
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ cursor: 'pointer', opacity: draggedTab === tab.id ? 0.5 : 1 }}
              draggable
              onDragStart={() => handleDragStart(tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDrop={handleDrop}
              onDragEnd={handleDrop}
            >
              <tab.icon size={20} />
              {tab.label}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        {activeTab === 'search' && (
          <>
            <header className="header glass">
              <div className="search-container">
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search Docker Hub... (e.g. nginx, alpine)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </header>

            <div className="content-area">
              <h2 className="page-title">
                {searchQuery.length > 2 ? `Search Results for "${searchQuery}"` : 'Docker registry viewer'}
              </h2>

              {isSearching && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <Loader2 className="spinner" size={18} />
                  Searching registry...
                </div>
              )}

              {!isSearching && images.length === 0 && searchQuery.length > 2 && (
                <div style={{ color: 'var(--text-secondary)' }}>No images found.</div>
              )}

              <div className="image-grid">
                {images.map((img) => (
                  <div
                    key={img.repo_name}
                    className="image-card glass-panel"
                    onClick={() => openImageModal(img)}
                  >
                    <div className="card-header">
                      <div>
                        <h3 className="repo-name">{img.repo_name}</h3>
                        <p className="repo-desc">{img.short_description}</p>
                      </div>
                      <div className="card-icon" onClick={(e) => toggleFavorite(e, img)} style={{ cursor: 'pointer', zIndex: 10 }}>
                        <Heart size={24} fill={isFavorite(img.repo_name) ? 'var(--accent-primary)' : 'transparent'} color={isFavorite(img.repo_name) ? 'var(--accent-primary)' : 'var(--text-primary)'} />
                      </div>
                    </div>

                    <div className="card-stats">
                      <div className="stat-item">
                        <Star size={14} />
                        {formatNumber(img.star_count)}
                      </div>
                      <div className="stat-item">
                        <Download size={14} />
                        {formatNumber(img.pull_count)}
                      </div>
                      {hasAnyDownloadedFile(img.repo_name) && (
                        <div className="stat-item" style={{ marginLeft: 'auto', color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                          <CheckCircle2 size={12} />
                          Local
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'favorites' && (
          <div className="content-area">
            <h2 className="page-title">My Favorites</h2>
            {favorites.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No favorites yet. Search and star some repositories!</p>
            ) : (
              <div className="image-grid" style={{ marginBottom: '3rem' }}>
                {favorites.map((img) => (
                  <div
                    key={img.repo_name}
                    className="image-card glass-panel"
                    onClick={() => openImageModal(img)}
                  >
                    <div className="card-header">
                      <div>
                        <h3 className="repo-name">{img.repo_name}</h3>
                        <p className="repo-desc">{img.short_description}</p>
                      </div>
                      <div className="card-icon" onClick={(e) => toggleFavorite(e, img)} style={{ cursor: 'pointer' }}>
                        <Heart size={24} fill="var(--accent-primary)" color="var(--accent-primary)" />
                      </div>
                    </div>
                    <div className="card-stats">
                      <div className="stat-item">
                        <Star size={14} />
                        {formatNumber(img.star_count)}
                      </div>
                      <div className="stat-item">
                        <Download size={14} />
                        {formatNumber(img.pull_count)}
                      </div>
                      {hasAnyDownloadedFile(img.repo_name) && (
                        <div className="stat-item" style={{ marginLeft: 'auto', color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                          <CheckCircle2 size={12} />
                          Local
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="content-area">
            <h2 className="page-title">Download History</h2>
            {libraryHistory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No downloads yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {libraryHistory.map((entry, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                    <div className="card-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <h3 style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{entry.repo_name}:{entry.tag}</h3>
                          {fileExistsMap[entry.path] ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              Available
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error-color)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                              Missing
                            </span>
                          )}
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(entry.date).toLocaleString()} • {entry.digest?.substring(0, 19)}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7, wordBreak: 'break-all', paddingRight: '2rem' }}>{entry.path}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {fileExistsMap[entry.path] ? (
                          <div
                            className="card-icon"
                            style={{ cursor: 'pointer' }}
                            onClick={() => openPath(entry.path)}
                            title="Open downloaded folder"
                          >
                            <FolderOpen size={20} color="var(--text-primary)" />
                          </div>
                        ) : (
                          <div
                            className="card-icon"
                            style={{ cursor: 'pointer', background: 'var(--accent-primary)' }}
                            onClick={() => handleRedownload(entry)}
                            title="Download again"
                          >
                            <Download size={20} color="white" />
                          </div>
                        )}
                        <div
                          className="card-icon"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setLibraryHistory(libraryHistory.filter((_, i) => i !== idx))}
                          title="Remove record"
                        >
                          <X size={20} color="var(--text-secondary)" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="content-area">
            <h2 className="page-title">Files in Storage</h2>
            {!downloadPath ? (
              <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No default download directory is set.</p>
                <button className="btn" style={{ background: 'var(--accent-primary)', color: 'white', display: 'inline-flex', width: 'auto', padding: '0.5rem 1.5rem' }} onClick={() => setActiveTab('settings')}>
                  Go to Settings
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Showing files in: {downloadPath}</p>
                  <button className="btn" style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={() => openPath(downloadPath)}>
                    <FolderOpen size={16} /> Open Directory
                  </button>
                </div>
                {directoryTars.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No .tar images found in your default download directory.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {directoryTars.map((file, idx) => (
                      <div key={idx} className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Package size={16} color="var(--accent-primary)" />
                            <h3 style={{ fontWeight: 500, fontSize: '0.95rem', margin: 0 }}>{file.name}</h3>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                            {formatNumber(file.size)} Bytes • {new Date(file.modified).toLocaleString()}
                          </p>
                        </div>
                        <div
                          className="card-icon"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleDeleteFile(file.path)}
                          title="Delete file permanently"
                        >
                          <Trash2 size={20} color="var(--error-color)" />
                        </div>
                      </div>
                    ))}
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
              <button className="btn" style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={fetchLocalImages}>
                Refresh
              </button>
            </div>

            {exportProgress && (
              <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 className="spinner" size={16} /> {exportProgress.msg}
              </div>
            )}

            {isFetchingLocal ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <Loader2 className="spinner" size={18} />
                Fetching local images...
              </div>
            ) : localImages.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No local images found or Docker is not running.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {localImages.map((img, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{img.repo}:{img.tag}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>ID: {img.id} • Size: {img.size} • Created: {img.created}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn" disabled={!!exportProgress} style={{ padding: '0.5rem 1rem' }} onClick={() => exportLocalImage(img)}>
                        <Download size={16} /> Export to .tar
                      </button>
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
            </div>
          </div>
        )}
      </main>

      {/* Download Modal */}
      {selectedImage && (
        <div className="modal-overlay" onClick={() => !downloadProgress && setSelectedImage(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="repo-name">{selectedImage.repo_name}</h2>
              {!downloadProgress && (
                <button className="modal-close" onClick={() => setSelectedImage(null)}>
                  <X size={20} />
                </button>
              )}
            </div>

            {isFetchingMetadata ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Loader2 className="spinner" size={24} style={{ margin: '0 auto 1rem auto', display: 'block' }} />
                Fetching tags and architectures...
              </div>
            ) : (
              <>
                <div className="control-group">
                  <label className="control-label">Tag / Version</label>
                  <div className="select-wrapper">
                    <select
                      value={selectedTag}
                      onChange={(e) => handleTagChange(e.target.value, selectedImage.repo_name)}
                      disabled={!!downloadProgress}
                    >
                      {tags.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="select-arrow" size={16} />
                  </div>
                </div>

                <div className="control-group">
                  <label className="control-label">Platform / Architecture</label>
                  <div className="select-wrapper">
                    <select
                      value={selectedDigest}
                      onChange={(e) => setSelectedDigest(e.target.value)}
                      disabled={!!downloadProgress || platforms.length === 0}
                    >
                      {platforms.map(p => (
                        <option key={p.digest} value={p.digest}>
                          {p.os}/{p.architecture} {p.variant ? `(${p.variant})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="select-arrow" size={16} />
                  </div>
                </div>

                {!downloadProgress && !downloadComplete ? (
                  <button className="btn" onClick={handleDownload} disabled={platforms.length === 0}>
                    <Download size={18} />
                    Download Image (.tar)
                  </button>
                ) : downloadComplete ? (
                  <div style={{ textAlign: 'center', color: 'var(--success-color)', padding: '1rem' }}>
                    <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ fontWeight: 500, marginBottom: '1rem' }}>Download Complete!</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Saved to: {downloadComplete}</p>
                    <button className="btn" style={{ marginTop: '1rem', background: 'var(--bg-tertiary)' }} onClick={() => setSelectedImage(null)}>
                      Close
                    </button>
                  </div>
                ) : downloadProgress?.error ? (
                  <div style={{ textAlign: 'center', color: 'var(--error-color)', padding: '1rem' }}>
                    <X size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Download Failed</p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '1rem', wordBreak: 'break-word' }}>{downloadProgress?.msg}</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                      <button className="btn" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={() => setDownloadProgress(null)}>
                        Cancel
                      </button>
                      <button className="btn" style={{ background: 'var(--accent-primary)', color: 'white' }} onClick={handleDownload} disabled={platforms.length === 0}>
                        <Download size={16} /> Retry Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="progress-container">
                    <div className="progress-header">
                      <span>{downloadProgress?.msg}</span>
                      <span>{downloadProgress?.percent}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${downloadProgress?.percent}%` }}></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App

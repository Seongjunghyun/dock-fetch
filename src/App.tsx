import { useState, useEffect, useCallback } from 'react'
import { Search, Download, Star, FolderOpen, Sun, Moon, Settings, Loader2, X, HardDrive, CheckCircle2, ChevronDown, Package, Heart, Trash2, Github, Bell } from 'lucide-react'

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

function formatNumber(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

import './index.css'

const ImageLogo = ({ repoName, size = 24 }: { repoName: string, size?: number }) => {
  const [imgError, setImgError] = useState(false);
  let displayName = repoName.replace(/\.tar$/, '').split('_')[0];
  displayName = displayName.split('/').pop() || displayName;
  displayName = displayName.split(':')[0];

  const iconNameMap: Record<string, string> = {
    'node': 'nodejs', 'postgres': 'postgresql', 'golang': 'go', 'httpd': 'apache',
    'alpine': 'alpinejs', 'nginx': 'nginx', 'redis': 'redis', 'python': 'python',
    'ubuntu': 'ubuntu', 'mysql': 'mysql', 'mongo': 'mongodb', 'mariadb': 'mariadb',
    'php': 'php', 'ruby': 'ruby', 'rust': 'rust', 'java': 'java', 'openjdk': 'java',
    'wordpress': 'wordpress', 'elasticsearch': 'elasticsearch', 'jenkins': 'jenkins',
    'tomcat': 'tomcat', 'grafana': 'grafana', 'prometheus': 'prometheus', 'vault': 'vault'
  };

  const deviconName = iconNameMap[displayName] || displayName;
  const iconUrl = `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${deviconName}/${deviconName}-original.svg`;

  if (!imgError) {
    return (
      <img
        src={iconUrl}
        alt={displayName}
        style={{ width: size, height: size, objectFit: 'contain' }}
        onError={(e) => {
          if (e.currentTarget.src.includes('-original.svg')) {
            e.currentTarget.src = iconUrl.replace('-original.svg', '-plain.svg');
          } else {
            setImgError(true);
          }
        }}
      />
    );
  }
  return <div style={{ width: size, height: size, borderRadius: '4px', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: size * 0.5 }}>{displayName.charAt(0).toUpperCase()}</div>;
}

const DockFetchLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="url(#logo-gradient)" fill="rgba(59, 130, 246, 0.15)" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="url(#logo-gradient)" />
    <line x1="12" y1="22.08" x2="12" y2="12" stroke="url(#logo-gradient)" />
  </svg>
)

const NotificationPanel = ({ logs, isOpen, setIsOpen, clearLogs }: any) => {
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  if (!isOpen) return null;
  const selectedLog = logs.find((l: any) => l.id === selectedLogId);

  return (
    <div className="glass-panel" style={{ position: 'absolute', top: '55px', right: '0', width: '400px', maxHeight: '550px', zIndex: 3000, boxShadow: '0 15px 50px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', animation: 'slideUp 0.2s ease-out', border: '1px solid var(--border-color)' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
        <h3 style={{ fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          {selectedLogId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setSelectedLogId(null)}>
              <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} /> Details
            </div>
          ) : (
            <><Bell size={14} /> Activity Logs</>
          )}
        </h3>
        {!selectedLogId && <button onClick={() => { clearLogs(); setIsOpen(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}>Clear All</button>}
        {selectedLogId && <X size={16} style={{ cursor: 'pointer', opacity: 0.7, color: 'var(--text-primary)' }} onClick={() => setIsOpen(false)} />}
      </div>
      <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem', background: 'var(--bg-primary)' }}>
        {selectedLogId && selectedLog ? (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{selectedLog.time}</span>
              <span style={{ color: selectedLog.type === 'error' ? 'var(--error-color)' : (selectedLog.type === 'success' ? 'var(--success-color)' : 'var(--accent-primary)'), fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>{selectedLog.type}</span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedLog.msg}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', border: '1px solid var(--border-color)' }}>{selectedLog.detail || 'No extra info.'}</div>
            <button className="btn" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', width: 'auto' }} onClick={() => setSelectedLogId(null)}>Back</button>
          </div>
        ) : (
          logs.length === 0 ? <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No recent activity.</div> : 
          logs.map((log: any) => (
            <div key={log.id} onClick={() => setSelectedLogId(log.id)} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', borderLeft: `4px solid ${log.type === 'error' ? 'var(--error-color)' : (log.type === 'success' ? 'var(--success-color)' : (log.type === 'progress' ? 'var(--accent-primary)' : 'var(--bg-tertiary)'))}`, cursor: 'pointer', background: 'var(--bg-secondary)', marginBottom: '0.25rem', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, fontSize: '0.65rem', marginBottom: '0.2rem', color: 'var(--text-secondary)' }}><span>{log.time}</span><span>{log.type}</span></div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>{log.msg} <ChevronDown size={14} style={{ transform: 'rotate(-90deg)', opacity: 0.3 }} /></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const ImageCard = ({
  img, selectedImage, openImageModal, downloadProgress, isFavorite, toggleFavorite, isFetchingMetadata, tags, tagSearch, setTagSearch,
  isTagDropdownOpen, setIsTagDropdownOpen, selectedTag, handleTagChange, platforms, isPlatformDropdownOpen, setIsPlatformDropdownOpen,
  selectedDigest, setSelectedDigest, handleFetchToDocker, handleDownload, handleCancelDownload, dockerLoadProgress, directoryTars,
  libraryHistory, fileExistsMap, localImages, showHistoryControls = false, onRemoveFromHistory
}: any) => {
  const isExpanded = selectedImage?.repo_name === img.repo_name;
  const isLocal = libraryHistory.some((e: any) => e.repo_name === img.repo_name && fileExistsMap[e.path]);
  const dockerExists = localImages.some((l: any) => (l.repo === img.repo_name && l.tag === selectedTag) || (l.repo === 'untagged' && l.id === selectedTag));
  const tarExists = directoryTars.some((t: any) => t.name === `${img.repo_name.replace(/\//g, '_')}_${selectedTag}.tar`);

  return (
    <div className={`image-card glass-panel ${isExpanded ? 'expanded' : ''}`} onClick={() => !isExpanded && !downloadProgress && openImageModal(img)} style={{ cursor: isExpanded ? 'default' : 'pointer', border: isExpanded ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', zIndex: isExpanded ? 50 : 1 }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <ImageLogo repoName={img.repo_name} size={40} />
          <div style={{ minWidth: 0 }}>
            <h3 className="repo-name" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{img.repo_name}</h3>
            <p className="repo-desc" style={{ WebkitLineClamp: isExpanded ? 'unset' : 2, color: 'var(--text-secondary)' }}>{img.short_description}</p>
          </div>
        </div>
        <div className="card-icon" style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', color: 'var(--text-secondary)' }}>
          {showHistoryControls && <X size={18} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onRemoveFromHistory(img.repo_name); }} />}
          <Heart size={18} fill={isFavorite(img.repo_name) ? '#ef4444' : 'transparent'} color={isFavorite(img.repo_name) ? '#ef4444' : 'currentColor'} onClick={(e) => toggleFavorite(e, img)} style={{ cursor: 'pointer' }} />
        </div>
      </div>
      <div className="card-stats" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
        <div className="stat-item" style={{ marginRight: '1rem' }}><Star size={14} /> {formatNumber(img.star_count)}</div>
        <div className="stat-item"><Download size={14} /> {formatNumber(img.pull_count)}</div>
        {isLocal && <div style={{ marginLeft: 'auto', color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}><CheckCircle2 size={12} /> Local</div>}
      </div>
      {isExpanded && (
        <div className="expanded-details" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="control-group" style={{ marginBottom: 0 }}>
              <label className="control-label" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Tag / Version</label>
              <div className="tag-select-container" style={{ position: 'relative' }}>
                <div className="select-wrapper" style={{ height: '44px', position: 'relative' }}>
                  <input type="text" className="text-input" style={{ width: '100%', height: '100%', padding: '0 3rem 0 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 800, boxSizing: 'border-box' }} placeholder={selectedTag || 'Select Tag'} value={tagSearch} onFocus={() => { setIsTagDropdownOpen(true); setTagSearch(''); }} onChange={(e) => setTagSearch(e.target.value)} disabled={!!downloadProgress} />
                  <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--text-primary)' }}>
                    {isFetchingMetadata ? <Loader2 size={16} className="spinner" /> : <Search size={18} />}
                  </div>
                </div>
                {isTagDropdownOpen && (
                  <ul className="custom-dropdown-list" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1000, listStyle: 'none', padding: '0.5rem 0' }}>
                    {tags.filter((t: string) => t.toLowerCase().includes(tagSearch.toLowerCase())).map((t: string) => (
                      <li key={t} style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.9rem', background: selectedTag === t ? 'var(--accent-primary)' : 'transparent', color: selectedTag === t ? 'white' : 'var(--text-primary)' }} onMouseDown={(e) => { e.preventDefault(); handleTagChange(t, img.repo_name); setIsTagDropdownOpen(false); setTagSearch(''); }}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="control-group" style={{ marginBottom: 0 }}>
              <label className="control-label" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Platform</label>
              <div className="platform-select-container" style={{ position: 'relative' }}>
                <div className="select-wrapper" style={{ height: '44px', position: 'relative' }} onClick={() => !downloadProgress && platforms.length > 0 && setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 3rem 0 1rem', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 800, boxSizing: 'border-box' }}>
                    {platforms.length > 0 && selectedDigest ? (platforms.find((p: any) => p.digest === selectedDigest)?.os || 'Select Platform') : 'Select Platform'}
                  </div>
                  <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                </div>
                {isPlatformDropdownOpen && (
                  <ul className="custom-dropdown-list" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', zIndex: 1000, listStyle: 'none', padding: '0.5rem 0' }}>
                    {platforms.map((p: any) => (
                      <li key={p.digest} style={{ padding: '0.6rem 1rem', cursor: 'pointer', background: selectedDigest === p.digest ? 'var(--accent-primary)' : 'transparent', color: selectedDigest === p.digest ? 'white' : 'var(--text-primary)' }} onClick={() => { setSelectedDigest(p.digest); setIsPlatformDropdownOpen(false); }}>{p.os}/{p.architecture}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          {!downloadProgress && !dockerLoadProgress ? (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn" style={{ flex: 1, background: dockerExists ? 'var(--bg-tertiary)' : 'var(--accent-primary)', color: dockerExists ? 'var(--text-secondary)' : 'white' }} onClick={handleFetchToDocker} disabled={platforms.length === 0 || dockerExists}><HardDrive size={16} /> Load</button>
              <button className="btn" style={{ flex: 1, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={handleDownload} disabled={platforms.length === 0 || tarExists}><Download size={16} /> Save</button>
            </div>
          ) : (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                <span>{downloadProgress?.msg || dockerLoadProgress?.msg}</span>
                <X size={14} style={{ cursor: 'pointer' }} onClick={handleCancelDownload} />
              </div>
              <div className="progress-bar-bg" style={{ height: '4px' }}><div className="progress-bar-fill" style={{ width: `${downloadProgress?.percent || 100}%` }}></div></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<'favorites' | 'storage' | 'local' | 'settings'>('favorites')
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('dockfetch-theme', 'dark')
  const [downloadPath, setDownloadPath] = useLocalStorage<string>('dockfetch-dl-path', '')
  const [favorites, setFavorites] = useLocalStorage<any[]>('dockfetch-favorites', [])
  const [libraryHistory, setLibraryHistory] = useLocalStorage<any[]>('dockfetch-library', [])
  const [recentSearches, setRecentSearches] = useLocalStorage<any[]>('dockfetch-recent-searches', [])
  const [logs, setLogs] = useState<any[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [unreadLogs, setUnreadLogs] = useState(0);

  const addLog = (msg: string, type: 'progress' | 'success' | 'error' = 'progress', detail?: string, id?: number) => {
    const logId = id || Date.now();
    setLogs(prev => {
      const idx = prev.findIndex(l => l.id === logId);
      if (idx >= 0) {
        const u = [...prev];
        u[idx] = { ...u[idx], msg, type, detail, time: new Date().toLocaleTimeString() };
        return u;
      }
      if (!isLogOpen) setUnreadLogs(c => c + 1);
      return [{ id: logId, time: new Date().toLocaleTimeString(), msg, type, detail }, ...prev].slice(0, 50);
    });
    return logId;
  };

  const [images, setImages] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [selectedDigest, setSelectedDigest] = useState('');
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<any>(null);
  const [dockerLoadProgress, setDockerLoadProgress] = useState<any>(null);
  const [localImages, setLocalImages] = useState<any[]>([]);
  const [directoryTars, setDirectoryTars] = useState<any[]>([]);
  const [fileExistsMap] = useState<Record<string, boolean>>({});
  const [tagSearch, setTagSearch] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const [storageSearchQuery, setStorageSearchQuery] = useState('');
  const [localDockerSearchQuery, setLocalDockerSearchQuery] = useState('');
  const [selectedStorageFiles, setSelectedStorageFiles] = useState<string[]>([]);
  const [selectedLocalImages, setSelectedLocalImages] = useState<string[]>([]);

  useEffect(() => { document.body.className = theme; fetchLocalImages(); }, [theme]);

  // Tab switch cleanup
  useEffect(() => {
    setSelectedImage(null); setIsTagDropdownOpen(false); setIsPlatformDropdownOpen(false);
    setTagSearch(''); setDownloadProgress(null); setDockerLoadProgress(null);
    if (activeTab === 'local') fetchLocalImages();
  }, [activeTab]);

  const fetchLocalImages = async () => {
    try {
      // @ts-ignore
      const res = await window.ipcRenderer.invoke('get-local-images');
      setLocalImages(res || []);
    } catch (e) {}
  };

  const fetchDirectoryTars = useCallback(async () => {
    if (!downloadPath) return;
    // @ts-ignore
    const tars = await window.ipcRenderer.invoke('get-directory-tars', downloadPath);
    setDirectoryTars(tars || []);
  }, [downloadPath]);

  useEffect(() => { if (activeTab === 'storage') fetchDirectoryTars(); }, [activeTab, fetchDirectoryTars]);

  const handleDeleteFile = async (filePath: string) => {
    const fileName = filePath.split(/[/\\]/).pop();
    const logId = addLog(`Deleting file: ${fileName}`, 'progress');
    try {
      // @ts-ignore
      const res = await window.ipcRenderer.invoke('delete-file', filePath);
      if (res?.success) { addLog(`Deleted: ${fileName}`, 'success', `Removed from disk.`, logId); fetchDirectoryTars(); }
      else { addLog(`Failed to delete: ${fileName}`, 'error', res?.error, logId); }
    } catch (e: any) { addLog(`Error deleting: ${fileName}`, 'error', e.message, logId); }
  };

  const handleDownload = async () => {
    if (!selectedImage || !selectedTag || !selectedDigest) return;
    const name = `${selectedImage.repo_name}:${selectedTag}`;
    const logId = addLog(`Downloading ${name}...`, 'progress');
    setDownloadProgress({ msg: 'Downloading...', percent: 0 });
    try {
      // @ts-ignore
      const path = await window.ipcRenderer.invoke('download-image', selectedImage.repo_name, selectedTag, selectedDigest, downloadPath);
      if (path) {
        addLog(`Download success: ${name}`, 'success', `Saved to: ${path}`, logId);
        setLibraryHistory([{ repo_name: selectedImage.repo_name, tag: selectedTag, digest: selectedDigest, path, date: new Date().toISOString() }, ...libraryHistory]);
      }
    } catch (e: any) { addLog(`Download failed: ${name}`, 'error', e.message, logId);
    } finally { setDownloadProgress(null); }
  };

  const handleFetchToDocker = async () => {
    if (!selectedImage || !selectedTag || !selectedDigest) return;
    const name = `${selectedImage.repo_name}:${selectedTag}`;
    const logId = addLog(`Loading ${name} to Docker...`, 'progress');
    setDockerLoadProgress({ msg: 'Loading to Docker...', percent: 100 });
    try {
      // @ts-ignore
      const res = await window.ipcRenderer.invoke('fetch-to-local-docker', selectedImage.repo_name, selectedTag, selectedDigest);
      if (res?.success) { addLog(`Loaded to Docker: ${name}`, 'success', res.output, logId); fetchLocalImages(); }
      else { addLog(`Failed to load ${name}`, 'error', 'Command execution failed.', logId); }
    } catch (e: any) { addLog(`Failed to load: ${name}`, 'error', e.message, logId);
    } finally { setDockerLoadProgress(null); }
  };

  const exportLocalImage = async (img: any) => {
    const name = `${img.repo}:${img.tag}`;
    const logId = addLog(`Exporting ${name}...`, 'progress');
    try {
      // @ts-ignore
      const path = await window.ipcRenderer.invoke('save-local-image', img.repo, img.tag, img.id, downloadPath);
      if (path) addLog(`Export complete: ${name}`, 'success', `File: ${path}`, logId);
      else addLog(`Export cancelled: ${name}`, 'error', 'Action cancelled or directory error.', logId);
    } catch (e: any) { addLog(`Export failed: ${name}`, 'error', e.message, logId); }
  };

  const deleteLocalImage = async (img: any) => {
    const ref = (img.repo === '<none>' || img.tag === '<none>') ? img.id : `${img.repo}:${img.tag}`;
    const logId = addLog(`Deleting image: ${ref}`, 'progress');
    // @ts-ignore
    const res = await window.ipcRenderer.invoke('delete-local-image', ref);
    if (res?.success) { addLog(`Deleted image: ${ref}`, 'success', 'Successfully removed.', logId); fetchLocalImages(); }
    else addLog(`Delete failed: ${ref}`, 'error', res?.error, logId);
  };

  useEffect(() => {
    if (searchQuery.length > 1) {
      const fn = setTimeout(() => {
        setIsSearching(true);
        // @ts-ignore
        window.ipcRenderer.invoke('search-images', searchQuery).then(r => { setImages(r || []); setIsSearching(false); });
      }, 300);
      return () => clearTimeout(fn);
    } else { setImages([]); setSelectedImage(null); }
  }, [searchQuery]);

  const openImageModal = async (img: any) => {
    setSelectedImage(img); setTags([]); setPlatforms([]); setIsFetchingMetadata(true);
    if (!recentSearches.some((r: any) => r.repo_name === img.repo_name)) setRecentSearches([img, ...recentSearches].slice(0, 10));
    try {
      // @ts-ignore
      const t = await window.ipcRenderer.invoke('get-tags', img.repo_name);
      setTags(t || []);
      const def = t.includes('latest') ? 'latest' : t[0];
      if (def) handleTagChange(def, img.repo_name);
    } catch (e) {} finally { setIsFetchingMetadata(false); }
  };

  const handleTagChange = async (tag: string, repo: string) => {
    setSelectedTag(tag); setPlatforms([]); setIsFetchingMetadata(true);
    try {
      // @ts-ignore
      const p = await window.ipcRenderer.invoke('get-platforms', repo, tag);
      setPlatforms(p || []);
      if (p?.length) setSelectedDigest(p[0].digest);
    } catch (e) {} finally { setIsFetchingMetadata(false); }
  };

  const commonProps = {
    selectedImage, setSelectedImage, openImageModal, downloadProgress, isFavorite: (n: string) => !!favorites.find((f: any) => f.repo_name === n),
    toggleFavorite: (e: any, img: any) => { e.stopPropagation(); const is = favorites.find((f: any) => f.repo_name === img.repo_name); setFavorites(is ? favorites.filter((f: any) => f.repo_name !== img.repo_name) : [...favorites, img]); },
    isFetchingMetadata, tags, tagSearch, setTagSearch, isTagDropdownOpen, setIsTagDropdownOpen, selectedTag, handleTagChange, platforms,
    isPlatformDropdownOpen, setIsPlatformDropdownOpen, selectedDigest, setSelectedDigest, handleFetchToDocker, handleDownload,
    handleCancelDownload: () => { setDownloadProgress(null); setDockerLoadProgress(null); }, dockerLoadProgress, directoryTars, libraryHistory, fileExistsMap, localImages
  };

  return (
    <div className="app-container">
      <div className="main-wrapper">
        <aside className="sidebar glass">
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem', fontWeight: 800, marginBottom: '2.5rem', color: 'var(--text-primary)' }}>
            <DockFetchLogo size={32} /> <span>DockFetch</span>
          </div>
          <nav>
            {[ { id: 'favorites', label: 'Favorites', icon: Star }, { id: 'storage', label: 'Storage', icon: Package }, { id: 'local', label: 'Local Docker', icon: HardDrive }, { id: 'settings', label: 'Settings', icon: Settings } ].map(tab => (
              <div key={tab.id} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); setIsSearchFocused(false); }}><tab.icon size={20} /> {tab.label}</div>
            ))}
          </nav>
          <div style={{ marginTop: 'auto', padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>v0.6.0</div>
        </aside>
        <main className="main-content">
          <div style={{ position: 'sticky', top: 0, zIndex: 1000, padding: '1rem 2rem', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <div className="search-container" style={{ flex: 1, margin: 0, maxWidth: 'none' }}><Search className="search-icon" size={18} /><input type="text" className="search-input" style={{ width: '100%', color: 'var(--text-primary)' }} placeholder="Search Docker Hub..." value={searchQuery} onFocus={() => { setIsSearchFocused(true); setSelectedImage(null); }} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setIsLogOpen(!isLogOpen); setUnreadLogs(0); }} style={{ background: 'none', border: 'none', color: isLogOpen ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '0.5rem' }}><Bell size={22} />{unreadLogs > 0 && <span style={{ position: 'absolute', top: '0', right: '0', width: '16px', height: '16px', background: 'var(--error-color)', borderRadius: '50%', color: 'white', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>{unreadLogs}</span>}</button>
              <NotificationPanel logs={logs} isOpen={isLogOpen} setIsOpen={setIsLogOpen} clearLogs={() => setLogs([])} />
            </div>
          </div>
          <div style={{ display: 'contents' }}>
            {(searchQuery.length > 0 || isSearchFocused) && (
              <div className="search-results-overlay" style={{ zIndex: 500 }}><div className="content-area">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{searchQuery.length > 1 ? `Results for "${searchQuery}"` : 'Recent Searches'}</h2>
                    {isSearching && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}><Loader2 className="spinner" size={16} /> Searching...</div>}
                  </div>
                  <button onClick={() => { setSearchQuery(''); setIsSearchFocused(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>Close</button>
                </div>
                <div className="image-grid">{ ((searchQuery.length > 1 && images.length > 0) ? images : (searchQuery.length === 0 ? recentSearches : [])).map(img => <ImageCard key={img.repo_name} img={img} {...commonProps} showHistoryControls={searchQuery.length === 0} onRemoveFromHistory={(repo: string) => setRecentSearches(recentSearches.filter((r: any) => r.repo_name !== repo))} />) }</div>
              </div></div>
            )}
          </div>
          {activeTab === 'favorites' && <div className="content-area"><h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>My Favorites</h2><div className="image-grid">{favorites.map(img => <ImageCard key={img.repo_name} img={img} {...commonProps} />)}</div></div>}
          {activeTab === 'storage' && (
            <div className="content-area">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}><h2 style={{ color: 'var(--text-primary)' }}>Files in Storage</h2>{downloadPath && <button className="btn" style={{ width: 'auto', background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', color: 'var(--text-primary)' }} onClick={() => window.ipcRenderer.invoke('open-path', downloadPath)}><FolderOpen size={16} /> Open Folder</button>}</div>
              {downloadPath ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}><input type="checkbox" checked={directoryTars.length > 0 && selectedStorageFiles.length === directoryTars.length} onChange={(e) => setSelectedStorageFiles(e.target.checked ? directoryTars.map(f => f.path) : [])} /> Select All</label>
                    {selectedStorageFiles.length > 0 && <div style={{ display: 'flex', gap: '1rem' }}><button style={{ background: 'none', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={async () => { const bid = addLog(`Batch loading ${selectedStorageFiles.length} files...`, 'progress'); try { for (const p of selectedStorageFiles) await window.ipcRenderer.invoke('load-local-image', p); setSelectedStorageFiles([]); fetchLocalImages(); addLog(`Batch loaded ${selectedStorageFiles.length} files`, 'success', 'All images imported successfully', bid); } catch(e:any) { addLog('Batch load failed', 'error', e.message, bid); } }}><HardDrive size={14} /> Load</button><button style={{ background: 'none', color: 'var(--error-color)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={async () => { const bid = addLog(`Batch deleting ${selectedStorageFiles.length} files...`, 'progress'); try { for (const p of selectedStorageFiles) await window.ipcRenderer.invoke('delete-file', p); setSelectedStorageFiles([]); fetchDirectoryTars(); addLog(`Batch deleted ${selectedStorageFiles.length} files`, 'success', 'Files removed from disk', bid); } catch(e:any) { addLog('Batch delete failed', 'error', e.message, bid); } }}><Trash2 size={14} /> Delete</button></div>}
                    <div className="search-container" style={{ width: '250px', background: 'transparent', margin: 0 }}><Search className="search-icon" size={16} /><input type="text" className="search-input" style={{ height: '36px', fontSize: '0.85rem', color: 'var(--text-primary)' }} value={storageSearchQuery} onChange={(e) => setStorageSearchQuery(e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{directoryTars.filter(f => f.name.toLowerCase().includes(storageSearchQuery.toLowerCase())).map((file, idx) => (
                    <div key={idx} className="glass-panel" style={{ padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: selectedStorageFiles.includes(file.path) ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', borderRadius: '8px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><input type="checkbox" checked={selectedStorageFiles.includes(file.path)} onChange={(e) => setSelectedStorageFiles(e.target.checked ? [...selectedStorageFiles, file.path] : selectedStorageFiles.filter(p => p !== file.path))} /><ImageLogo repoName={file.name} size={24} /><div><div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{file.name}</div><div style={{ fontSize: '0.8rem', opacity: 0.5, color: 'var(--text-secondary)' }}>{formatNumber(file.size)} Bytes</div></div></div><Trash2 size={18} style={{ cursor: 'pointer', color: 'var(--error-color)', opacity: 0.7 }} onClick={() => handleDeleteFile(file.path)} /></div>
                  ))}</div>
                </div>
              ) : <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Download directory not set.</p><button className="btn" style={{ width: 'auto' }} onClick={() => setActiveTab('settings')}>Go to Settings</button></div>}
            </div>
          )}
          {activeTab === 'local' && (
            <div className="content-area">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}><h2 style={{ color: 'var(--text-primary)' }}>Local Docker Images</h2><button className="btn" style={{ width: 'auto', background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', color: 'var(--text-primary)' }} onClick={() => fetchLocalImages()}>Refresh</button></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}><input type="checkbox" checked={localImages.length > 0 && selectedLocalImages.length === localImages.length} onChange={(e) => setSelectedLocalImages(e.target.checked ? localImages.map(i => i.id) : [])} /> Select All</label>
                {selectedLocalImages.length > 0 && <div style={{ display: 'flex', gap: '1rem' }}><button style={{ background: 'none', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={async () => { const bid = addLog(`Batch exporting ${selectedLocalImages.length} images...`, 'progress'); try { for (const id of selectedLocalImages) { const im = localImages.find(i => i.id === id); await window.ipcRenderer.invoke('save-local-image', im.repo, im.tag, im.id, downloadPath); } setSelectedLocalImages([]); addLog(`Batch exported ${selectedLocalImages.length} images`, 'success', 'All images saved to storage', bid); } catch(e:any) { addLog('Batch export failed', 'error', e.message, bid); } }}><Download size={14} /> Export</button><button style={{ background: 'none', color: 'var(--error-color)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={async () => { const bid = addLog(`Batch deleting ${selectedLocalImages.length} images...`, 'progress'); try { for (const id of selectedLocalImages) await window.ipcRenderer.invoke('delete-local-image', id); setSelectedLocalImages([]); fetchLocalImages(); addLog(`Batch deleted ${selectedLocalImages.length} images`, 'success', 'Images removed from docker daemon', bid); } catch(e:any) { addLog('Batch delete failed', 'error', e.message, bid); } }}><Trash2 size={14} /> Delete</button></div>}
                <div className="search-container" style={{ width: '250px', background: 'transparent', margin: 0 }}><Search className="search-icon" size={16} /><input type="text" className="search-input" style={{ height: '36px', fontSize: '0.85rem', color: 'var(--text-primary)' }} value={localDockerSearchQuery} onChange={(e) => setLocalDockerSearchQuery(e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{localImages.filter(img => `${img.repo}:${img.tag}`.toLowerCase().includes(localDockerSearchQuery.toLowerCase())).map((img, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: selectedLocalImages.includes(img.id) ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', borderRadius: '8px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><input type="checkbox" checked={selectedLocalImages.includes(img.id)} onChange={(e) => setSelectedLocalImages(e.target.checked ? [...selectedLocalImages, img.id] : selectedLocalImages.filter(p => p !== img.id))} /><ImageLogo repoName={img.repo} size={24} /><div><div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{img.repo}:{img.tag}</div><div style={{ fontSize: '0.8rem', opacity: 0.5, color: 'var(--text-secondary)' }}>{img.id.substring(0, 12)} • {img.size}</div></div></div><div style={{ display: 'flex', gap: '1rem' }}><Download size={18} style={{ cursor: 'pointer', opacity: 0.7, color: 'var(--text-primary)' }} onClick={() => exportLocalImage(img)} /><Trash2 size={18} style={{ cursor: 'pointer', color: 'var(--error-color)', opacity: 0.7 }} onClick={() => deleteLocalImage(img)} /></div></div>
              ))}</div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="content-area"><h2 style={{ color: 'var(--text-primary)' }}>Settings</h2><div className="glass-panel" style={{ padding: '2rem' }}>
              <div className="control-group"><label className="control-label">UI Theme</label><div style={{ display: 'flex', gap: '1rem' }}><button className="btn" onClick={() => setTheme('dark')} style={{ background: theme === 'dark' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: theme === 'dark' ? 'white' : 'var(--text-primary)', width: 'auto', padding: '0.5rem 1.5rem' }}><Moon size={18} /> Dark</button><button className="btn" onClick={() => setTheme('light')} style={{ background: theme === 'light' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: theme === 'light' ? 'white' : 'var(--text-primary)', width: 'auto', padding: '0.5rem 1.5rem' }}><Sun size={18} /> Light</button></div></div>
              <div className="control-group" style={{ marginTop: '2rem' }}><label className="control-label">Default Download Directory</label><div style={{ display: 'flex', gap: '1rem' }}><input type="text" className="text-input" readOnly value={downloadPath || 'Ask every time'} style={{ flex: 1, color: 'var(--text-primary)' }} /><button className="btn" style={{ width: 'auto', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={async () => { const d = await window.ipcRenderer.invoke('select-directory'); if (d) setDownloadPath(d); }}>Browse</button>{downloadPath && <button className="btn" style={{ width: 'auto', background: 'var(--bg-tertiary)', color: 'var(--error-color)' }} onClick={() => setDownloadPath('')}><X size={18} /></button>}</div></div>
              <div className="control-group" style={{ marginTop: '2rem' }}><label className="control-label">About</label><button className="btn" style={{ width: 'auto', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={() => window.ipcRenderer.invoke('open-external-link', 'https://github.com/Seongjunghyun/dock-fetch')}><Github size={18} /> GitHub Repository</button></div>
            </div></div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App

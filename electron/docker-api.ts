import axios from 'axios';
import fs from 'node:fs';
import tar from 'tar-stream';

const HUB_API = 'https://hub.docker.com/v2';

export interface ImageSearchResult {
    repo_name: string;
    short_description: string;
    star_count: number;
    pull_count: number;
}

export async function searchImages(query: string): Promise<ImageSearchResult[]> {
    // 1. Always try Docker Hub search
    let hubResults: ImageSearchResult[] = [];
    try {
        const res = await axios.get(`${HUB_API}/search/repositories/`, {
            params: { query },
        });
        hubResults = res.data.results;
    } catch (error) {
        console.error('Failed to search Docker Hub:', error);
    }

    // 2. If the query looks like a specific GHCR/Custom registry path, or no results in Hub
    // We add a synthetic result for direct registry links
    // e.g. ghcr.io/modsetter/surfsense-backend
    const parts = query.split('/');
    const hasRegistry = parts.length >= 2 && parts[0].includes('.');
    const hasPathAfterRegistry = parts.slice(1).join('/').length >= 2;

    if (hasRegistry && hasPathAfterRegistry) {
        const isAlreadyInHub = hubResults.some(r => r.repo_name === query);
        if (!isAlreadyInHub) {
            hubResults.unshift({
                repo_name: query,
                short_description: `Direct registry image: ${query}`,
                star_count: 0,
                pull_count: 0
            });
        }
    }

    return hubResults;
}

function getRegistryInfo(repo: string) {
    if (repo.startsWith('ghcr.io/')) {
        return {
            registry: 'https://ghcr.io',
            authUrl: 'https://ghcr.io/token',
            service: 'ghcr.io',
            repository: repo.replace('ghcr.io/', '')
        };
    }
    // Default to Docker Hub
    return {
        registry: 'https://registry-1.docker.io',
        authUrl: 'https://auth.docker.io/token',
        service: 'registry.docker.io',
        repository: repo.includes('/') ? repo : `library/${repo}`
    };
}

export async function getAuthToken(repo: string): Promise<string> {
    const info = getRegistryInfo(repo);
    try {
        const res = await axios.get(info.authUrl, {
            params: {
                service: info.service,
                scope: `repository:${info.repository}:pull`,
            },
        });
        return res.data.token;
    } catch (error) {
        console.error(`Failed to get auth token for ${repo}:`, error);
        // GHCR and some others allow public pull without token or with anonymous token
        return '';
    }
}

export async function getTags(repo: string, token: string): Promise<string[]> {
    const info = getRegistryInfo(repo);

    // If it's Docker Hub, try Hub API first for better sorting
    if (info.service === 'registry.docker.io') {
        try {
            const hubRes = await axios.get(`${HUB_API}/repositories/${info.repository}/tags/`, {
                params: { page_size: 100, ordering: 'last_updated' }
            });
            if (hubRes.data && hubRes.data.results) {
                return hubRes.data.results.map((t: any) => t.name);
            }
        } catch (e: any) {
            console.warn(`Docker Hub API tags fetch failed: ${e.message}. Falling back to Registry API...`);
        }
    }

    // Generic V2 Registry API
    try {
        const res = await axios.get(`${info.registry}/v2/${info.repository}/tags/list`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return res.data.tags || [];
    } catch (error) {
        console.error(`Failed to get tags for ${repo}:`, error);
        // For some GHCR images, they might require specific headers or are "hidden"
        return ['latest']; // Fallback
    }
}

export async function getManifest(repo: string, tagOrDigest: string, token: string) {
    const info = getRegistryInfo(repo);
    try {
        const res = await axios.get(`${info.registry}/v2/${info.repository}/manifests/${tagOrDigest}`, {
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                Accept: 'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json',
            },
        });
        return { data: res.data, headers: res.headers };
    } catch (error) {
        console.error(`Failed to get manifest for ${repo}:${tagOrDigest}:`, error);
        throw error;
    }
}

export async function getAvailablePlatforms(repo: string, tag: string) {
    try {
        const token = await getAuthToken(repo);
        const manifestRes = await getManifest(repo, tag, token);
        const manifest = manifestRes.data;

        // Handle single manifest (no manifests list)
        if (!manifest.manifests) {
            return [{ 
                os: manifest.platform?.os || 'linux', 
                architecture: manifest.platform?.architecture || 'amd64', 
                variant: manifest.platform?.variant || '', 
                digest: manifestRes.headers['docker-content-digest'] || '' 
            }];
        }

        return manifest.manifests.map((m: any) => ({
            os: m.platform.os,
            architecture: m.platform.architecture,
            variant: m.platform.variant || '',
            digest: m.digest
        }));
    } catch (err) {
        console.error('Failed to get platforms:', err);
        return [];
    }
}

export async function downloadImageAsTar(
    repo: string,
    tag: string,
    digest: string,
    token: string,
    outputPath: string,
    onProgress: (msg: string, percent: number) => void,
    signal?: AbortSignal
) {
    const info = getRegistryInfo(repo);
    
    onProgress('Fetching manifest...', 0);
    const targetManifestRes = await getManifest(repo, digest || tag, token);
    const manifest = targetManifestRes.data;

    // If it's an OCI index or manifest list, we should have the specific digest already
    // but if not, we take the first one or the whole thing if it's a single manifest
    const layers = manifest.layers || [];
    const configDigest = manifest.config?.digest;
    
    if (!configDigest) {
        throw new Error('Could not find image config in manifest');
    }

    const totalSteps = layers.length + 3; 
    let step = 0;

    const pack = tar.pack();
    const writeStream = fs.createWriteStream(outputPath);
    pack.pipe(writeStream);

    // 1. Download Config
    step++;
    onProgress(`Downloading config...`, Math.round((step / totalSteps) * 100));

    const configRes = await axios.get(`${info.registry}/v2/${info.repository}/blobs/${configDigest}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'arraybuffer',
        signal
    });

    const configContent = Buffer.from(configRes.data);
    const configFilename = `${configDigest.split(':')[1]}.json`;
    pack.entry({ name: configFilename }, configContent);

    // 2. Download Layers
    const layerPaths: string[] = [];

    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        step++;
        
        const layerRes = await axios.get(`${info.registry}/v2/${info.repository}/blobs/${layer.digest}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            responseType: 'stream',
            signal
        });

        const layerDir = layer.digest.split(':')[1];
        const layerFilename = `${layerDir}/layer.tar`;
        layerPaths.push(layerFilename);

        pack.entry({ name: `${layerDir}/VERSION` }, '1.0');
        const layerJson = {
            id: layerDir,
            parent: i > 0 ? layers[i - 1].digest.split(':')[1] : undefined
        };
        pack.entry({ name: `${layerDir}/json` }, JSON.stringify(layerJson));

        const totalLayerSize = parseInt(layerRes.headers['content-length'] || layer.size, 10);
        let downloadedLayer = 0;

        layerRes.data.on('data', (chunk: Buffer) => {
            downloadedLayer += chunk.length;
            const basePct = (step / totalSteps) * 100;
            const chunkPct = (downloadedLayer / totalLayerSize) * (100 / totalSteps);
            const mbDownloaded = (downloadedLayer / 1024 / 1024).toFixed(1);
            const mbTotal = (totalLayerSize / 1024 / 1024).toFixed(1);
            onProgress(`Layer ${i + 1}/${layers.length}: ${mbDownloaded}MB / ${mbTotal}MB`, Math.min(99, basePct + chunkPct));
        });

        await new Promise<void>((resolve, reject) => {
            const entryStream = pack.entry({ name: layerFilename, size: layer.size }, (err: Error | null | undefined) => {
                if (err) reject(err);
                else resolve();
            });
            layerRes.data.pipe(entryStream);
        });
    }

    // 3. Create manifest.json
    step++;
    onProgress('Building archive...', Math.round((step / totalSteps) * 100));

    const manifestJson = [{
        Config: configFilename,
        RepoTags: [`${repo}:${tag}`],
        Layers: layerPaths
    }];
    pack.entry({ name: 'manifest.json' }, JSON.stringify(manifestJson));

    // 4. Create repositories file
    const repositoriesJson = {
        [repo]: {
            [tag]: layerPaths[layerPaths.length - 1].split('/')[0]
        }
    };
    pack.entry({ name: 'repositories' }, JSON.stringify(repositoriesJson));

    pack.finalize();

    return new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
    });
}

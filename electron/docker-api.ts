import axios from 'axios';
import fs from 'node:fs';
import tar from 'tar-stream';

const HUB_API = 'https://hub.docker.com/v2';
const REGISTRY_URL = 'https://registry-1.docker.io/v2';
const AUTH_URL = 'https://auth.docker.io/token';

export interface ImageSearchResult {
    repo_name: string;
    short_description: string;
    star_count: number;
    pull_count: number;
}

export async function searchImages(query: string): Promise<ImageSearchResult[]> {
    try {
        const res = await axios.get(`${HUB_API}/search/repositories/`, {
            params: { query },
        });
        return res.data.results;
    } catch (error) {
        console.error('Failed to search images:', error);
        return [];
    }
}

export async function getAuthToken(repo: string): Promise<string> {
    const repository = repo.includes('/') ? repo : `library/${repo}`;
    try {
        const res = await axios.get(AUTH_URL, {
            params: {
                service: 'registry.docker.io',
                scope: `repository:${repository}:pull`,
            },
        });
        return res.data.token;
    } catch (error) {
        console.error(`Failed to get auth token for ${repository}:`, error);
        throw error;
    }
}

export async function getTags(repo: string, token: string): Promise<string[]> {
    const repository = repo.includes('/') ? repo : `library/${repo}`;
    try {
        const res = await axios.get(`${REGISTRY_URL}/${repository}/tags/list`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data.tags || [];
    } catch (error) {
        console.error(`Failed to get tags for ${repository}:`, error);
        return [];
    }
}

export async function getManifest(repo: string, tagOrDigest: string, token: string) {
    const repository = repo.includes('/') ? repo : `library/${repo}`;
    try {
        const res = await axios.get(`${REGISTRY_URL}/${repository}/manifests/${tagOrDigest}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json',
            },
        });
        return { data: res.data, headers: res.headers };
    } catch (error) {
        console.error(`Failed to get manifest for ${repository}:${tagOrDigest}:`, error);
        throw error;
    }
}

export async function getAvailablePlatforms(repo: string, tag: string) {
    try {
        const token = await getAuthToken(repo);
        const manifestRes = await getManifest(repo, tag, token);
        const manifests = manifestRes.data.manifests;

        if (!manifests) {
            return [{ os: 'linux', architecture: 'amd64', variant: '', digest: manifestRes.headers['docker-content-digest'] || '' }];
        }

        return manifests.map((m: any) => ({
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
    const repository = repo.includes('/') ? repo : `library/${repo}`;

    onProgress('Fetching architecture-specific manifest...', 0);
    const targetManifestRes = await getManifest(repo, digest || tag, token);
    const manifest = targetManifestRes.data;

    const configDigest = manifest.config.digest;
    const layers = manifest.layers;
    const totalSteps = layers.length + 3; // + config, + manifest, + write
    let step = 0;

    const pack = tar.pack();
    const writeStream = fs.createWriteStream(outputPath);
    pack.pipe(writeStream);

    // 1. Download Config
    step++;
    onProgress(`Downloading image config (${configDigest.substring(7, 19)})...`, Math.round((step / totalSteps) * 100));

    const configRes = await axios.get(`${REGISTRY_URL}/${repository}/blobs/${configDigest}`, {
        headers: { Authorization: `Bearer ${token}` },
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
        const layerRes = await axios.get(`${REGISTRY_URL}/${repository}/blobs/${layer.digest}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'stream',
            signal
        });

        const layerDir = layer.digest.split(':')[1];
        const layerFilename = `${layerDir}/layer.tar`;
        layerPaths.push(layerFilename);

        // Add VERSION file for each layer
        pack.entry({ name: `${layerDir}/VERSION` }, '1.0');
        // Add json metadata for each layer
        const layerJson = {
            id: layerDir,
            parent: i > 0 ? layers[i - 1].digest.split(':')[1] : undefined
        };
        pack.entry({ name: `${layerDir}/json` }, JSON.stringify(layerJson));

        // Add the actual layer blob data
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
            [tag]: layerPaths[layerPaths.length - 1].split('/')[0] // last layer ID
        }
    };
    pack.entry({ name: 'repositories' }, JSON.stringify(repositoriesJson));

    pack.finalize();

    return new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
    });
}

import type { SupabaseClient } from '@supabase/supabase-js';

type StorageRef = {
  bucket: string;
  path: string;
};

export function parseStorageRefFromUrl(url: string): StorageRef | null {
  if (!url) return null;

  // Matches /storage/v1/object/public/<bucket>/<path>
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (publicMatch) {
    return {
      bucket: publicMatch[1],
      path: decodeURIComponent(publicMatch[2])
    };
  }

  // Matches /storage/v1/object/sign/<bucket>/<path>?token=...
  const signMatch = url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/);
  if (signMatch) {
    return {
      bucket: signMatch[1],
      path: decodeURIComponent(signMatch[2])
    };
  }

  return null;
}

export async function createSignedUrlWithFallback(
  supabase: SupabaseClient,
  options: {
    sourceUrl?: string | null;
    defaultBucket: string;
    fallbackPath?: string | null;
    expiresIn?: number;
  }
): Promise<string | null> {
  const envTtl = Number(process.env.INVOICE_SIGNED_URL_TTL_SECONDS || '');
  const ttlFromEnv = Number.isFinite(envTtl) && envTtl > 0 ? envTtl : null;
  const rawExpiresIn = options.expiresIn ?? ttlFromEnv ?? 86400;
  const expiresIn = Math.min(Math.max(Math.floor(rawExpiresIn), 60), 604800);
  const sourceRef = options.sourceUrl ? parseStorageRefFromUrl(options.sourceUrl) : null;

  const attempts: StorageRef[] = [];
  if (sourceRef) attempts.push(sourceRef);
  if (sourceRef && sourceRef.bucket !== options.defaultBucket) {
    attempts.push({ bucket: options.defaultBucket, path: sourceRef.path });
  }
  if (options.fallbackPath) {
    attempts.push({ bucket: options.defaultBucket, path: options.fallbackPath });
  }

  for (const ref of attempts) {
    const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, expiresIn);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  return null;
}

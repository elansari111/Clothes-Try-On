import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export interface EnvConfig {
  genlookApiKey: string;
  genlookBaseUrl: string;
}

const DEFAULT_GENLOOK_BASE_URL = 'https://api.genlook.app/tryon/v1';

/**
 * Parses .env file safely inside the Electron main process without exposing secrets to the renderer.
 */
function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result: Record<string, string> = {};
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key) result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}

export function loadMainEnvConfig(): EnvConfig {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(app.getAppPath(), '.env'),
    path.join(path.dirname(app.getPath('exe')), '.env'),
  ];

  let fileEnv: Record<string, string> = {};
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      fileEnv = parseEnvFile(candidate);
      break;
    }
  }

  const apiKey = (process.env.GENLOOK_API_KEY || fileEnv.GENLOOK_API_KEY || '').trim();
  const rawEndpoint = (process.env.GENLOOK_API_ENDPOINT || fileEnv.GENLOOK_API_ENDPOINT || '').trim();

  // Normalize legacy placeholder domain from older .env.example to the official Genlook API base URL
  const genlookBaseUrl =
    !rawEndpoint || rawEndpoint === 'https://api.genlook.ai/v1'
      ? DEFAULT_GENLOOK_BASE_URL
      : rawEndpoint;

  return {
    genlookApiKey: apiKey,
    genlookBaseUrl,
  };
}

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

export function resolveDevBin() {
  return process.env.AI_DEVKIT_BIN ? resolve(process.env.AI_DEVKIT_BIN) : null;
}

export function installRelease(version = 'latest', root = process.cwd()) {
  const safe = version.replace(/[^a-zA-Z0-9._-]/g, '_');
  const prefix = join(root, '.cache', `ai-devkit-${safe}`);
  const bin = join(prefix, 'node_modules', 'ai-devkit', 'dist', 'cli.js');
  if (!existsSync(bin)) {
    mkdirSync(prefix, { recursive: true });
    execFileSync('npm', ['install', '--prefix', prefix, '--no-save', `ai-devkit@${version}`], { stdio: 'inherit' });
  }
  const pkg = JSON.parse(readFileSync(join(prefix, 'node_modules', 'ai-devkit', 'package.json'), 'utf8'));
  return { bin, version: pkg.version, mode: 'release' };
}

import fs from 'node:fs/promises';
import path from 'node:path';

const fixes = [
  {
    label: 'metro-resolver missing PackagePathNotExportedError.js',
    targetPath: path.resolve(
      process.cwd(),
      'node_modules/metro-resolver/src/errors/PackagePathNotExportedError.js',
    ),
    source: `"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});

class PackagePathNotExportedError extends Error {}

exports.default = PackagePathNotExportedError;
`,
  },
  {
    label: 'undici missing fetch/symbols.js',
    targetPath: path.resolve(
      process.cwd(),
      'node_modules/undici/lib/web/fetch/symbols.js',
    ),
    source: `'use strict'

module.exports = {
  kHeaders: Symbol('headers'),
  kSignal: Symbol('signal'),
  kState: Symbol('state'),
  kDispatcher: Symbol('dispatcher')
}
`,
  },
  {
    label: 'undici missing cache/symbols.js',
    targetPath: path.resolve(
      process.cwd(),
      'node_modules/undici/lib/web/cache/symbols.js',
    ),
    source: `'use strict'

module.exports = {
  kConstruct: Symbol('construct')
}
`,
  },
];

async function ensureFile({ label, targetPath, source }) {
  try {
    await fs.access(targetPath);
    return;
  } catch {
    // Some published dependency bundles intermittently miss compiled JS files.
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, source, 'utf8');
  console.log(`Patched ${label}`);
}

async function ensurePatched() {
  for (const fix of fixes) {
    await ensureFile(fix);
  }
}

ensurePatched().catch((error) => {
  console.error(error);
  process.exit(1);
});

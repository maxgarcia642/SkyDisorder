import fs from 'fs';
import path from 'path';

interface ScannedFeature {
  id: string;
  name: string;
  type: string;
  repoId: string;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'NIGHTMARE' | 'IMPOSSIBLE' | 'CORPORATE';

interface ScannedRepo {
  id: string;
  name: string;
  folderName: string;
  description: string;
  techStack: string[];
  features: ScannedFeature[];
  par: number;
  difficulty: Difficulty;
  holeNumber: number;
  coworker: string;
  uploaded: boolean;
  played: boolean;
  score: number;
}

const COWORKERS = [
  'Tyler from Backend',
  'Sarah the Intern',
  "Mike 'Ship It' Johnson",
  'Jenny from QA',
  'Dave the DBA',
  'Corporate Steve',
  'Agile Andy',
  'Scrum Master Pat',
  "The CEO's Nephew",
  'Contractor #47',
  'NotebookLM',
  'Gemini',
  'Stack Overflow Copilot',
  'The Build Server',
  "ChatGPT's Evil Twin",
  'That One Guy From Standup',
  'The PM Who Codes',
  'Intern 2024',
  'Mr. Technical Debt',
  'Legacy Larry',
];

const TECH_DETECTORS: Record<string, string> = {
  next: 'Next.js',
  react: 'React',
  'react-dom': 'React',
  vue: 'Vue',
  '@angular/core': 'Angular',
  svelte: 'Svelte',
  express: 'Express',
  fastify: 'Fastify',
  koa: 'Koa',
  django: 'Django',
  flask: 'Flask',
  'ruby-on-rails': 'Rails',
  tailwindcss: 'Tailwind',
  prisma: 'Prisma',
  '@prisma/client': 'Prisma',
  drizzle: 'Drizzle',
  mongoose: 'Mongoose',
  typescript: 'TypeScript',
  zustand: 'Zustand',
  redux: 'Redux',
  '@reduxjs/toolkit': 'Redux',
  three: 'Three.js',
  electron: 'Electron',
  'socket.io': 'Socket.IO',
  graphql: 'GraphQL',
  '@supabase/supabase-js': 'Supabase',
  firebase: 'Firebase',
};

const EXT_TECH: Record<string, string> = {
  '.py': 'Python',
  '.rs': 'Rust',
  '.go': 'Go',
  '.java': 'Java',
  '.rb': 'Ruby',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.php': 'PHP',
  '.dart': 'Dart',
  '.ex': 'Elixir',
  '.zig': 'Zig',
};

const FEATURE_DIRS: Record<string, { name: string; type: string }> = {
  'src/components': { name: 'Components', type: 'component' },
  components: { name: 'Components', type: 'component' },
  'src/hooks': { name: 'Hooks', type: 'hook' },
  hooks: { name: 'Hooks', type: 'hook' },
  'app/api': { name: 'API Routes', type: 'api' },
  'pages/api': { name: 'API Routes', type: 'api' },
  api: { name: 'API Routes', type: 'api' },
  lib: { name: 'Library Utils', type: 'util' },
  'src/lib': { name: 'Library Utils', type: 'util' },
  utils: { name: 'Utilities', type: 'util' },
  'src/utils': { name: 'Utilities', type: 'util' },
  pages: { name: 'Pages', type: 'page' },
  app: { name: 'App Router', type: 'page' },
  routes: { name: 'Routes', type: 'page' },
  'src/routes': { name: 'Routes', type: 'page' },
  tests: { name: 'Test Suite', type: 'test' },
  __tests__: { name: 'Test Suite', type: 'test' },
  test: { name: 'Test Suite', type: 'test' },
  spec: { name: 'Test Suite', type: 'test' },
  styles: { name: 'Styles', type: 'style' },
  'src/styles': { name: 'Styles', type: 'style' },
  css: { name: 'Styles', type: 'style' },
  public: { name: 'Public Assets', type: 'config' },
  config: { name: 'Configuration', type: 'config' },
  '.github': { name: 'CI/CD', type: 'config' },
  docker: { name: 'Docker', type: 'config' },
  supabase: { name: 'Supabase', type: 'config' },
};

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function countFiles(dir: string, maxDepth: number, currentDepth = 0): number {
  if (currentDepth >= maxDepth) return 0;
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__') continue;
      if (entry.isFile()) {
        count++;
      } else if (entry.isDirectory()) {
        count += countFiles(path.join(dir, entry.name), maxDepth, currentDepth + 1);
      }
    }
  } catch { /* permission denied */ }
  return count;
}

function collectExtensions(dir: string, maxDepth: number, currentDepth = 0): Set<string> {
  const exts = new Set<string>();
  if (currentDepth >= maxDepth) return exts;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__') continue;
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext) exts.add(ext);
      } else if (entry.isDirectory()) {
        for (const e of collectExtensions(path.join(dir, entry.name), maxDepth, currentDepth + 1)) {
          exts.add(e);
        }
      }
    }
  } catch { /* skip */ }
  return exts;
}

function assignPar(fileCount: number): number {
  if (fileCount < 20) return 3;
  if (fileCount < 50) return 4;
  if (fileCount < 100) return 5;
  if (fileCount < 200) return 6;
  return 7;
}

function assignDifficulty(techStack: string[], depCount: number): Difficulty {
  const complexity = techStack.length + Math.floor(depCount / 10);
  if (complexity <= 2) return 'EASY';
  if (complexity <= 5) return 'MEDIUM';
  if (complexity <= 8) return 'HARD';
  if (complexity <= 12) return 'NIGHTMARE';
  if (complexity <= 18) return 'IMPOSSIBLE';
  return 'CORPORATE';
}

function isProjectDir(dir: string): boolean {
  const markers = [
    'package.json', 'requirements.txt', 'Cargo.toml', 'Gemfile',
    'go.mod', 'pom.xml', 'build.gradle', 'CMakeLists.txt',
    'pyproject.toml', 'setup.py', 'Makefile', 'README.md',
    'index.html', 'main.py', 'main.go', 'main.rs',
  ];
  try {
    const entries = fs.readdirSync(dir);
    return markers.some((m) => entries.includes(m)) ||
      entries.includes('src') || entries.includes('app') || entries.includes('lib');
  } catch {
    return false;
  }
}

function scanSingleRepo(dirPath: string, folderName: string, holeNumber: number): ScannedRepo | null {
  try {
    if (!isProjectDir(dirPath)) return null;

    const repoId = `repo-${folderName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    let name = folderName;
    let description = `Project: ${folderName}`;
    const techStack: string[] = [];
    let depCount = 0;

    const pkgPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name) name = pkg.name;
        if (pkg.description) description = pkg.description;
        const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
        depCount = Object.keys(allDeps).length;
        for (const dep of Object.keys(allDeps)) {
          const match = TECH_DETECTORS[dep];
          if (match && !techStack.includes(match)) techStack.push(match);
        }
      } catch { /* malformed package.json */ }
    }

    if (fs.existsSync(path.join(dirPath, 'requirements.txt')) || fs.existsSync(path.join(dirPath, 'pyproject.toml'))) {
      if (!techStack.includes('Python')) techStack.push('Python');
    }
    if (fs.existsSync(path.join(dirPath, 'Cargo.toml'))) {
      if (!techStack.includes('Rust')) techStack.push('Rust');
    }
    if (fs.existsSync(path.join(dirPath, 'Gemfile'))) {
      if (!techStack.includes('Ruby')) techStack.push('Ruby');
    }
    if (fs.existsSync(path.join(dirPath, 'go.mod'))) {
      if (!techStack.includes('Go')) techStack.push('Go');
    }

    const exts = collectExtensions(dirPath, 3);
    for (const [ext, tech] of Object.entries(EXT_TECH)) {
      if (exts.has(ext) && !techStack.includes(tech)) techStack.push(tech);
    }
    if (exts.has('.ts') || exts.has('.tsx')) {
      if (!techStack.includes('TypeScript')) techStack.push('TypeScript');
    }
    if (exts.has('.js') || exts.has('.jsx')) {
      if (!techStack.includes('JavaScript')) techStack.push('JavaScript');
    }

    const features: ScannedFeature[] = [];
    let featureIdx = 0;
    for (const [relDir, meta] of Object.entries(FEATURE_DIRS)) {
      try {
        const fullDir = path.join(dirPath, relDir);
        if (fs.existsSync(fullDir) && fs.statSync(fullDir).isDirectory()) {
          features.push({ id: `${repoId}-feat-${featureIdx++}`, name: meta.name, type: meta.type, repoId });
        }
      } catch { /* skip */ }
    }

    if (features.length === 0) {
      features.push({ id: `${repoId}-feat-default`, name: 'Source Code', type: 'util', repoId });
    }

    const fileCount = countFiles(dirPath, 3);

    return {
      id: repoId,
      name,
      folderName,
      description,
      techStack,
      features,
      par: assignPar(fileCount),
      difficulty: assignDifficulty(techStack, depCount),
      holeNumber,
      coworker: randomItem(COWORKERS),
      uploaded: false,
      played: false,
      score: 0,
    };
  } catch {
    return null;
  }
}

export async function scanRepos(): Promise<ScannedRepo[]> {
  const skyRoot = process.env.SKYDISORDER_ROOT || path.resolve(process.cwd(), '..');

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(skyRoot, { withFileTypes: true });
  } catch {
    console.error(`[repoScanner] Cannot read directory: ${skyRoot}`);
    return [];
  }

  const repos: ScannedRepo[] = [];
  let holeNumber = 1;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'skydisorder' || entry.name.startsWith('.')) continue;

    const repo = scanSingleRepo(path.join(skyRoot, entry.name), entry.name, holeNumber);
    if (repo) {
      repos.push(repo);
      holeNumber++;
    }
  }

  if (repos.length > 50) {
    return repos.sort(() => Math.random() - 0.5).slice(0, 50);
  }

  return repos;
}

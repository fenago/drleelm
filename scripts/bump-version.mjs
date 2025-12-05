#!/usr/bin/env node
/**
 * Bumps version for frontend and/or backend separately
 * Usage: node scripts/bump-version.mjs [target] [type]
 *   target: fe | be | both (default: both)
 *   type: major | minor | patch (default: patch)
 *
 * Examples:
 *   node scripts/bump-version.mjs fe        # bump frontend patch
 *   node scripts/bump-version.mjs be minor  # bump backend minor
 *   node scripts/bump-version.mjs both      # bump both patch
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Parse args
let target = process.argv[2] || 'both'
let bumpType = process.argv[3] || 'patch'

// Handle legacy usage: if first arg is major/minor/patch, treat as both + type
if (['major', 'minor', 'patch'].includes(target)) {
  bumpType = target
  target = 'both'
}

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number)
  switch (type) {
    case 'major': return `${major + 1}.0.0`
    case 'minor': return `${major}.${minor + 1}.0`
    case 'patch':
    default: return `${major}.${minor}.${patch + 1}`
  }
}

const rootPkgPath = path.join(ROOT, 'package.json')
const frontendPkgPath = path.join(ROOT, 'frontend', 'package.json')
const sidebarPath = path.join(ROOT, 'frontend', 'src', 'components', 'Sidebar.tsx')

const filesToStage = []

// Bump backend version
if (target === 'be' || target === 'both') {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'))
  const oldVersion = rootPkg.version || '1.0.0'
  const newVersion = bumpVersion(oldVersion, bumpType)

  rootPkg.version = newVersion
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n')
  console.log(`Backend: ${oldVersion} -> ${newVersion}`)
  filesToStage.push('package.json')
}

// Bump frontend version
if (target === 'fe' || target === 'both') {
  const frontendPkg = JSON.parse(fs.readFileSync(frontendPkgPath, 'utf-8'))
  const oldVersion = frontendPkg.version || '1.0.0'
  const newVersion = bumpVersion(oldVersion, bumpType)

  frontendPkg.version = newVersion
  fs.writeFileSync(frontendPkgPath, JSON.stringify(frontendPkg, null, 2) + '\n')
  console.log(`Frontend: ${oldVersion} -> ${newVersion}`)
  filesToStage.push('frontend/package.json')

  // Update FRONTEND_VERSION in Sidebar.tsx
  let sidebarContent = fs.readFileSync(sidebarPath, 'utf-8')
  sidebarContent = sidebarContent.replace(
    /const FRONTEND_VERSION = '[^']+'/,
    `const FRONTEND_VERSION = '${newVersion}'`
  )
  fs.writeFileSync(sidebarPath, sidebarContent)
  filesToStage.push('frontend/src/components/Sidebar.tsx')
}

// Output files to stage (used by pre-commit hook)
console.log(`FILES_TO_STAGE:${filesToStage.join(',')}`)

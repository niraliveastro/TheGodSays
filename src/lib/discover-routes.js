/**
 * Discovers all page routes by scanning the app directory for page.js/page.jsx/page.ts/page.tsx.
 * Used so new pages automatically appear in sitemap.xml and Admin SiteMap tab without manual config.
 * Runs in Node only (uses fs/path).
 */

import fs from 'fs'
import path from 'path'

const PAGE_FILES = ['page.js', 'page.jsx', 'page.ts', 'page.tsx']

/** Segments to skip (API routes, admin, dynamic params, special files) */
const SKIP_SEGMENTS = new Set(['api', 'admin'])
const SKIP_FILES = new Set(['layout.js', 'layout.jsx', 'layout.ts', 'layout.tsx', 'loading.js', 'loading.jsx', 'error.js', 'error.jsx', 'not-found.js', 'not-found.jsx', 'providers.js', 'route.js'])

/**
 * Check if a directory name is a dynamic segment (e.g. [id], [slug], [...rest])
 */
function isDynamicSegment(name) {
  return typeof name === 'string' && name.startsWith('[') && name.endsWith(']')
}

/**
 * Recursively find all page routes under dir, building pathPrefix (relative to app root).
 * @param {string} dir - absolute path to current directory
 * @param {string} pathPrefix - route path so far (e.g. 'panchang' or 'panchang/choghadiya-timings')
 * @param {string} appRoot - absolute path to src/app
 * @returns {string[]} array of route paths (e.g. ['', 'panchang', 'blog', ...])
 */
function discoverRoutesInDir(dir, pathPrefix, appRoot) {
  const routes = []
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return routes
  }

  const hasPage = entries.some(
    (e) => e.isFile() && PAGE_FILES.includes(e.name)
  )
  if (hasPage) {
    routes.push(pathPrefix)
  }

  for (const ent of entries) {
    if (!ent.isDirectory()) continue
    const name = ent.name
    if (SKIP_SEGMENTS.has(name)) continue
    if (isDynamicSegment(name)) continue
    const childPath = path.join(dir, name)
    const newPrefix = pathPrefix ? `${pathPrefix}/${name}` : name
    routes.push(...discoverRoutesInDir(childPath, newPrefix, appRoot))
  }

  return routes
}

/**
 * Discover all app routes (static pages only; no dynamic segments).
 * @param {string} [appDir] - optional path to app directory (default: src/app or app from cwd)
 * @returns {string[]} sorted array of route paths, e.g. ['', 'panchang', 'blog', 'talk-to-astrologer', ...]
 */
export function discoverAppRoutes(appDir) {
  const cwd = process.cwd()
  const candidate = appDir || path.join(cwd, 'src', 'app')
  const fallback = path.join(cwd, 'app')
  const app = fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()
    ? candidate
    : fs.existsSync(fallback) && fs.statSync(fallback).isDirectory()
      ? fallback
      : null
  if (!app) return []
  const routes = discoverRoutesInDir(app, '', app)
  return [...new Set(routes)].sort((a, b) => a.localeCompare(b))
}

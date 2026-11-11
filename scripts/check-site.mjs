import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { PUBLIC_PAGES } from "./lib/page.mjs"

const root = fileURLToPath(new URL("..", import.meta.url))
const siteDir = join(root, "site")
const dataDir = join(root, "data")

const budget = JSON.parse(readFileSync(join(dataDir, "perf-budget.v0.json"), "utf8"))
const sports = JSON.parse(readFileSync(join(dataDir, "sports-catalog.v0.json"), "utf8"))
const themes = JSON.parse(readFileSync(join(dataDir, "themes-catalog.v0.json"), "utf8"))
const teams = JSON.parse(readFileSync(join(dataDir, "teams-catalog.v0.json"), "utf8"))
const capabilities = JSON.parse(
  readFileSync(join(dataDir, "capability-matrix.v0.json"), "utf8"),
)
const meta = JSON.parse(readFileSync(join(dataDir, "site-meta.v0.json"), "utf8"))

const requiredFiles = [
  ...PUBLIC_PAGES.map((p) => p.file),
  ".nojekyll",
  "styles.css",
  "brand.css",
  "mark.svg",
  "sitemap.xml",
  "robots.txt",
  "registry-search.js",
  "generated/sports-catalog.v0.json",
  "generated/themes-catalog.v0.json",
  "generated/teams-catalog.v0.json",
  "generated/capability-matrix.v0.json",
]

for (const name of requiredFiles) {
  const path = join(siteDir, name)
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
    console.error(`missing required file: site/${name}`)
    process.exit(1)
  }
}

const banned = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /client_secret\s*[:=]/i,
]

const bannedHex = ["#7C3AED", "#8B5CF6", "#A855F7", "#6366F1", "#4F46E5", "#2f6fed"]

const fabricatedUi = [
  /device[- ]frame/i,
  /mock(?:up)?[- ](?:ui|screen|device)/i,
  /fabricated[- ]ui/i,
  /placeholder[- ]screenshot/i,
]

let totalBytes = 0
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(path)
      continue
    }
    if (!entry.isFile()) continue
    const size = statSync(path).size
    totalBytes += size
    if (size > budget.limits.max_single_asset_bytes) {
      console.error(
        `asset over budget ${relative(siteDir, path)}: ${size} > ${budget.limits.max_single_asset_bytes}`,
      )
      process.exit(1)
    }
    const text = readFileSync(path, "utf8")
    for (const pattern of banned) {
      if (pattern.test(text)) {
        console.error(`secret-like pattern in ${relative(siteDir, path)}: ${pattern}`)
        process.exit(1)
      }
    }
    for (const hex of bannedHex) {
      if (text.toUpperCase().includes(hex.toUpperCase())) {
        console.error(`banned brand hex ${hex} in ${relative(siteDir, path)}`)
        process.exit(1)
      }
    }
    if (/backdrop-filter\s*:\s*blur/i.test(text)) {
      console.error(`glassmorphism pattern in ${relative(siteDir, path)}`)
      process.exit(1)
    }
    if (/\.(?:png|jpe?g|webp|gif)/i.test(entry.name) && !/mark\.svg$/i.test(entry.name)) {
      console.error(
        `unexpected raster image ${relative(siteDir, path)}: only real screenshots may be added deliberately`,
      )
      process.exit(1)
    }
  }
}

walk(siteDir)

if (totalBytes > budget.limits.max_total_site_bytes) {
  console.error(`total site bytes ${totalBytes} > ${budget.limits.max_total_site_bytes}`)
  process.exit(1)
}

const cssBytes = statSync(join(siteDir, "styles.css")).size + statSync(join(siteDir, "brand.css")).size
if (cssBytes > budget.limits.max_css_bytes) {
  console.error(`css bytes ${cssBytes} > ${budget.limits.max_css_bytes}`)
  process.exit(1)
}

const jsBytes = statSync(join(siteDir, "registry-search.js")).size
if (jsBytes > budget.limits.max_js_bytes) {
  console.error(`js bytes ${jsBytes} > ${budget.limits.max_js_bytes}`)
  process.exit(1)
}

const requiredNav = PUBLIC_PAGES.map((p) => p.file)

for (const page of PUBLIC_PAGES) {
  const html = readFileSync(join(siteDir, page.file), "utf8")
  const size = Buffer.byteLength(html, "utf8")
  if (size > budget.limits.max_html_bytes) {
    console.error(`${page.file} html bytes ${size} > ${budget.limits.max_html_bytes}`)
    process.exit(1)
  }
  if (!html.includes("Open Matchday")) {
    console.error(`${page.file} missing brand text`)
    process.exit(1)
  }
  if (!html.includes('class="skip-link"') || !html.includes('href="#main"')) {
    console.error(`${page.file} missing skip link to #main`)
    process.exit(1)
  }
  if (!html.includes('id="main"')) {
    console.error(`${page.file} missing main landmark id`)
    process.exit(1)
  }
  if (!html.includes('name="color-scheme" content="dark"')) {
    console.error(`${page.file} missing dark color-scheme`)
    process.exit(1)
  }
  if (!html.includes(`<title>${page.title}</title>`)) {
    console.error(`${page.file} missing exact title`)
    process.exit(1)
  }
  if (!html.includes(`content="${page.description}"`)) {
    console.error(`${page.file} missing description`)
    process.exit(1)
  }
  const canonical =
    page.file === "index.html" ? meta.base_url : `${meta.base_url}${page.file}`
  if (!html.includes(`rel="canonical" href="${canonical}"`)) {
    console.error(`${page.file} missing canonical ${canonical}`)
    process.exit(1)
  }
  if (!html.includes('property="og:title"') || !html.includes('property="og:description"')) {
    console.error(`${page.file} missing Open Graph tags`)
    process.exit(1)
  }
  if (!html.includes('application/ld+json')) {
    console.error(`${page.file} missing JSON-LD`)
    process.exit(1)
  }
  if (page.index) {
    if (!html.includes('name="robots" content="index,follow"')) {
      console.error(`${page.file} should be index,follow`)
      process.exit(1)
    }
  } else if (!html.includes("noindex")) {
    console.error(`${page.file} private page missing noindex`)
    process.exit(1)
  }
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(html)) {
    console.error(`${page.file} disables zoom`)
    process.exit(1)
  }
  for (const href of requiredNav) {
    if (!html.includes(`href="${href}"`)) {
      console.error(`${page.file} missing nav href ${href}`)
      process.exit(1)
    }
  }
  for (const pattern of fabricatedUi) {
    if (
      pattern.test(html) &&
      !/No device-frame mockups|no fabricated UI|No fabricated UI shots/i.test(html)
    ) {
      console.error(`${page.file} looks like fabricated UI marketing: ${pattern}`)
      process.exit(1)
    }
  }
}

const index = readFileSync(join(siteDir, "index.html"), "utf8")
for (const needle of [
  "Local sports broadcast production",
  "real screenshots only",
  "Roles",
  "capabilities.html",
  "sports.html",
  "themes.html",
  "registry.html",
]) {
  if (!index.includes(needle)) {
    console.error(`index.html missing product marker: ${needle}`)
    process.exit(1)
  }
}

const workflow = readFileSync(join(siteDir, "workflow.html"), "utf8")
if (!workflow.includes("Matchday workflow") || !workflow.includes("Director approves")) {
  console.error("workflow.html missing journey markers")
  process.exit(1)
}

const downloads = readFileSync(join(siteDir, "downloads.html"), "utf8")
if (!downloads.includes("https://github.com/OpenMatchday/app")) {
  console.error("downloads.html missing app source link")
  process.exit(1)
}
if (/app store|play store|microsoft store/i.test(downloads)) {
  console.error("downloads.html must not claim store packages")
  process.exit(1)
}

const docsPage = readFileSync(join(siteDir, "docs.html"), "utf8")
if (!docsPage.includes("https://github.com/OpenMatchday/docs")) {
  console.error("docs.html missing docs repository link")
  process.exit(1)
}

const privacy = readFileSync(join(siteDir, "privacy.html"), "utf8")
for (const needle of ["Local production", "takedown:", "OpenMatchday/teams"]) {
  if (!privacy.includes(needle)) {
    console.error(`privacy.html missing marker: ${needle}`)
    process.exit(1)
  }
}

const takedown = readFileSync(join(siteDir, "takedown.html"), "utf8")
for (const needle of [
  "does not promise total erasure of Git history",
  "takedown:",
  "OpenMatchday/teams",
]) {
  if (!takedown.includes(needle)) {
    console.error(`takedown.html missing marker: ${needle}`)
    process.exit(1)
  }
}

const capabilitiesHtml = readFileSync(join(siteDir, "capabilities.html"), "utf8")
if (!capabilitiesHtml.includes("Capability matrix")) {
  console.error("capabilities.html missing matrix heading")
  process.exit(1)
}
for (const row of capabilities.rows) {
  if (!capabilitiesHtml.includes(row.capability)) {
    console.error(`capabilities.html missing row ${row.capability}`)
    process.exit(1)
  }
}
if (/ms\b|Mbps|bitrate/i.test(capabilitiesHtml) && !/No latency or bitrate/i.test(capabilitiesHtml)) {
  console.error("capabilities.html appears to publish numeric media claims")
  process.exit(1)
}

const sportsHtml = readFileSync(join(siteDir, "sports.html"), "utf8")
for (const sport of sports.available) {
  if (!sportsHtml.includes(sport.display_name) || !sportsHtml.includes("available")) {
    console.error(`sports.html missing available sport ${sport.id}`)
    process.exit(1)
  }
}
for (const sport of sports.planned) {
  if (sport.status !== "planned" || sport.playable !== false) {
    console.error(`planned sport ${sport.id} is not a non-playable planned entry`)
    process.exit(1)
  }
  if (!sportsHtml.includes(sport.display_name) || !sportsHtml.includes("planned")) {
    console.error(`sports.html missing planned sport ${sport.id}`)
    process.exit(1)
  }
  if (sportsHtml.includes(`id="sport-${sport.id}"`)) {
    console.error(`planned sport ${sport.id} must not render as available shell`)
    process.exit(1)
  }
}
if (sports.planned.length === 0 && !sportsHtml.includes("None are scheduled yet")) {
  console.error("sports.html missing empty planned note")
  process.exit(1)
}

const themesHtml = readFileSync(join(siteDir, "themes.html"), "utf8")
for (const theme of themes.themes) {
  if (!themesHtml.includes(theme.title)) {
    console.error(`themes.html missing theme ${theme.id}`)
    process.exit(1)
  }
}

const registryHtml = readFileSync(join(siteDir, "registry.html"), "utf8")
for (const needle of [
  "registry-search-form",
  "registry-q",
  "registry-search.js",
  "generated/teams-catalog.v0.json",
  "fictional",
]) {
  if (!registryHtml.includes(needle)) {
    console.error(`registry.html missing marker: ${needle}`)
    process.exit(1)
  }
}
if (teams.entries.length < 1) {
  console.error("teams catalog has no searchable entries")
  process.exit(1)
}

const css = readFileSync(join(siteDir, "styles.css"), "utf8")
const brand = readFileSync(join(siteDir, "brand.css"), "utf8")
for (const needle of [
  "--om-director-bg",
  "--om-camera-bg",
  "--om-tally-on-bg",
  "#b00020",
  "brand.css",
  "skip-link",
  "prefers-reduced-motion",
  "max-width: 320px",
  "matrix-table",
  "visually-hidden",
]) {
  const hay =
    needle === "brand.css" ||
    needle === "skip-link" ||
    needle === "prefers-reduced-motion" ||
    needle === "max-width: 320px" ||
    needle === "matrix-table" ||
    needle === "visually-hidden"
      ? css
      : `${css}\n${brand}`
  if (!hay.toLowerCase().includes(needle.toLowerCase())) {
    console.error(`site styles missing ${needle}`)
    process.exit(1)
  }
}

const robots = readFileSync(join(siteDir, "robots.txt"), "utf8")
if (!robots.includes(`Sitemap: ${meta.base_url}sitemap.xml`)) {
  console.error("robots.txt missing sitemap line")
  process.exit(1)
}

const sitemap = readFileSync(join(siteDir, "sitemap.xml"), "utf8")
for (const page of PUBLIC_PAGES.filter((p) => p.index)) {
  const loc = page.file === "index.html" ? meta.base_url : `${meta.base_url}${page.file}`
  if (!sitemap.includes(`<loc>${loc}</loc>`)) {
    console.error(`sitemap.xml missing ${loc}`)
    process.exit(1)
  }
}

console.log(
  `SITE_CHECK_OK pages=${PUBLIC_PAGES.length} total_bytes=${totalBytes} css_bytes=${cssBytes} js_bytes=${jsBytes} sports_available=${sports.available.length} sports_planned=${sports.planned.length} themes=${themes.themes.length} registry_entries=${teams.entries.length}`,
)

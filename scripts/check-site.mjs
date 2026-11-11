import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const siteDir = fileURLToPath(new URL("../site", import.meta.url))

const requiredFiles = [
  "index.html",
  "workflow.html",
  "downloads.html",
  "docs.html",
  "privacy.html",
  "takedown.html",
  ".nojekyll",
  "styles.css",
  "brand.css",
  "mark.svg",
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

const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(path)
      continue
    }
    if (!entry.isFile()) continue
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
      console.error(`unexpected raster image ${relative(siteDir, path)}: only real screenshots may be added deliberately`)
      process.exit(1)
    }
  }
}

walk(siteDir)

const pages = [
  "index.html",
  "workflow.html",
  "downloads.html",
  "docs.html",
  "privacy.html",
  "takedown.html",
]

const requiredNav = [
  "index.html",
  "workflow.html",
  "downloads.html",
  "docs.html",
  "privacy.html",
  "takedown.html",
]

for (const page of pages) {
  const html = readFileSync(join(siteDir, page), "utf8")
  if (!html.includes("Open Matchday")) {
    console.error(`${page} missing brand text`)
    process.exit(1)
  }
  if (!html.includes('class="skip-link"') || !html.includes('href="#main"')) {
    console.error(`${page} missing skip link to #main`)
    process.exit(1)
  }
  if (!html.includes('id="main"')) {
    console.error(`${page} missing main landmark id`)
    process.exit(1)
  }
  if (!html.includes('name="color-scheme" content="dark"')) {
    console.error(`${page} missing dark color-scheme`)
    process.exit(1)
  }
  for (const href of requiredNav) {
    if (!html.includes(`href="${href}"`)) {
      console.error(`${page} missing nav href ${href}`)
      process.exit(1)
    }
  }
  for (const pattern of fabricatedUi) {
    if (pattern.test(html) && !/No device-frame mockups|no fabricated UI|No fabricated UI shots/i.test(html)) {
      console.error(`${page} looks like fabricated UI marketing: ${pattern}`)
      process.exit(1)
    }
  }
}

const index = readFileSync(join(siteDir, "index.html"), "utf8")
for (const needle of [
  "Local sports broadcast production",
  "real screenshots only",
  "Roles",
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
]) {
  const hay = needle === "brand.css" || needle === "skip-link" || needle === "prefers-reduced-motion"
    ? css
    : `${css}\n${brand}`
  if (!hay.toLowerCase().includes(needle.toLowerCase())) {
    console.error(`site styles missing ${needle}`)
    process.exit(1)
  }
}

console.log("SITE_CHECK_OK")

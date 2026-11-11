import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const siteDir = fileURLToPath(new URL("../site", import.meta.url))

const required = ["index.html", ".nojekyll", "styles.css", "brand.css", "mark.svg"]
for (const name of required) {
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
  }
}

walk(siteDir)

const html = readFileSync(join(siteDir, "index.html"), "utf8")
if (!html.includes("Open Matchday")) {
  console.error("index.html missing brand text")
  process.exit(1)
}
if (!html.includes('name="robots" content="noindex,nofollow"')) {
  console.error("spike page must stay noindex")
  process.exit(1)
}
if (!html.includes("ON AIR")) {
  console.error("index.html missing tally sample")
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
]) {
  const hay = needle === "brand.css" ? css : `${css}\n${brand}`
  if (!hay.toLowerCase().includes(needle.toLowerCase())) {
    console.error(`site styles missing ${needle}`)
    process.exit(1)
  }
}

console.log("SITE_CHECK_OK")

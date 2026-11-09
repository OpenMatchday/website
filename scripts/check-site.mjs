import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const siteDir = fileURLToPath(new URL("../site", import.meta.url))

const required = ["index.html", ".nojekyll", "styles.css"]
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

console.log("SITE_CHECK_OK")

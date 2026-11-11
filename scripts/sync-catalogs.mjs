import { copyFileSync, mkdirSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const websiteRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const workspaceRoot = join(websiteRoot, "..")
const dataDir = join(websiteRoot, "data")

const sources = [
  { repo: "sports", outName: "sports-catalog.v0.json" },
  { repo: "themes", outName: "themes-catalog.v0.json" },
  { repo: "teams", outName: "teams-catalog.v0.json" },
]

mkdirSync(dataDir, { recursive: true })

for (const source of sources) {
  const repoRoot = join(workspaceRoot, source.repo)
  const exportScript = join(repoRoot, "scripts", "export-website-catalog.mjs")
  if (!existsSync(exportScript)) {
    console.error(`missing export script for ${source.repo}`)
    process.exit(1)
  }
  const result = spawnSync(process.execPath, [exportScript], {
    cwd: repoRoot,
    encoding: "utf8",
  })
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(result.status ?? 1)
  }
  const from = join(repoRoot, "dist", "website-catalog.v0.json")
  const to = join(dataDir, source.outName)
  copyFileSync(from, to)
  console.log(`synced ${source.outName}`)
}

console.log("CATALOG_SYNC_OK")

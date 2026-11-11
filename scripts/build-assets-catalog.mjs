import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const websiteRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const sportsRoot = join(websiteRoot, "..", "sports")
const outPath = join(websiteRoot, "data", "assets-catalog.v0.json")

const packageIds = ["basketball", "futsal"]
const packages = []

for (const id of packageIds) {
  const dir = join(sportsRoot, "packages", id)
  if (!existsSync(dir)) {
    console.error(`missing sports package ${id}`)
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"))
  const field = JSON.parse(readFileSync(join(dir, "field.json"), "utf8"))
  const formations = JSON.parse(readFileSync(join(dir, "formations.json"), "utf8"))
  const scoreboards = JSON.parse(readFileSync(join(dir, "scoreboards.json"), "utf8"))
  const roster = JSON.parse(readFileSync(join(dir, "roster.json"), "utf8"))
  const animations = JSON.parse(readFileSync(join(dir, "animations.json"), "utf8"))

  packages.push({
    id: manifest.id,
    display_name: manifest.display_name,
    version: manifest.version,
    summary: manifest.summary,
    field: {
      surface: field.surface,
      units: field.units,
      width: field.width,
      length: field.length,
      marking_ids: (field.markings ?? []).map((m) => m.id),
      markings: field.markings,
    },
    formations: formations.formations,
    scoreboard_fields: scoreboards.fields,
    roster_positions: roster.positions ?? roster.roles ?? [],
    animation_ids: (animations.clips ?? animations.animations ?? []).map(
      (a) => a.id ?? a.name,
    ).filter(Boolean),
    source_package: `sports/packages/${id}`,
  })
}

const catalog = {
  schema_version: "0.1.0",
  generated_for: "website",
  note: "Default package assets from sports packages (court/pitch geometry, formations, scoreboard field schemas). No live scores. No fabricated match results.",
  packages,
}

mkdirSync(join(websiteRoot, "data"), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`ASSETS_CATALOG_OK packages=${packages.length}`)

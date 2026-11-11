import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import {
  PUBLIC_PAGES,
  escapeHtml,
  renderHead,
  renderChromeStart,
  renderChromeEnd,
} from "./lib/page.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const siteDir = join(root, "site")
const dataDir = join(root, "data")
const generatedDir = join(siteDir, "generated")

const meta = JSON.parse(readFileSync(join(dataDir, "site-meta.v0.json"), "utf8"))
const capabilities = JSON.parse(
  readFileSync(join(dataDir, "capability-matrix.v0.json"), "utf8"),
)
const sports = JSON.parse(readFileSync(join(dataDir, "sports-catalog.v0.json"), "utf8"))
const themes = JSON.parse(readFileSync(join(dataDir, "themes-catalog.v0.json"), "utf8"))
const teams = JSON.parse(readFileSync(join(dataDir, "teams-catalog.v0.json"), "utf8"))
const absoluteUrl = (file) => {
  if (file === "index.html") return meta.base_url
  return `${meta.base_url}${file}`
}

const pageByFile = Object.fromEntries(PUBLIC_PAGES.map((p) => [p.file, p]))

const writePage = (file, mainHtml) => {
  const page = pageByFile[file]
  const html = `${renderHead({ page, meta, absoluteUrl })}
${renderChromeStart(page)}
${mainHtml}
${renderChromeEnd()}`
  writeFileSync(join(siteDir, file), html)
}

const patchExistingPage = (file) => {
  const page = pageByFile[file]
  if (!page) return
  const path = join(siteDir, file)
  let html = readFileSync(path, "utf8")
  const mainMatch = html.match(/<main id="main">([\s\S]*?)<\/main>/)
  if (!mainMatch) {
    throw new Error(`${file} missing main#main`)
  }
  let main = mainMatch[1].trimEnd().replace(/^\n/, "")
  if (file === "index.html") {
    main = main.replace(
      /Verified capability catalogs land in a\s+later generation task\./,
      "Browse generated <a href=\"capabilities.html\">capabilities</a>, <a href=\"sports.html\">sports</a>, <a href=\"themes.html\">themes</a>, and the <a href=\"registry.html\">registry browser</a>.",
    )
  }
  writePage(file, `${main}\n`)
}

const stateClass = (state) => {
  if (state === "verified") return "state-verified"
  if (state === "partial") return "state-partial"
  if (state === "out of scope") return "state-oos"
  return "state-unverified"
}

const capabilitiesMain = () => {
  const headerCells = capabilities.platforms
    .map((p) => `<th scope="col">${escapeHtml(p)}</th>`)
    .join("")
  const rows = capabilities.rows
    .map((row) => {
      const cells = capabilities.platforms
        .map((platform) => {
          const state = row.states[platform]
          const note = row.notes?.[platform]
          const title = note ? ` title="${escapeHtml(note)}"` : ""
          return `<td class="${stateClass(state)}"${title}><span class="state-pill">${escapeHtml(state)}</span></td>`
        })
        .join("")
      return `<tr><th scope="row">${escapeHtml(row.capability)}</th>${cells}</tr>`
    })
    .join("\n")
  return `    <header class="hero">
      <p class="hero-brand" translate="no">Open Matchday</p>
      <h1 class="page-title">Verified capabilities</h1>
      <p class="lede">
        Generated from the capability matrix. Cells are verified, partial,
        unverified, or out of scope. Hover partial cells for measurement notes.
        No latency or bitrate numbers are published here.
      </p>
    </header>

    <section class="section" aria-labelledby="matrix">
      <h2 id="matrix">Capability matrix</h2>
      <p class="note"><strong>Honesty.</strong> ${escapeHtml(capabilities.honesty_note)}</p>
      <div class="table-wrap" role="region" aria-label="Capability matrix" tabindex="0">
        <table class="matrix-table">
          <thead>
            <tr>
              <th scope="col">Capability</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>
`
}

const sportsMain = () => {
  const available = sports.available
    .map((sport) => {
      const variants = sport.variants
        .map(
          (v) =>
            `<li><strong>${escapeHtml(v.display_name)}</strong> -- effective ${escapeHtml(v.effective_date)}; <a href="${escapeHtml(v.official_source.url)}">${escapeHtml(v.official_source.title)}</a></li>`,
        )
        .join("\n")
      return `<article class="catalog-item" aria-labelledby="sport-${escapeHtml(sport.id)}">
        <h3 id="sport-${escapeHtml(sport.id)}">${escapeHtml(sport.display_name)} <span class="status-available">available</span></h3>
        <p>${escapeHtml(sport.summary)}</p>
        <p class="meta-line">Package ${escapeHtml(sport.id)} v${escapeHtml(sport.version)}</p>
        <ul>${variants}</ul>
      </article>`
    })
    .join("\n")

  const planned =
    sports.planned.length === 0
      ? `<p class="note"><strong>Planned later sports.</strong> None are scheduled yet. When added, they appear only as planned catalog entries without playable UI shells (AC-6.5; OM-052).</p>`
      : sports.planned
          .map(
            (sport) => `<article class="catalog-item" aria-labelledby="planned-${escapeHtml(sport.id)}">
        <h3 id="planned-${escapeHtml(sport.id)}">${escapeHtml(sport.display_name)} <span class="status-planned">planned</span></h3>
        <p>${escapeHtml(sport.summary)}</p>
        <p class="meta-line">Not playable. No empty sport shell is offered as available.</p>
      </article>`,
          )
          .join("\n")

  return `    <header class="hero">
      <p class="hero-brand" translate="no">Open Matchday</p>
      <h1 class="page-title">Sports catalog</h1>
      <p class="lede">
        Generated from sport package manifests. Available packages cite official
        rule sources. Later sports appear only as planned entries.
      </p>
    </header>

    <section class="section" aria-labelledby="available-sports">
      <h2 id="available-sports">Available</h2>
      ${available}
    </section>

    <section class="section" aria-labelledby="planned-sports">
      <h2 id="planned-sports">Planned</h2>
      ${planned}
    </section>
`
}

const themesMain = () => {
  const items = themes.themes
    .map((theme) => {
      const fiction = theme.fiction ? "fictional fixture" : "non-fiction"
      return `<article class="catalog-item" aria-labelledby="theme-${escapeHtml(theme.id)}">
        <h3 id="theme-${escapeHtml(theme.id)}">${escapeHtml(theme.title)}</h3>
        <p>${escapeHtml(theme.description)}</p>
        <p class="meta-line">${escapeHtml(theme.id)} v${escapeHtml(theme.version)} · ${escapeHtml(fiction)} · aspects ${escapeHtml(theme.aspects.join(", "))}</p>
      </article>`
    })
    .join("\n")
  return `    <header class="hero">
      <p class="hero-brand" translate="no">Open Matchday</p>
      <h1 class="page-title">Themes catalog</h1>
      <p class="lede">
        Generated from declarative theme packages. Themes carry no executable code.
      </p>
    </header>

    <section class="section" aria-labelledby="theme-list">
      <h2 id="theme-list">Packages</h2>
      ${items}
    </section>
`
}

const registryMain = () => {
  const packages = teams.packages
    .map(
      (pkg) =>
        `<li><strong>${escapeHtml(pkg.display_name)}</strong> (${escapeHtml(pkg.package_id)} v${escapeHtml(pkg.version)}) -- ${escapeHtml(pkg.description)}</li>`,
    )
    .join("\n")
  return `    <header class="hero">
      <p class="hero-brand" translate="no">Open Matchday</p>
      <h1 class="page-title">Registry browser</h1>
      <p class="lede">
        Search the public teams registry index. Shipped packages are clearly
        fictional. Photos stay in the teams repository and are not mirrored here.
      </p>
    </header>

    <section class="section" aria-labelledby="packages">
      <h2 id="packages">Indexed packages</h2>
      <ul>
        ${packages}
      </ul>
    </section>

    <section class="section" aria-labelledby="search">
      <h2 id="search">Search</h2>
      <form id="registry-search-form" class="search-form" role="search" action="registry.html" method="get">
        <label for="registry-q">Find clubs, teams, players, or competitions</label>
        <div class="search-row">
          <input id="registry-q" name="q" type="search" autocomplete="off" spellcheck="false" placeholder="Example: Harbor Foxes…">
          <button type="submit" class="cta">Search</button>
        </div>
        <fieldset class="filter-row">
          <legend class="visually-hidden">Kind filter</legend>
          <label><input type="radio" name="kind" value="all" checked> All</label>
          <label><input type="radio" name="kind" value="club"> Clubs</label>
          <label><input type="radio" name="kind" value="team"> Teams</label>
          <label><input type="radio" name="kind" value="player"> Players</label>
          <label><input type="radio" name="kind" value="competition"> Competitions</label>
        </fieldset>
      </form>
      <p id="registry-status" class="meta-line" aria-live="polite">Loading registry index…</p>
      <ul id="registry-results" class="link-list" aria-live="polite"></ul>
      <noscript>
        <p class="note">Enable JavaScript to filter the registry index, or open <a href="generated/teams-catalog.v0.json">the generated JSON index</a>.</p>
      </noscript>
    </section>

    <p class="note">
      <strong>Contribution wizard.</strong> Online submissions that open pull
      requests ship with the community sign-in task. This page is search-only.
    </p>
    <script src="registry-search.js" defer></script>
`
}

mkdirSync(generatedDir, { recursive: true })
copyFileSync(
  join(dataDir, "sports-catalog.v0.json"),
  join(generatedDir, "sports-catalog.v0.json"),
)
copyFileSync(
  join(dataDir, "themes-catalog.v0.json"),
  join(generatedDir, "themes-catalog.v0.json"),
)
copyFileSync(
  join(dataDir, "teams-catalog.v0.json"),
  join(generatedDir, "teams-catalog.v0.json"),
)
copyFileSync(
  join(dataDir, "capability-matrix.v0.json"),
  join(generatedDir, "capability-matrix.v0.json"),
)

writePage("capabilities.html", capabilitiesMain())
writePage("sports.html", sportsMain())
writePage("themes.html", themesMain())
writePage("registry.html", registryMain())

for (const page of PUBLIC_PAGES) {
  if (
    page.file === "capabilities.html" ||
    page.file === "sports.html" ||
    page.file === "themes.html" ||
    page.file === "registry.html"
  ) {
    continue
  }
  patchExistingPage(page.file)
}

const sitemapUrls = PUBLIC_PAGES.filter((p) => p.index)
  .map(
    (p) => `  <url>
    <loc>${escapeHtml(absoluteUrl(p.file))}</loc>
  </url>`,
  )
  .join("\n")

writeFileSync(
  join(siteDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>
`,
)

writeFileSync(
  join(siteDir, "robots.txt"),
  `# Honest robots for the GitHub Pages project site.
# Sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
User-agent: *
Allow: /

Sitemap: ${meta.base_url}sitemap.xml
`,
)

writeFileSync(
  join(siteDir, "registry-search.js"),
  `(() => {
  const form = document.getElementById("registry-search-form")
  const input = document.getElementById("registry-q")
  const status = document.getElementById("registry-status")
  const results = document.getElementById("registry-results")
  if (!form || !input || !status || !results) return

  let entries = []

  const render = () => {
    const q = input.value.trim().toLowerCase()
    const kind = form.querySelector('input[name="kind"]:checked')?.value || "all"
    const matched = entries.filter((entry) => {
      if (kind !== "all" && entry.kind !== kind) return false
      if (!q) return true
      return entry.search_text.includes(q)
    })
    results.replaceChildren()
    status.textContent = matched.length === 0
      ? "No matches."
      : matched.length === 1
        ? "1 match."
        : matched.length + " matches."
    for (const entry of matched.slice(0, 100)) {
      const li = document.createElement("li")
      const title = document.createElement("strong")
      title.textContent = entry.name
      const metaLine = document.createElement("p")
      const bits = [entry.kind, entry.package_id]
      if (entry.sport_name) bits.push(entry.sport_name)
      if (entry.club_name) bits.push(entry.club_name)
      if (entry.is_minor) bits.push("minor; no photo by default")
      if (entry.fiction) bits.push("fictional")
      metaLine.textContent = bits.join(" · ")
      li.append(title, metaLine)
      results.append(li)
    }
    const url = new URL(window.location.href)
    if (q) url.searchParams.set("q", q)
    else url.searchParams.delete("q")
    if (kind !== "all") url.searchParams.set("kind", kind)
    else url.searchParams.delete("kind")
    history.replaceState(null, "", url)
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault()
    render()
  })
  form.addEventListener("change", render)
  input.addEventListener("input", render)

  const params = new URLSearchParams(window.location.search)
  if (params.get("q")) input.value = params.get("q")
  const kindParam = params.get("kind")
  if (kindParam) {
    const radio = form.querySelector('input[name="kind"][value="' + kindParam + '"]')
    if (radio) radio.checked = true
  }

  fetch("generated/teams-catalog.v0.json")
    .then((response) => {
      if (!response.ok) throw new Error("catalog fetch failed")
      return response.json()
    })
    .then((catalog) => {
      entries = catalog.entries || []
      status.textContent = "Ready. " + entries.length + " indexed entries."
      render()
    })
    .catch(() => {
      status.textContent = "Could not load registry index."
    })
})()
`,
)

console.log(
  `SITE_GENERATE_OK pages=${PUBLIC_PAGES.length} sports_available=${sports.available.length} sports_planned=${sports.planned.length} themes=${themes.themes.length} registry_entries=${teams.entries.length}`,
)

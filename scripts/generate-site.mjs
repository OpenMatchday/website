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
import { renderFieldSvg } from "./lib/court-svg.mjs"

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
const assets = JSON.parse(readFileSync(join(dataDir, "assets-catalog.v0.json"), "utf8"))
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
        Schema samples only. Shipped registry packages are labeled fictional on
        purpose (AC-9.7). They are not real clubs, not real players, and not live
        match results. For real package geometry see <a href="assets.html">Assets</a>.
      </p>
    </header>
    <p class="note warn-note"><strong>Not match data.</strong> Do not treat Harbor Fiction names as real organizations.</p>

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
      <strong>Contribution wizard.</strong>
      <a href="contribute.html">Sign in and submit</a> through the community
      API, or <a href="status.html">check a submission status</a>. This page
      remains search-only.
    </p>
    <script src="registry-search.js" defer></script>
`
}

const assetsMain = () => {
  const blocks = assets.packages
    .map((pkg) => {
      const formations = pkg.formations
        .map((formation) => {
          const svg = renderFieldSvg({
            field: pkg.field,
            formation,
            title: `${pkg.display_name} ${formation.display_name}`,
          })
          return `<figure class="asset-card">
          <figcaption><strong>${escapeHtml(formation.display_name)}</strong> <span class="meta-line">${escapeHtml(formation.id)}</span></figcaption>
          ${svg}
        </figure>`
        })
        .join("\n")
      const scoreboard = pkg.scoreboard_fields
        .map(
          (field) =>
            `<li><strong>${escapeHtml(field.display_name)}</strong> <code>${escapeHtml(field.id)}</code> · ${escapeHtml(field.value_type)}${field.optional_for_variants ? ` · optional for ${escapeHtml(field.optional_for_variants.join(", "))}` : ""}</li>`,
        )
        .join("\n")
      const positions = (pkg.roster_positions ?? [])
        .map(
          (pos) =>
            `<li><strong>${escapeHtml(pos.display_name ?? pos.id)}</strong> <code>${escapeHtml(pos.id)}</code></li>`,
        )
        .join("\n")
      const clips = (pkg.animation_ids ?? [])
        .map((id) => `<li><code>${escapeHtml(id)}</code></li>`)
        .join("\n")
      const bareCourt = renderFieldSvg({
        field: pkg.field,
        title: `${pkg.display_name} ${pkg.field.surface}`,
      })
      return `<section class="section asset-package" aria-labelledby="asset-${escapeHtml(pkg.id)}">
      <h2 id="asset-${escapeHtml(pkg.id)}">${escapeHtml(pkg.display_name)}</h2>
      <p>${escapeHtml(pkg.summary)}</p>
      <p class="meta-line">${escapeHtml(pkg.field.surface)} ${escapeHtml(String(pkg.field.length))} x ${escapeHtml(String(pkg.field.width))} ${escapeHtml(pkg.field.units)} · package v${escapeHtml(pkg.version)}</p>
      <h3>Court / pitch markings</h3>
      <figure class="asset-card asset-card-wide">
        <figcaption>Default geometry from <code>${escapeHtml(pkg.source_package)}/field.json</code></figcaption>
        ${bareCourt}
      </figure>
      <h3>Formations</h3>
      <div class="asset-grid">${formations}</div>
      <h3>Scoreboard fields</h3>
      <p class="note">Schema only. Empty values until an event operator or OCR fills them. No demo scores.</p>
      <ul class="scoreboard-list">${scoreboard}</ul>
      <h3>Roster positions</h3>
      <ul>${positions}</ul>
      <h3>Motion clips</h3>
      <ul>${clips || "<li>None declared</li>"}</ul>
    </section>`
    })
    .join("\n")

  return `    <header class="hero hero-assets">
      <p class="hero-brand" translate="no">Open Matchday</p>
      <h1 class="page-title">Default package assets</h1>
      <p class="lede">
        Real sports-package defaults: court and pitch geometry, formations,
        scoreboard field schemas, roster positions, and motion clip ids. Drawn
        from cited package data -- not invented match results.
      </p>
    </header>
    <p class="note"><strong>${escapeHtml(assets.note)}</strong></p>
    ${blocks}
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
copyFileSync(
  join(dataDir, "assets-catalog.v0.json"),
  join(generatedDir, "assets-catalog.v0.json"),
)

const contributeMain = () => `    <header class="hero">
      <p class="hero-brand" translate="no">Open Matchday</p>
      <h1 class="page-title">Contribute to the registry</h1>
      <p class="lede">
        Sign in with Google through the community backend, choose sport and
        team fields, validate a public preview, then submit once. Submissions
        queue as <code>queued</code> until a maintainer pull request opens.
      </p>
    </header>
    <p class="note warn-note">
      <strong>Public fields only.</strong> No dates of birth, contacts, or
      Google email appear in previews or pull requests. Minors default to no
      photo. SVG and remote image URLs are rejected.
    </p>
    <section class="section" aria-labelledby="sign-in">
      <h2 id="sign-in">Sign in</h2>
      <p id="auth-status" class="meta-line" aria-live="polite">Checking session…</p>
      <div class="cta-row">
        <a id="google-sign-in" class="cta" href="#">Sign in with Google</a>
        <button id="sign-out" type="button" class="cta cta-secondary" hidden>Sign out</button>
      </div>
      <p class="note">
        OIDC source:
        <a href="https://developers.google.com/identity/protocols/oauth2/openid-connect">Google OpenID Connect</a>.
        Live Google credentials must be configured on the community deploy.
      </p>
    </section>
    <section class="section" aria-labelledby="wizard">
      <h2 id="wizard">Submission wizard</h2>
      <form id="contribute-form" class="wizard-form" novalidate>
        <fieldset>
          <legend>Selection</legend>
          <label for="sport_id">Sport id</label>
          <input id="sport_id" name="sport_id" required autocomplete="off" spellcheck="false" value="basketball">
          <label for="category_id">Category id</label>
          <input id="category_id" name="category_id" required autocomplete="off" spellcheck="false" value="senior">
          <label for="competition_id">Competition id</label>
          <input id="competition_id" name="competition_id" required autocomplete="off" spellcheck="false" value="harbor_open">
        </fieldset>
        <fieldset>
          <legend>Club, team, season</legend>
          <label for="club_id">Club id</label>
          <input id="club_id" name="club_id" required autocomplete="off" spellcheck="false">
          <label for="club_name">Club name</label>
          <input id="club_name" name="club_name" required autocomplete="organization">
          <label for="country_id">Country id (ISO alpha-2 lowercased)</label>
          <input id="country_id" name="country_id" required autocomplete="off" spellcheck="false" value="it">
          <label for="team_id">Team id</label>
          <input id="team_id" name="team_id" required autocomplete="off" spellcheck="false">
          <label for="team_name">Team name</label>
          <input id="team_name" name="team_name" required>
          <label for="season_id">Season id</label>
          <input id="season_id" name="season_id" required autocomplete="off" spellcheck="false">
          <label for="season_name">Season name</label>
          <input id="season_name" name="season_name" required>
        </fieldset>
        <fieldset>
          <legend>Player</legend>
          <label for="player_id">Player id</label>
          <input id="player_id" name="player_id" required autocomplete="off" spellcheck="false">
          <label for="player_name">Player name</label>
          <input id="player_name" name="player_name" required>
          <label for="player_number">Squad number</label>
          <input id="player_number" name="player_number" required inputmode="numeric">
          <label for="position_id">Position id (optional)</label>
          <input id="position_id" name="position_id" autocomplete="off" spellcheck="false">
          <label class="check-line">
            <input id="is_minor" name="is_minor" type="checkbox">
            Player is a minor (no photo)
          </label>
          <label for="photo_file">Photo (JPEG, PNG, or WebP; optional)</label>
          <input id="photo_file" name="photo_file" type="file" accept="image/jpeg,image/png,image/webp">
          <label for="photo_attribution">Photo attribution</label>
          <input id="photo_attribution" name="photo_attribution" autocomplete="off">
          <label for="photo_license">Photo license</label>
          <input id="photo_license" name="photo_license" autocomplete="off" placeholder="CC0-1.0">
        </fieldset>
        <fieldset>
          <legend>Credit and consent</legend>
          <label for="handle">Public handle</label>
          <input id="handle" name="handle" required autocomplete="username" spellcheck="false">
          <label for="profile_url">Profile link (optional https)</label>
          <input id="profile_url" name="profile_url" type="url" inputmode="url" autocomplete="url">
          <label class="check-line">
            <input id="rights_confirmed" name="rights_confirmed" type="checkbox" required>
            I confirm I have the rights to submit this public registry data
          </label>
          <label class="check-line">
            <input id="consent_confirmed" name="consent_confirmed" type="checkbox" required>
            I confirm consent rules for any player photos (minors: no photo by default)
          </label>
        </fieldset>
        <div class="cta-row">
          <button type="button" id="btn-validate" class="cta cta-secondary">Validate</button>
          <button type="button" id="btn-preview" class="cta cta-secondary">Preview</button>
          <button type="submit" id="btn-submit" class="cta">Submit</button>
        </div>
      </form>
      <p id="wizard-status" class="meta-line" aria-live="polite"></p>
      <pre id="wizard-preview" class="preview-block" hidden tabindex="0" aria-label="Public preview JSON"></pre>
    </section>
    <script>
      window.OM_COMMUNITY_API = ${JSON.stringify(meta.community_api_base)};
    </script>
    <script src="contribute.js" defer></script>
`

const statusMain = () => `    <header class="hero">
      <p class="hero-brand" translate="no">Open Matchday</p>
      <h1 class="page-title">Submission status</h1>
      <p class="lede">
        Look up a contribution by id. Possible states: queued, PR opened,
        changes requested, merged, rejected.
      </p>
    </header>
    <section class="section" aria-labelledby="lookup">
      <h2 id="lookup">Lookup</h2>
      <form id="status-form" class="wizard-form" role="search">
        <label for="submission_id">Submission id</label>
        <div class="search-row">
          <input id="submission_id" name="submission_id" required autocomplete="off" spellcheck="false">
          <button type="submit" class="cta">Check status</button>
        </div>
      </form>
      <p id="status-live" class="meta-line" aria-live="polite">Enter a submission id.</p>
      <pre id="status-preview" class="preview-block" hidden tabindex="0" aria-label="Submission JSON"></pre>
    </section>
    <script>
      window.OM_COMMUNITY_API = ${JSON.stringify(meta.community_api_base)};
    </script>
    <script src="status.js" defer></script>
`

writePage("capabilities.html", capabilitiesMain())
writePage("sports.html", sportsMain())
writePage("themes.html", themesMain())
writePage("assets.html", assetsMain())
writePage("registry.html", registryMain())
writePage("contribute.html", contributeMain())
writePage("status.html", statusMain())

for (const page of PUBLIC_PAGES) {
  if (
    page.file === "capabilities.html" ||
    page.file === "sports.html" ||
    page.file === "themes.html" ||
    page.file === "assets.html" ||
    page.file === "registry.html" ||
    page.file === "contribute.html" ||
    page.file === "status.html"
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
  join(siteDir, "contribute.js"),
  `(() => {
  const api = window.OM_COMMUNITY_API
  if (!api) return
  const authStatus = document.getElementById("auth-status")
  const signIn = document.getElementById("google-sign-in")
  const signOut = document.getElementById("sign-out")
  const form = document.getElementById("contribute-form")
  const wizardStatus = document.getElementById("wizard-status")
  const preview = document.getElementById("wizard-preview")
  if (!authStatus || !signIn || !form || !wizardStatus || !preview) return

  const returnTo = window.location.href.split("#")[0]
  signIn.href = api + "/v1/auth/google/start?return_to=" + encodeURIComponent(returnTo)

  const setStatus = (text) => { wizardStatus.textContent = text }

  const refreshSession = () =>
    fetch(api + "/v1/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((body) => {
        if (body.signed_in) {
          authStatus.textContent = "Signed in. Google email is never shown here."
          if (signOut) signOut.hidden = false
        } else {
          authStatus.textContent = "Not signed in. Use Google sign-in when the community API has OIDC credentials configured."
          if (signOut) signOut.hidden = true
        }
      })
      .catch(() => {
        authStatus.textContent = "Could not reach community API at " + api
      })

  if (signOut) {
    signOut.addEventListener("click", () => {
      fetch(api + "/v1/auth/logout", { method: "POST", credentials: "include" })
        .finally(refreshSession)
    })
  }

  const readDraft = async () => {
    const fd = new FormData(form)
    const isMinor = form.querySelector("#is_minor")?.checked === true
    let photoAssetId = null
    const fileInput = form.querySelector("#photo_file")
    if (fileInput?.files?.[0] && !isMinor) {
      const upload = new FormData()
      upload.append("file", fileInput.files[0])
      const res = await fetch(api + "/v1/images", {
        method: "POST",
        credentials: "include",
        body: upload,
      })
      const body = await res.json()
      if (!body.ok) throw new Error(body.error || "image upload failed")
      photoAssetId = body.asset.id
    }
    const player = {
      id: String(fd.get("player_id") || ""),
      name: String(fd.get("player_name") || ""),
      is_minor: isMinor,
    }
    if (photoAssetId) {
      player.photo_asset_id = photoAssetId
      player.photo = {
        attribution: String(fd.get("photo_attribution") || ""),
        license: String(fd.get("photo_license") || ""),
      }
    }
    return {
      sport_id: String(fd.get("sport_id") || ""),
      category_id: String(fd.get("category_id") || ""),
      competition_id: String(fd.get("competition_id") || ""),
      club: {
        id: String(fd.get("club_id") || ""),
        name: String(fd.get("club_name") || ""),
        country_id: String(fd.get("country_id") || ""),
      },
      team: {
        id: String(fd.get("team_id") || ""),
        name: String(fd.get("team_name") || ""),
      },
      season: {
        id: String(fd.get("season_id") || ""),
        name: String(fd.get("season_name") || ""),
      },
      players: [player],
      memberships: [{
        player_id: player.id,
        number: String(fd.get("player_number") || ""),
        position_id: String(fd.get("position_id") || "") || undefined,
      }],
    }
  }

  const showPreview = (data) => {
    preview.hidden = false
    preview.textContent = JSON.stringify(data, null, 2)
  }

  document.getElementById("btn-validate")?.addEventListener("click", async () => {
    try {
      const draft = await readDraft()
      const res = await fetch(api + "/v1/wizard/validate", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft }),
      })
      const body = await res.json()
      if (!body.ok) {
        setStatus("Validation failed: " + (body.errors || []).join("; "))
        return
      }
      setStatus("Validation passed.")
    } catch (err) {
      setStatus(String(err.message || err))
    }
  })

  document.getElementById("btn-preview")?.addEventListener("click", async () => {
    try {
      const draft = await readDraft()
      const handle = form.querySelector("#handle")?.value || "preview_handle"
      const profile_url = form.querySelector("#profile_url")?.value || undefined
      const res = await fetch(api + "/v1/wizard/preview", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft, handle, profile_url }),
      })
      const body = await res.json()
      if (!body.ok) {
        setStatus("Preview failed: " + (body.errors || [body.error]).join("; "))
        return
      }
      setStatus("Exact public preview ready.")
      showPreview(body.preview)
    } catch (err) {
      setStatus(String(err.message || err))
    }
  })

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    try {
      const draft = await readDraft()
      const handle = form.querySelector("#handle")?.value
      const profile_url = form.querySelector("#profile_url")?.value || undefined
      const rights_confirmed = form.querySelector("#rights_confirmed")?.checked === true
      const consent_confirmed = form.querySelector("#consent_confirmed")?.checked === true
      let idem = sessionStorage.getItem("om_idempotency_key")
      if (!idem) {
        idem = "web-" + crypto.randomUUID()
        sessionStorage.setItem("om_idempotency_key", idem)
      }
      const res = await fetch(api + "/v1/wizard/submit", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draft,
          handle,
          profile_url,
          rights_confirmed,
          consent_confirmed,
          idempotency_key: idem,
        }),
      })
      const body = await res.json()
      if (!body.ok) {
        setStatus("Submit failed: " + (body.errors || [body.error]).join("; "))
        return
      }
      sessionStorage.removeItem("om_idempotency_key")
      setStatus(
        (body.created ? "Queued " : "Existing ") +
          body.submission.id +
          " (" + body.submission.status + "). Open status.html to track it.",
      )
      showPreview(body.submission)
    } catch (err) {
      setStatus(String(err.message || err))
    }
  })

  refreshSession()
})()
`,
)

writeFileSync(
  join(siteDir, "status.js"),
  `(() => {
  const api = window.OM_COMMUNITY_API
  const form = document.getElementById("status-form")
  const input = document.getElementById("submission_id")
  const live = document.getElementById("status-live")
  const preview = document.getElementById("status-preview")
  if (!api || !form || !input || !live || !preview) return

  const params = new URLSearchParams(window.location.search)
  if (params.get("id")) input.value = params.get("id")

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const id = input.value.trim()
    if (!id) return
    live.textContent = "Loading…"
    try {
      const res = await fetch(api + "/v1/submissions/" + encodeURIComponent(id))
      const body = await res.json()
      if (!body.ok) {
        live.textContent = "Not found."
        preview.hidden = true
        return
      }
      live.textContent = "Status: " + body.submission.status
      preview.hidden = false
      preview.textContent = JSON.stringify(body.submission, null, 2)
      const url = new URL(window.location.href)
      url.searchParams.set("id", id)
      history.replaceState(null, "", url)
    } catch (err) {
      live.textContent = String(err.message || err)
    }
  })

  if (input.value) form.requestSubmit()
})()
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
  `SITE_GENERATE_OK pages=${PUBLIC_PAGES.length} sports_available=${sports.available.length} sports_planned=${sports.planned.length} themes=${themes.themes.length} assets_packages=${assets.packages.length} registry_entries=${teams.entries.length}`,
)

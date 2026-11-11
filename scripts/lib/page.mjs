export const PUBLIC_PAGES = [
  { file: "index.html", title: "Open Matchday -- local sports broadcast production", description: "Open Matchday turns phones and tablets into a local sports broadcast crew: cameras, scoreboard OCR, clocks, graphics, and Program outputs without requiring the Internet.", nav: "Product", index: true },
  { file: "workflow.html", title: "Workflow -- Open Matchday", description: "Matchday workflow: install, open an event, pair devices, calibrate OCR, operate clocks and graphics, cut Program, then export.", nav: "Workflow", index: true },
  { file: "downloads.html", title: "Downloads -- Open Matchday", description: "Open Matchday source repositories and build entry points. No store packages are claimed until a release publishes them.", nav: "Downloads", index: true },
  { file: "docs.html", title: "Docs -- Open Matchday", description: "Entry point to Open Matchday operator, developer, and contributor documentation in the docs repository.", nav: "Docs", index: true },
  { file: "capabilities.html", title: "Capabilities -- Open Matchday", description: "Generated capability matrix for Open Matchday roles and platforms. States are verified, partial, unverified, or out of scope.", nav: "Capabilities", index: true },
  { file: "sports.html", title: "Sports catalog -- Open Matchday", description: "Generated sport catalog: available basketball and futsal packages plus planned later sports listed without empty playable shells.", nav: "Sports", index: true },
  { file: "themes.html", title: "Themes catalog -- Open Matchday", description: "Generated declarative theme catalog for Open Matchday graphics packages.", nav: "Themes", index: true },
  { file: "registry.html", title: "Registry browser -- Open Matchday", description: "Search the public Open Matchday teams registry index. Shipped fixtures are clearly fictional.", nav: "Registry", index: true },
  { file: "privacy.html", title: "Privacy -- Open Matchday", description: "Open Matchday privacy stub: local-first production, public registry fields, minors photo rules, and how to request takedowns.", nav: "Privacy", index: true },
  { file: "takedown.html", title: "Takedown -- Open Matchday", description: "How to request removal of public registry content from Open Matchday. Git history erasure is not promised.", nav: "Takedown", index: true },
]

export const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

export const renderNav = (currentFile) =>
  PUBLIC_PAGES.map((page) => {
    const current = page.file === currentFile ? ' aria-current="page"' : ""
    return `        <a href="${page.file}"${current}>${page.nav}</a>`
  }).join("\n")

export const renderHead = ({ page, meta, absoluteUrl }) => {
  const canonical = absoluteUrl(page.file)
  const robots = page.index ? "index,follow" : "noindex,nofollow"
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: meta.site_name,
      url: meta.base_url,
    },
    publisher: {
      "@type": "Organization",
      name: meta.organization.name,
      url: meta.organization.url,
    },
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="${escapeHtml(meta.theme_color)}">
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(meta.site_name)}" translate="no">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(meta.organization.logo)}">
  <meta property="og:locale" content="en_US">
  <link rel="stylesheet" href="styles.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>`
}

export const renderChromeStart = (page) => `<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="site-header-inner">
      <a class="brand-lockup" href="index.html"${page.file === "index.html" ? ' aria-current="page"' : ""} aria-label="Open Matchday home">
        <img class="brand-mark" src="mark.svg" width="40" height="40" alt="">
        <span class="brand-name" translate="no">Open Matchday</span>
      </a>
      <nav class="site-nav" aria-label="Primary">
${renderNav(page.file)}
      </nav>
    </div>
  </header>
  <main id="main">`

export const renderChromeEnd = () => `  </main>
  <footer class="site-footer">
    <div class="site-footer-inner">
      <p translate="no">Open Matchday -- MIT</p>
      <p>
        <a href="https://github.com/OpenMatchday">GitHub organization</a>
        ·
        <a href="privacy.html">Privacy</a>
        ·
        <a href="takedown.html">Takedown</a>
      </p>
    </div>
  </footer>
</body>
</html>
`

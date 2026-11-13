# Open Matchday -- website

Product website, capability and sport catalogs, registry browser, and contribution wizard entry points.

Part of the [OpenMatchday](https://github.com/OpenMatchday) organization.

## Hosting (D6)

Provisional host: **GitHub Pages** from this repository as a **project site**.

- Default URL: `https://openmatchday.github.io/website/`
- Organization root (`https://openmatchday.github.io/`) requires a separate repository named `OpenMatchday.github.io` per [GitHub Pages site types](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). That repo does not exist; this project does not invent a custom domain.
- Publish path: GitHub Actions workflow `.github/workflows/pages.yml` uploading the `site/` static artifact (`build_type=workflow`).
- Client artifact must contain no server secrets (checked by `scripts/check-site.mjs`).

Spike details: sibling `docs` repo `spikes/d6-website-stack-hosting.md`.

## Pages

| Page | File | Notes |
|---|---|---|
| Product | `index.html` | Brand-first overview |
| Workflow | `workflow.html` | Matchday journey |
| Downloads | `downloads.html` | Source links only |
| Docs | `docs.html` | Entry to docs repo |
| Capabilities | `capabilities.html` | Generated from `data/capability-matrix.v0.json` |
| Sports | `sports.html` | Generated from sports catalog |
| Themes | `themes.html` | Generated from themes catalog |
| Registry | `registry.html` | Client search over teams index |
| Privacy | `privacy.html` | Local-first + registry privacy stub |
| Takedown | `takedown.html` | Public takedown stub |

AC-12.3: real screenshots only; none shipped yet.

Contribution wizard (`contribute.html`) and status (`status.html`) call the community API at `community_api_base` from `data/site-meta.v0.json`. No server secrets in this repo.

## Catalog sync and generate

From a full workspace checkout (siblings present):

```bash
npm run sync
npm run generate
npm run check
```

CI regenerates from committed `data/*.json` and runs `scripts/check-site.mjs` (secrets scan, WCAG smoke, 320px CSS gate, performance budget, SEO tags, planned-sport non-playable rule).

## SEO sources

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Robots meta](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Open Graph protocol](https://ogp.me/)

## License

MIT. See [LICENSE](LICENSE).

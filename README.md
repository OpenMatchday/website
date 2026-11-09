# Open Matchday -- website

Product website, capability and sport catalogs, registry browser, and contribution wizard.

Part of the [OpenMatchday](https://github.com/OpenMatchday) organization.

## Hosting (D6)

Provisional host: **GitHub Pages** from this repository as a **project site**.

- Default URL: `https://openmatchday.github.io/website/`
- Organization root (`https://openmatchday.github.io/`) requires a separate repository named `OpenMatchday.github.io` per [GitHub Pages site types](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). That repo does not exist; this spike does not invent a custom domain.
- Publish path: GitHub Actions workflow `.github/workflows/pages.yml` uploading the `site/` static artifact (`build_type=workflow`).
- Client artifact must contain no server secrets (checked by `scripts/check-site.mjs`).

Spike details: sibling `docs` repo `spikes/d6-website-stack-hosting.md`.

## Local checks

```bash
node scripts/check-site.mjs
```

## License

MIT. See [LICENSE](LICENSE).

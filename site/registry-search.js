(() => {
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

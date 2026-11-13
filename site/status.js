(() => {
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

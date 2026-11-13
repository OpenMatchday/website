(() => {
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

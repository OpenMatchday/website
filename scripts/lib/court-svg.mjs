const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

const pathFromPoints = (points) =>
  points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ") + " Z"

const strokeFromPoints = (points) =>
  points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ")

export const renderFieldSvg = ({ field, formation = null, title }) => {
  const length = field.length
  const width = field.width
  const pad = Math.max(length, width) * 0.04
  const viewW = length + pad * 2
  const viewH = width + pad * 2
  const shapes = []

  for (const marking of field.markings ?? []) {
    const g = marking.geometry
    if (!g) continue
    if (g.type === "polygon") {
      shapes.push(
        `<path d="${pathFromPoints(g.points)}" fill="none" stroke="currentColor" stroke-width="${marking.kind === "boundary" ? 0.18 : 0.08}" vector-effect="non-scaling-stroke" />`,
      )
    } else if (g.type === "polyline") {
      shapes.push(
        `<path d="${strokeFromPoints(g.points)}" fill="none" stroke="currentColor" stroke-width="0.1" vector-effect="non-scaling-stroke" />`,
      )
    } else if (g.type === "circle") {
      const [cx, cy] = g.points[0]
      const sw = marking.kind === "goal" ? 0.14 : 0.08
      shapes.push(
        `<circle cx="${cx}" cy="${cy}" r="${g.radius}" fill="none" stroke="currentColor" stroke-width="${sw}" vector-effect="non-scaling-stroke" />`,
      )
    }
  }

  const slots = []
  if (formation) {
    for (const slot of formation.slots) {
      const x = slot.x * length
      const y = slot.y * width
      const label = slot.position_id.replaceAll("_", " ")
      slots.push(`<g transform="translate(${x} ${y})">
        <circle r="0.55" class="slot-dot" />
        <text y="1.35" text-anchor="middle" font-size="0.7" class="slot-label">${escape(label)}</text>
      </g>`)
    }
  }

  return `<svg class="asset-svg" viewBox="${-pad} ${-pad} ${viewW} ${viewH}" role="img" aria-label="${escape(title)}">
  <rect x="${-pad}" y="${-pad}" width="${viewW}" height="${viewH}" class="asset-pitch-bg" />
  <g class="asset-markings">${shapes.join("")}</g>
  <g class="asset-slots">${slots.join("")}</g>
</svg>`
}

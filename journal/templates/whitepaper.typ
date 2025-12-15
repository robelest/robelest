// ═══════════════════════════════════════════════════════════════════════════════
// WHITEPAPER TEMPLATE — Scholarly Editorial
// A refined academic template with elegant typography and clear hierarchy
// ═══════════════════════════════════════════════════════════════════════════════


#let whitepaper(
  title: none,
  author: "Robel Estifanos",
  date: datetime.today().display("[month repr:long] [day], [year]"),
  abstract: none,
  show-toc: true,
  body
) = {
  // ─────────────────────────────────────────────────────────────────────────────
  // DOCUMENT SETUP
  // ─────────────────────────────────────────────────────────────────────────────
  set document(title: title, author: author)

  // Page geometry - generous margins for readability
  set page(
    paper: "us-letter",
    margin: (
      top: 1.25in,
      bottom: 1in,
      inside: 1.25in,
      outside: 1.25in,
    ),
    header: context {
      if counter(page).get().first() > 1 {
        set text(size: 7.5pt, fill: luma(120), tracking: 0.04em)
        smallcaps(title)
        h(1fr)
        text[#counter(page).display()]
      }
    },
    footer: context {
      if counter(page).get().first() == 1 {
        set text(size: 7.5pt, fill: luma(150))
        h(1fr)
        text[#author]
        h(1fr)
      }
    }
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPOGRAPHY
  // ─────────────────────────────────────────────────────────────────────────────

  // Body text - Libertinus for scholarly feel, or fallback to system serif
  set text(
    font: ("Libertinus Serif", "Linux Libertine", "Georgia"),
    size: 10pt,
    weight: "regular",
    lang: "en",
  )

  // Paragraphs - justified with subtle first-line indent
  set par(
    justify: true,
    leading: 0.72em,
    first-line-indent: 0em,  // We'll handle this contextually
  )

  // Headings configuration
  set heading(numbering: "1.1")

  // ─────────────────────────────────────────────────────────────────────────────
  // HEADING STYLES
  // ─────────────────────────────────────────────────────────────────────────────

  // Level 1 headings - Section titles
  show heading.where(level: 1): it => {
    set text(size: 12pt, weight: "regular")
    v(1.5em)
    block[
      #text(
        font: ("SF Pro Display", "Helvetica Neue", "Arial"),
        size: 8pt,
        weight: "semibold",
        tracking: 0.1em,
        fill: luma(100)
      )[
        #upper(it.body)
      ]
    ]
    v(0.3em)
    line(length: 100%, stroke: 0.5pt + luma(220))
    v(0.8em)
  }

  // Level 2 headings - Subsections
  show heading.where(level: 2): it => {
    set text(size: 11pt, weight: "medium")
    v(1.2em)
    block[
      #text(weight: "semibold")[#it.body]
    ]
    v(0.5em)
  }

  // Level 3 headings - Minor subsections
  show heading.where(level: 3): it => {
    set text(size: 10pt, weight: "medium", style: "italic")
    v(1em)
    block[#it.body]
    v(0.3em)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TITLE BLOCK
  // ─────────────────────────────────────────────────────────────────────────────

  {
    set align(left)

    // Title
    text(
      size: 18pt,
      weight: "regular",
      tracking: -0.01em,
    )[#title]

    v(1em)

    // Author & Date line
    text(
      font: ("SF Pro Text", "Helvetica Neue", "Arial"),
      size: 8.5pt,
      fill: luma(100),
    )[
      #author #h(1em) #sym.dot.c #h(1em) #date
    ]

    v(0.5em)
    line(length: 100%, stroke: 0.75pt + luma(200))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ABSTRACT
  // ─────────────────────────────────────────────────────────────────────────────

  if abstract != none {
    v(1.5em)
    block(
      width: 100%,
      inset: (left: 0.75em),
      stroke: (left: 1.5pt + luma(200)),
    )[
      #set text(size: 9.5pt, fill: luma(80))
      #set par(leading: 0.65em)
      #abstract
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TABLE OF CONTENTS
  // ─────────────────────────────────────────────────────────────────────────────

  if show-toc {
    v(2em)

    // TOC header
    text(
      font: ("SF Pro Display", "Helvetica Neue", "Arial"),
      size: 8pt,
      weight: "semibold",
      tracking: 0.1em,
      fill: luma(100)
    )[CONTENTS]

    v(0.5em)

    outline(
      title: none,
      indent: 1em,
      depth: 2,
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BODY CONTENT
  // ─────────────────────────────────────────────────────────────────────────────

  v(2em)

  // Set first-line indent for body paragraphs (not after headings)
  set par(first-line-indent: 1.5em)

  body
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Code block with optional language label
#let code-block(lang: none, body) = {
  block(
    fill: luma(248),
    stroke: 0.5pt + luma(230),
    inset: 1em,
    radius: 2pt,
    width: 100%,
  )[
    #set text(font: ("JetBrains Mono", "SF Mono", "Consolas"), size: 8.5pt)
    #set par(leading: 0.55em)
    #if lang != none [
      #place(top + right, dx: -0.5em, dy: -0.5em)[
        #text(fill: luma(160), size: 7pt, tracking: 0.05em)[#upper(lang)]
      ]
    ]
    #body
  ]
}

// Callout/admonition box
#let callout(title: none, body, kind: "note") = {
  let accent = if kind == "warning" { rgb("#d4a72c") }
    else if kind == "error" { rgb("#c94242") }
    else if kind == "tip" { rgb("#3d8b40") }
    else { rgb("#c25d3a") }  // default: note

  block(
    width: 100%,
    inset: (left: 1em, y: 0.75em, right: 0.75em),
    stroke: (left: 2pt + accent),
    fill: luma(252),
  )[
    #if title != none [
      #text(
        font: ("SF Pro Text", "Helvetica Neue", "Arial"),
        size: 8pt,
        weight: "semibold",
        fill: accent,
        tracking: 0.03em,
      )[#upper(title)]
      #v(0.3em)
    ]
    #set text(size: 9.5pt)
    #body
  ]
}

// Margin note (placed in outer margin)
#let margin-note(body) = {
  place(
    right,
    dx: 1.5in,
    float: true,
  )[
    #set text(size: 8pt, fill: luma(100))
    #set par(leading: 0.55em)
    #block(width: 1.25in)[#body]
  ]
}

// Pull quote - for emphasis
#let pull-quote(body) = {
  v(1em)
  block(
    width: 100%,
    inset: (x: 2em, y: 1em),
  )[
    #set text(size: 11pt, style: "italic", fill: luma(60))
    #set par(leading: 0.7em)
    #body
  ]
  v(1em)
}

// Figure with caption
#let fig(body, caption: none, placement: auto) = {
  figure(
    body,
    caption: if caption != none {
      text(size: 8.5pt)[#caption]
    },
    placement: placement,
  )
}

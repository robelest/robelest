// ═══════════════════════════════════════════════════════════════════════════════
// WHITEPAPER TEMPLATE — Editorial Design
// A refined template with distinctive title page and warm color palette
// Matches the web portfolio aesthetic
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// THEME COLORS — Warm Editorial Palette
// ─────────────────────────────────────────────────────────────────────────────

#let th-base = rgb("#faf8f5")
#let th-text = rgb("#1a1816")
#let th-muted = rgb("#8c8780")
#let th-subtle = rgb("#6b665f")
#let th-accent = rgb("#c25d3a")
#let th-border = rgb("#e8e4dc")
#let th-surface = rgb("#f5f2ed")

// Font stacks
#let serif-fonts = ("Libertinus Serif", "Linux Libertine", "Crimson Pro", "Georgia")
#let sans-fonts = ("SF Pro Display", "Helvetica Neue", "Arial", "sans-serif")
#let mono-fonts = ("JetBrains Mono", "SF Mono", "Consolas", "monospace")


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

  // Page geometry
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
        set text(size: 7.5pt, fill: th-muted, tracking: 0.04em)
        smallcaps(title)
        h(1fr)
        text[#counter(page).display()]
      }
    },
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPOGRAPHY
  // ─────────────────────────────────────────────────────────────────────────────

  set text(
    font: serif-fonts,
    size: 10pt,
    weight: "regular",
    fill: th-text,
    lang: "en",
  )

  set par(
    justify: true,
    leading: 0.58em,
    first-line-indent: 0em,
  )

  set heading(numbering: "1.1")

  // ─────────────────────────────────────────────────────────────────────────────
  // HEADING STYLES
  // ─────────────────────────────────────────────────────────────────────────────

  // Level 1 headings - Section titles with accent
  show heading.where(level: 1): it => {
    set text(size: 12pt, weight: "regular")
    v(0.8em)
    block[
      #text(
        font: sans-fonts,
        size: 8pt,
        weight: "semibold",
        tracking: 0.1em,
        fill: th-accent
      )[
        #upper(it.body)
      ]
    ]
    v(0.15em)
    line(length: 100%, stroke: 0.5pt + th-border)
    v(0.35em)
  }

  // Level 2 headings
  show heading.where(level: 2): it => {
    set text(size: 11pt, weight: "medium", fill: th-text)
    v(0.7em)
    block[
      #text(weight: "semibold")[#it.body]
    ]
    v(0.25em)
  }

  // Level 3 headings
  show heading.where(level: 3): it => {
    set text(size: 10pt, weight: "medium", style: "italic", fill: th-text)
    v(0.5em)
    block[#it.body]
    v(0.15em)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TITLE PAGE — Split Layout
  // ─────────────────────────────────────────────────────────────────────────────

  {
    // Two-column grid: logo/author on left, title/abstract on right
    grid(
      columns: (100pt, 1fr),
      column-gutter: 2em,
      // Left column: Logo + Author info
      [
        #image("logo.svg", width: 60pt)
        #v(1.5em)
        #text(
          font: sans-fonts,
          size: 8.5pt,
          fill: th-muted,
        )[
          #author
        ]
        #v(0.3em)
        #text(
          font: sans-fonts,
          size: 8pt,
          fill: th-muted,
        )[
          #date
        ]
      ],
      // Right column: Title + Abstract
      [
        #text(
          size: 20pt,
          weight: "regular",
          tracking: -0.01em,
          fill: th-text,
        )[#title]
        #v(0.6em)
        #line(length: 50pt, stroke: 1.5pt + th-accent)
        #v(1em)
        #if abstract != none [
          #set text(size: 9.5pt, fill: th-subtle, style: "italic")
          #set par(leading: 0.65em, justify: false)
          #abstract
        ]
      ]
    )
  }

  // Divider line
  v(1.5em)
  line(length: 100%, stroke: 0.5pt + th-border)

  // ─────────────────────────────────────────────────────────────────────────────
  // TABLE OF CONTENTS
  // ─────────────────────────────────────────────────────────────────────────────

  if show-toc {
    v(1.5em)

    text(
      font: sans-fonts,
      size: 8pt,
      weight: "semibold",
      tracking: 0.1em,
      fill: th-muted
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

  set par(first-line-indent: 1.5em)

  body
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Code block with optional language label
#let code-block(lang: none, body) = {
  block(
    fill: th-surface,
    stroke: 0.5pt + th-border,
    inset: 1em,
    radius: 2pt,
    width: 100%,
  )[
    #set text(font: mono-fonts, size: 8.5pt, fill: th-text)
    #set par(leading: 0.55em)
    #if lang != none [
      #place(top + right, dx: -0.5em, dy: -0.5em)[
        #text(fill: th-muted, size: 7pt, tracking: 0.05em)[#upper(lang)]
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
    else { th-accent }  // default: note

  block(
    width: 100%,
    inset: (left: 1em, y: 0.75em, right: 0.75em),
    stroke: (left: 2pt + accent),
    fill: th-surface,
  )[
    #if title != none [
      #text(
        font: sans-fonts,
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
    #set text(size: 8pt, fill: th-muted)
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
    #set text(size: 11pt, style: "italic", fill: th-subtle)
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
      text(size: 8.5pt, fill: th-subtle)[#caption]
    },
    placement: placement,
  )
}

// Accent line separator
#let separator() = {
  v(1em)
  align(center)[
    #line(length: 30%, stroke: 0.75pt + th-accent)
  ]
  v(1em)
}

// Styled blockquote with accent border
#let styled-quote(body, attribution: none) = {
  block(
    width: 100%,
    inset: (left: 1.25em, y: 0.5em),
    stroke: (left: 2pt + th-accent),
  )[
    #set text(style: "italic", fill: th-subtle)
    #body
    #if attribution != none [
      #v(0.5em)
      #align(right)[
        #text(size: 9pt, style: "normal", fill: th-muted)[— #attribution]
      ]
    ]
  ]
}

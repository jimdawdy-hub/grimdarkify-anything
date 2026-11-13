# Required fan-content treatment

Every themed output is free, non-commercial, and clearly unofficial. Use original ornament and respect Games Workshop's goodwill. Keep official logos, faction badges, copied illustrations, and other artists' work out of generated assets.

The CLI's `notice` command is the authoritative source of the full notice. `kit` includes `NOTICE.txt`, a styled HTML footer, and a visible SVG watermark. Embed those outputs rather than paraphrasing away ownership or the absence of endorsement.

## Place the notice where the output lives

- Web pages: a visible shared footer, readable at phone and desktop widths, retained in print.
- Images, screenshots, and static mockups: bake in the small print before export. A caption outside the image is insufficient.
- Theme files and token JSON: include notice metadata; ship an accompanying visible preview and a notice file.
- Native apps: About/help plus the theme preview and distributable metadata.
- PDFs and slide decks: small print on every standalone page or slide that might be shared separately.
- Agent briefs and generated documents: full notice in the document itself.

Use at least 11–12px text for webpage small print and strong contrast. The notice belongs in the normal reading flow, not behind a hover, toggle, clipped overflow, or transient toast.

## What the notice means

It is an authored project requirement, not a GW-approved disclaimer or a licence. Static fan-art guidance must not be represented as blanket permission for software, live apps, or AI-generated Warhammer content. A notice cannot cure missing rights.

Official references: [Games Workshop legal](https://www.warhammer.com/en-GB/legal), [Warhammer Community terms](https://www.warhammer-community.com/en-gb/terms-of-use/). On 2026-11-13 the legal page returned HTTP 403 to automated research, so its current fan-art/software boundary was not independently verified. The accessible Community terms reserve artwork rights and prohibit using site content to train generative AI. This toolkit links to visual references; it does not bundle an art dataset or train a model on them.

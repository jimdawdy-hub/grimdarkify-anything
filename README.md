# Grimdarkify Anything

**Take a perfectly reasonable website. Turn it into an utterly unreasonable war machine.**

An outrageously excessive, unofficial Warhammer 40,000 fan-parody toolkit. Reimagine the typography, architecture, branding, mascot, copy, and ornament of an app while keeping its real controls working. The same faction settings produce a different incarnation each run.

**[Enter the forge](https://jimdawdy-hub.github.io/grimdarkify-anything/) · [Agent skill](skills/grimdarkify-anything/SKILL.md) · [Art and font credits](assets/ASSET-CREDITS.md) · [Fan notice](NOTICE.md)**

![Freecase transformed into an extravagant Adeptus Arbites fortress-courthouse, with blackletter typography, brass frames, red wax seals, and a servo-skull replacing its owl mascot. Unofficial noncommercial fan parody.](docs/images/forge.png)

## The brief is excess

Imperial interfaces become gilded cathedral machines: huge blackletter, skulls, armor, cables, seals, parchment, and altogether too much ceremonial importance. Orks get noisy scrapwork. T’au get absurdly advanced instrumentation. Drukhari get predatory blades, poison light, and theatrical cruelty. Every faction gets its own shape language and visual jokes.

The live showcase starts with an **Adeptus Arbites parody of Freecase**: Nomo is reimagined as a flying cybernetic skull-law-clerk, the search form petitions the archives, and a perfectly ordinary research task receives the full weight of an imaginary galactic bureaucracy. The showcase's records are explicitly fictional; it is a separate demonstration, not the live Freecase service.

The agent skill requires four visible things in the first viewport: faction typography, a transformed character or major illustration, a theatrical environment, and excessive faction ornament. A coding agent can regenerate the whole target-specific composition and mascot; the CLI supplies a strong starting treatment.

## What ships

- **50 faction and primarch profiles**, including Adeptus Arbites, Drukhari, T’au, Orks, the major armies, and 19 named primarchs covering 18 known legion lineages. Alpharius and Omegon have separate profiles; lost identities are not invented.
- **Real display fonts**, bundled with their original SIL Open Font Licences: UnifrakturCook, UnifrakturMaguntia, Pirata One, Black Ops One, Orbitron, and Metal Mania.
- **Original fan assets:** a detailed servo-skull law librarian, fortress-tribunal architecture, and generated faction crests. The original mascot image has its unofficial notice baked in.
- **Fresh visible variation:** display type, palettes, armor/frame treatment, material, ornament, composition, glow, and staging. Explicit seeds can replay favorite results.
- **An offline CLI and reusable agent skill.** No runtime dependencies, model calls, API keys, or paid API use are required for local theme generation. Deeper AI redesigns use your existing coding-agent tools and provider.
- **Mandatory notices** on pages, inside exported images, and in theme metadata. Original fonts retain their licence notices in generated outputs.

## Quick start

Node.js 22 or newer:

```bash
git clone https://github.com/jimdawdy-hub/grimdarkify-anything.git
cd grimdarkify-anything
node bin/grimdarkify.mjs kit --faction adeptus-arbites --out ./tribunal
```

Open `tribunal/preview.html` and give `tribunal/brief.md` to your coding agent with the target project. The kit contains:

```text
tribunal/
  theme.css          real embedded fonts, fan art, and theatrical CSS
  tokens.json        faction, visual settings, variation seed, and notice
  brief.md           instructions for this original parody transformation
  preview.html       working preview with an extravagant research familiar
  study.svg          original fan crest, including visible small print
  notice.html        visible page footer
  watermark.svg      small print for image and document exports
  NOTICE.txt         full fan notice
  FONT-LICENSES.txt  original bundled font licences
```

The stylesheet embeds its font and art resources so the kit can work offline. Use a **new output path** for another incarnation; existing work is never overwritten.

## Choose a faction

```bash
node bin/grimdarkify.mjs factions
node bin/grimdarkify.mjs kit --faction orks --out ./scrap-yard
node bin/grimdarkify.mjs kit --faction drukhari --out ./knife-palace
node bin/grimdarkify.mjs kit --faction tau-empire --out ./greater-good
node bin/grimdarkify.mjs kit --faction primarch-sanguinius --out ./blood-sanctum
node bin/grimdarkify.mjs kit --faction primarch-vulkan --out ./forge-temple
```

The [catalogue](data/factions.json) supplies faction identity. The agent invents a target-specific composition, character transformation, and joke. The supplied servo-skull is an Imperial example, not a requirement to use the same character for every faction.

To reproduce a favored variant, use its recorded seed:

```bash
node bin/grimdarkify.mjs kit --faction adeptus-arbites --seed my-favorite --out ./replay
```

## Transform HTML or a URL

```bash
node bin/grimdarkify.mjs html ./index.html --out ./index.grimdark.html --faction adeptus-arbites
node bin/grimdarkify.mjs website https://example.com --out ./parody.html --faction orks
```

Local outputs stay beside the source so its existing assets continue to resolve. The adapter injects a theatrical theme and crest, adds a familiar, and marks recognizable mascot images such as Nomo/the owl for servo-skull replacement. Existing forms, links, and scripts are preserved.

URL mode fetches a static HTML snapshot. Original resources and scripts can still contact their own servers; this does not copy a backend or fully capture a client-rendered app. For a full source transformation, let a browser-capable coding agent apply a generated brief. Pages with an inline Content Security Policy use their existing asset pipeline instead of injected styles.

## Use with your coding agent

For Claude Code, copy the skill into the target project:

```bash
mkdir -p /path/to/your-app/.claude/skills
cp -R skills/grimdarkify-anything /path/to/your-app/.claude/skills/
```

Use `.agents/skills` for agents following that convention, or give your agent [SKILL.md](skills/grimdarkify-anything/SKILL.md) and a generated brief directly.

Example request:

> Grimdarkify this website as Adeptus Arbites. Make it an absolutely over-the-top parody: giant gothic lettering, a fortress-courthouse, armored panels, wax seals, and the mascot replaced with a servo-skull. Parody the copy and branding while keeping the actual functions working. Use a fresh design and include the unofficial notice in every export. Show the real result on phone and desktop.

Use `node bin/grimdarkify.mjs inspect /path/to/app --json` to inventory source files and package names without executing the target. It skips hidden files, sensitive names, dependency trees, and symlinks. Native apps need editable source or a supported theme interface; the [platform guide](skills/grimdarkify-anything/references/platforms.md) covers those mappings.

## Demo and validation

```bash
npm test
npm run demo
# http://127.0.0.1:4173
```

The showcase has a searchable faction selector, fresh Reforge action, mundane/parody comparison, a fictional search interaction, mascot dialogue, and style/brief/crest exports. `npm run build` produces `_site/`; the included GitHub Pages workflow publishes it.

## Unofficial fan work

**UNOFFICIAL · NON-COMMERCIAL FAN WORK.** Not affiliated with, endorsed, sponsored, or approved by Games Workshop. Warhammer 40,000 and associated IP belong to Games Workshop Limited. No official logos or official artwork are supplied. Fan outputs remain free and non-commercial.

The [notice](NOTICE.md) is a project requirement, not a licence or a claim that static fan-art guidance automatically permits apps or AI-generated fan content. Keep it inside screenshots and standalone images, not just in surrounding captions.

[Official artwork research](docs/research.md) informs original visual interpretations. There is no scraped-art bundle or model training on GW content. [Original tooling code is MIT licensed](LICENSE); [fonts retain their own OFL licences](assets/ASSET-CREDITS.md), and no third-party IP rights are granted.

Inspired by the agent-toolkit approach of [Reverse Engineer Anything](https://github.com/alex-luncan/reverse-engineer-anything) and [Craft Anything](https://github.com/storytold/craft-anything), independently implemented for wildly excessive visual parody.

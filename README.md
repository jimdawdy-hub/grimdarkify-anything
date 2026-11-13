# Grimdarkify Anything

**Your app has a function. Give it a faction.**

An unofficial, non-commercial Warhammer 40,000 inspired design toolkit for coding agents and humans. Reforge websites, apps, and themes while preserving what they do. Choose a faction; get a new visual interpretation every time.

**[Open the forge](https://jimdawdy-hub.github.io/grimdarkify-anything/) · [Agent skill](skills/grimdarkify-anything/SKILL.md) · [Visual research](docs/research.md) · [Fan notice](NOTICE.md)**

![Grimdarkify Anything: faction selector and a functioning task manager transformed into an original gothic-industrial interface. Unofficial non-commercial fan work.](docs/images/forge.png)

## What you get

- **49 selectable faction and primarch styles.** Drukhari, T’au, Orks, Aeldari, Necrons, Tyranids, Votann, Imperial armies, Chaos armies, and more. Nineteen named primarch profiles cover the 18 known legion lineages, including Alpharius and Omegon separately. Lore extras are labeled.
- **Fresh designs, not fixed skins.** Every ordinary run draws fresh entropy to vary colors, frames, typography, texture, proportions, and composition. The agent brief asks for a new target-specific interpretation. An optional seed can replay a result you like.
- **A real CLI.** Generate CSS, JSON tokens, an agent brief, a preview, and mandatory notice assets. Restyle local HTML or create a themed static preview from a URL.
- **A reusable agent skill.** Give your coding agent the visual grammar, platform mappings, and preservation checks to apply the design to your own stack.
- **No paid model required.** Local generation uses Node's built-in APIs. Zero runtime dependencies, API keys, model calls, or artwork downloads.

## Quick start

Node.js 22 or newer:

```bash
git clone https://github.com/jimdawdy-hub/grimdarkify-anything.git
cd grimdarkify-anything
node bin/grimdarkify.mjs kit --faction drukhari --out ./my-kit
```

Open `my-kit/preview.html`. Give `my-kit/brief.md` to your coding agent along with your target project. The kit contains:

```text
my-kit/
  theme.css       original faction-aware stylesheet
  tokens.json     palette, geometry, typography, variation seed, and notice
  brief.md        this variation's instructions for your agent
  preview.html    working local interface sample
  notice.html    visible website footer
  watermark.svg  small print for image/document exports
  study.svg      original faction-aware geometric art, with visible notice
  NOTICE.txt     full fan notice
```

Run the same command again with a **new output path** to get a different result. Existing work is never overwritten.

## Pick your allegiance

```bash
node bin/grimdarkify.mjs factions
node bin/grimdarkify.mjs factions --json
node bin/grimdarkify.mjs kit --faction orks --out ./ork-kit
node bin/grimdarkify.mjs kit --faction tau-empire --out ./tau-kit
node bin/grimdarkify.mjs kit --faction primarch-sanguinius --out ./blood-kit
node bin/grimdarkify.mjs kit --faction primarch-vulkan --out ./forge-kit
```

Browse the full [faction catalogue](data/factions.json). The live demo supports searching by faction, legion, or primarch and reforging the same selection repeatedly. The lost primarchs of II and XI are not assigned invented identities.

To replay a variation, pass the seed recorded in its `tokens.json`:

```bash
node bin/grimdarkify.mjs kit --faction drukhari --seed my-favorite --out ./replay
```

Randomness follows the profile's identity: T’au remains technical and ceramic; Drukhari stays sharp and lacquered; Orks remain assembled from rough plates. It changes visible design properties, not just filenames or hidden IDs. This is constrained procedural generation; the optional coding-agent workflow provides deeper, model-driven redesigns using your existing agent subscription/provider.

## Restyle a website

For an editable local HTML document, put the new file beside the source so relative resources keep working:

```bash
node bin/grimdarkify.mjs html ./index.html --out ./index.grimdark.html --faction necrons
```

Or fetch a public URL and produce a local static preview:

```bash
node bin/grimdarkify.mjs website https://example.com --out ./example.grimdark.html --faction drukhari
```

URL mode fetches HTML, preserves a base URL for remote resources, and injects an original theme plus the fan notice. Existing scripts are preserved and can still contact their original servers. This is a static preview, not a copy of the backend or a complete capture of a client-rendered app. Authenticated sites and complex applications belong in the source-and-agent workflow. Documents with an inline Content Security Policy are left to the project's existing asset pipeline.

For React, Vue, Svelte, native apps, editor themes, or desktop themes, use a generated kit and the [platform guide](skills/grimdarkify-anything/references/platforms.md). There is no claim that CSS can reskin arbitrary closed binaries.

## Use with your coding agent

Install the skill into your target project's skill directory. For Claude Code:

```bash
mkdir -p /path/to/your-app/.claude/skills
cp -R skills/grimdarkify-anything /path/to/your-app/.claude/skills/
```

For an agent using the `.agents/skills` convention, use that directory instead. Or simply give your agent [SKILL.md](skills/grimdarkify-anything/SKILL.md) and a generated brief.

Example prompt:

> Grimdarkify this app as Drukhari. Use a fresh kit and an original composition. Preserve navigation, data, accessibility, and the working forms. Include the unofficial fan notice on every screen and export. Show me the result on mobile and desktop.

The source inventory command helps the agent find the target's stack without running it:

```bash
node bin/grimdarkify.mjs inspect /path/to/your-app --json
```

It inventories a bounded source tree and package names, skips hidden files, sensitive filenames, dependency trees, and symlinks, and does not execute target code.

## Run the demo and checks

```bash
npm test
npm run demo
# Open http://127.0.0.1:4173
```

The demo has a searchable faction selector, a Reforge button, before/after mode, working task controls, and CSS/token/brief/SVG exports. `npm run build` produces `_site/` for static hosting. GitHub Pages publishes it from the included workflow.

## Fan work, references, and rights

**UNOFFICIAL · NON-COMMERCIAL FAN WORK.** Not affiliated with, endorsed, sponsored, or approved by Games Workshop. Warhammer 40,000 and associated IP belong to Games Workshop Limited. No official logos or artwork are included. Fan outputs are for free, non-commercial use.

Every generated kit and themed page carries the notice; it is built into document exports and watermarks. When sharing a screenshot, include the small print inside the image. The [full notice](NOTICE.md) is a project rule, not a licence or a claim that fan-art guidance automatically permits apps or AI-generated fan content.

The aesthetic draws on [linked official artwork references](docs/research.md). The implementation uses original palettes, materials, and geometric decoration. It does not redistribute scraped art or train a model on it. Original toolkit code is [MIT licensed](LICENSE); that licence grants no rights to Games Workshop IP or other third-party work.

Conceptually inspired by the agent-toolkit approach of [Reverse Engineer Anything](https://github.com/alex-luncan/reverse-engineer-anything) and [Craft Anything](https://github.com/storytold/craft-anything). This is a small visual transformation toolkit, independently implemented.

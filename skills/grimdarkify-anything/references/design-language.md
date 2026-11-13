# A faction is a visual language

Start with the activity the interface supports. Preserve the user's mental map and useful names. A task manager still has projects, due dates, and a Save button; it need not become an inscrutable altar.

## Identity and variation

Every profile defines materials, shapes, a color family, and a display-type family. Keep these identity anchors. Fresh randomness chooses a new palette within that family, frame, surface treatment, composition, typographic stack, spacing, and engraving rhythm. The coding agent should go further: choose a new original layout and ornament that suit the actual application.

Generate fresh entropy for ordinary requests. Use a supplied seed only when explicitly replaying a prior design. Never satisfy variation by changing an invisible identifier while leaving the design the same.

| Family | Visual grammar | Variation that stays recognizable |
| --- | --- | --- |
| Imperial / ecclesiastical | Monumental frames, iron, parchment, devotional hierarchy, engraved brass | Vary vault proportions, archive tabs, stone versus metal, the balance of ceremonial and operational surfaces |
| Adeptus Mechanicus | Red enamel, black steel, copper, instruments, machine ritual | Vary rib spacing, instrument dials, furnace light, serial labels, recessed panels |
| Drukhari | Tapering blades, obsidian, acid highlights, sinister elegance | Vary hooked framing, long vertical proportions, lacquer reflectivity, surgical detail; keep controls calm and legible |
| T'au Empire | Ceramic armor, crisp divisions, technical instrumentation, precise accents | Vary panel seams, circles and fins, annotation density, warm versus cool ceramic; avoid gothic arches |
| Orks | Patched plates, crude repairs, bold stencil, hazard markings | Vary mismatched panel widths, rivets, dents and stripes around a stable usable grid |
| Aeldari | Bone-like structures, fluid curves, gem light, elegant verticality | Vary flowing borders, restrained asymmetric columns, translucent highlights; avoid Imperial rivets |
| Necrons | Ancient monoliths, dark metal, thin emerald illumination | Vary stepped geometry, inlaid circuits, recessed obelisks, strong negative space |
| Tyranids | Chitin, ribs, membranes, acidic contrast | Vary layered shells and organic framing without covering text or turning controls into ambiguous decorations |
| Genestealer Cults | Industrial mining, underground signage, stolen equipment | Vary workwear palettes, stamped manifests, utility plates, improvised technical marks |
| Leagues of Votann | Dense engineering, rugged utilitarian forms, ancestral machinery | Vary heavy seams, tool-like controls, squared instrument panels, durable stone/metal balance |
| Chaos | Selectively corrupted symmetry, burnished metal, fractured structure | Vary distortion in the ornament and frames; keep the task hierarchy and content stable |
| Primarchs | The individual legion profile's explicit palette, motifs, and materials | Distinguish heritage from generic Space Marine blue. Fulgrim, Dorn, Corax, Vulkan, and Magnus should never look interchangeable |

The catalogue distinguishes historical legion lineages from current army/supplement choices. Nineteen named primarch profiles include Alpharius and Omegon separately. The identities of the lost II and XI legions are not invented.

## Materials, not wallpaper

Choose one structural motif and one surface treatment per screen. Put original hatch lines, ribbing, panel bevels, rivets, seals, or geometric tracery at edges. Reading and input surfaces stay quiet. Use CSS or original vector geometry, never a scraped-art background.

Use scale deliberately: a large heading, a few strong panels, then smaller operational metadata. Small red/green/amber indicators can carry atmosphere, but text and icons must also convey status.

Typography follows the faction. Manuscript-like serif display type suits a shrine or archive; T'au interfaces call for technical sans type. Use readable body text and monospace for short operational annotations. Avoid long all-caps prose. Supply system fallbacks and respect the licences of any added fonts.

## Function and access

- Keep destructive actions, authentication, and navigation explicit.
- Preserve keyboard order, labels, landmarks, form validation, and states.
- Keep body text at least 4.5:1 against its actual surface, including textures.
- Show a strong focus ring; target at least 44px for primary touch controls.
- Respect `prefers-reduced-motion`. Background atmosphere does not require flashing or constant animation.
- Inspect 390px and 1440px layouts and a real interaction before declaring completion.
- Include the notice in the screenshot itself, not only the page hosting the screenshot.

Official artwork references and evidence limits: [research notes](https://github.com/jimdawdy-hub/grimdarkify-anything/blob/main/docs/research.md).

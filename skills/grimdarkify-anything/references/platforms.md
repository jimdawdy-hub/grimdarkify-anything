# Apply the design through the platform

Use the generated kit's `tokens.json`, `brief.md`, `notice.html`, and watermark. Do not assume CSS can theme every application.

| Target | Integration | Visible fan notice |
| --- | --- | --- |
| Plain HTML | CLI `html`, or import `theme.css` and put `data-grimdark="<faction-id>"` on the root | Append `notice.html` to the page; keep it in print output |
| React, Vue, Svelte, other web source | Import CSS in the shared layout; put root attributes from `preview.html` on the document or themed container; map panels to existing components | Shared footer or persistent About surface; include in exported screenshots |
| Tailwind / design-token systems | Map `--gd-*` to project semantic tokens and apply the selected geometry deliberately | Shared layout and export template |
| Electron / Tauri | Theme the renderer through editable source; preserve native controls and security settings | About/help plus theme preview; visible in shared images |
| VS Code / editor theme | Translate palette into the editor's theme schema; preserve syntax token distinctions and diagnostic severity | Extension description, preview screenshots, About/help where supported; notice metadata in the theme file |
| GTK / Qt / desktop theme | Map colors, fonts and dimensions into the documented theme mechanism; verify widgets on the real toolkit | Theme metadata, About/help or companion notice, and watermarked preview |
| Mobile app with source | Use native semantic colors, text styles, spacing and component states | About/help and watermarked export previews |
| Screenshot / static concept | Rebuild an original study from the visible layout; clearly distinguish concept from working software | Bake the watermark into the image, with readable contrast |
| Closed executable | Identify a documented skin/theme interface or request editable source; otherwise return a concept and explain the limit | Concept watermark plus accompanying notice |

The CLI's `website` command fetches a static HTML snapshot and adds a base URL, theme, and visible notice. Original scripts and resources may still contact their remote origins. It does not bypass authentication, reproduce a server, capture every client-rendered state, or transfer licences for third-party assets. Use editable source and a browser-capable agent for a functional app transformation.

The HTML adapter refuses documents with an inline Content Security Policy. Integrate the external stylesheet in that project's approved asset pipeline instead. Preserve its existing security policy.

# Verdict

**disposition: ship** — for this extension of the existing desktop interface. The reviewed folder, recovery, directory-choice and collapsed-video surfaces are coherent with Orbe's incumbent design. No approved replacement comp applies. This is a screenshot and source review; the reported execution checks are supporting evidence, not tests rerun by this reviewer.

# Coverage

- The Spotify mark is recognizable in both themes; the supplied computed stroke-width check supports the SVG correction.
- Changing the download destination presents an explicit, initially unanswered keep/stop choice. Saving requires a choice, and the copy explains the effect on existing files.
- Multiple source folders, recursive discovery, manual checking, folder relocation and stopping discovery are findable in Settings and through the library's “Pastas de mídia” action.
- Missing records retain context and offer file/folder relocation. Only the row with a recorded download offers “Baixar novamente.” Destructive record removal has an inline confirmation that explains playlist effects. Reported Electron checks cover preservation of favorites, play count and playlist identity after relinking.
- The collapsed player shows static artwork; source keeps the video element mounted but hides its visual surface. The supplied Electron checks establish advancing playback and position preservation on reopening, which a still capture alone cannot establish.
- Linux preparation is represented honestly in PRODUCT.md and docs/linux.md, with packaging targets and CI present. Linux execution and distribution remain unvalidated on this Windows host; this verdict does not certify Linux runtime behavior.

# Screenshots

Opened all six required files: `recovery-dark.png`, `missing-files.png`, `directory-choice.png`, `folders-light.png`, `folders-compact.png`, and `video-cover.png`. Each shows its named state. The focused recovery and directory-choice captures expose the relevant decisions clearly. Long paths wrap, action rows remain readable, and the 1024×760 compact layout fits without horizontal clipping. The video capture shows an unmounted expanded dialog and static mini-player cover; the unrelated lyrics loading indicator does not invalidate that evidence.

# Craft and accessibility

The added interface preserves the graphite/coral palette, Jakarta type, semantic light theme, established buttons and restrained row separators. Visual hierarchy gives folder management and recovery distinct groups without inventing a new design system. Native radio controls use a fieldset/legend and wrapping labels. Loading/results use status semantics, actionable failures use alerts, and shared controls retain visible keyboard focus and disabled states. New copy names both the problem and its recovery. No material contrast or overflow defect is visible in the supplied captures. The supplied detector's inherited 9px PlayerBar label advisory does not arise from this extension. This is not a comprehensive accessibility certification.

# Material fixes

None required for the reviewed scope. Preserve DESIGN.md and its existing system records; no global design drift was found in these changes. Keep the documented Linux validation limit when reporting completion.

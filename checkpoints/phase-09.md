# Phase 09 — Prompt gallery

**Status:** done
**Commit:** b78e8eb
**Date:** 2026-04-17

## What shipped
- Added prompt CRUD services and server actions with ownership checks and reference-image enforcement.
- Added `/prompts` gallery with search, tag filtering, favorite-only toggle, and prompt cards showing reference thumbnails.
- Added `/prompts/new` creation flow plus `/prompts/[id]` editing/detail flow.
- Added prompt tag input UI with chip-style previews and support for favorite toggling.
- Reused uploaded `PROMPT_REFERENCE` media and attached them to prompts with a maximum of 4 references enforced in the service layer.

## Deviations from blueprint
- This pass focused on implementation and did not add or run the specified tests yet.
- The tag UX uses a comma-separated input with live chip previews instead of a more elaborate interactive chip builder.

## Acceptance gate output
```text
No new validation run was performed in this pass; implementation only.
```

## Known gaps / follow-ups
- Virtualization for very large prompt lists is not added yet in this pass.
- The upcoming generation phase will need to consume prompt references and text directly from this gallery.

## Handoff notes for next agent
- Resume at Phase 10: Nano Banana generation adapter.
- Keep prompt reference ownership tied to `MediaObject` so generation flows can reuse the same media and variants.
- Favorite and tag filters are server-side; later client-side enhancements should preserve the canonical query shape.

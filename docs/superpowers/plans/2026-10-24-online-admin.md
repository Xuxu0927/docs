# Online notes manager

Goal: Upload personal Markdown/PDF notes through a Chinese browser interface and publish the catalog, bilingual READMEs and website together.

Architecture: Static /admin/ on GitHub Pages calls the GitHub Git database API directly. A fine-grained Contents read/write token stays in memory and is sent only to api.github.com. The repository and main branch are fixed. No additional hosting or dependencies.

Constraints: Preserve the empty catalog. No example documents committed. No credential storage, telemetry or external frontend scripts. Preserve unrelated repository files. Use a fast-forward commit without force. Removing an entry only removes its catalog listing; uploaded source files remain in Git history and in the repository.

Tasks:
- [ ] Test catalog generation, file validation, UTF-8/PDF uploads, conflicts and API authorization failures.
- [ ] Build pure catalog helpers and a fixed-repository GitHub client with atomic commits.
- [ ] Add responsive manager UI: connect, create/edit, optional four files, clear a version, reorder/remove listing, preview and publish.
- [ ] Update homepage entry and guide. Verify generated output matches the existing Python builder.
- [ ] Run automated checks, inspect UI, push and verify the public deployment if reachable.

Review focus: No token in storage or repository; script/Markdown injection in titles; file paths and non-UTF8 input; concurrent upstream edits; ambiguous network failure after publishing; upload size limits; unsaved edits when selecting another note.

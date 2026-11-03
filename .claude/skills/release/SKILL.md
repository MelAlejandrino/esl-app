---
name: release
description: Ship a new version of the app. Use when the user says "push then create a new release", "release", "ship vX.Y.Z", or "cut a release".
---

Full process is in `RELEASE.md`. Follow it; don't improvise.

1. Pick the version. Look at commits since the last tag (`git log $(git describe --tags --abbrev=0)..HEAD --oneline`). If the user gave no version, propose a semver bump and confirm before continuing.
2. Add a `## vX.Y.Z` section at the top of the notes in `RELEASE.md` (newest first), matching the style of the existing sections, including the **Install:** footer.
3. Set the same version in `package.json` and `src-tauri/tauri.conf.json`. The workflow fails if the tag and `tauri.conf.json` disagree.
4. Commit as `Release vX.Y.Z`, then `git push`.
5. `git tag vX.Y.Z && git push --tags`. This triggers `.github/workflows/release.yml`.
6. Tell the user: the workflow builds Windows/macOS/Linux and creates a **draft** release. They must check all three jobs went green, then review and Publish on the GitHub Releases page. Never publish it yourself.

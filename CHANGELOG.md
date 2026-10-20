# Changelog

## 0.1.0 — 2026-10-19

- First release: the `human-text` skill, moved out of a personal skill into a plugin and translated into English.
- Steps 1–5 (reader, fact card, draft by the rules, clean-context check, delivery) are in `skills/human-text/SKILL.md`.
- Rules 1–11 and "Don't overdo it" are in `skills/human-text/references/rules.md`, so other plugins can read them.
- Rule 11 has two marker lists: Russian (as in the personal skill) and English (new).
- The line about PR descriptions no longer assumes that `stage-pipeline` is installed.
- The 14 check questions of step 4 moved into the agent `human-text-check` (`agents/human-text-check.md`): read-only tools, clean context, returns only the violations; the skill calls it and keeps the rules for handling findings. Callers may add extra questions (`D1...`) and a reading condition.
- `scripts/validate.mjs`, run by the `validate` GitHub workflow, checks the manifest, the skill and agent frontmatter, the read-only tools of the agent, the 30 KB skill budget, links to `~/.claude`, the Cyrillic markers of rule 11 and that the top CHANGELOG section equals the version in `plugin.json`.
- README: what the skill does and does not do, install through the `magzhan` marketplace, an example call, the check agent, and the relation to `stage-pipeline` (a copy lives there, this repo is the source).

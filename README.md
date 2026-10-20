# human-text

A Claude Code plugin for writing text about a project, feature or task that people will actually read: a post to the team, an update for a manager, an intro for a newcomer, a letter to a client.

Text written by a model is easy to spot, and not only by its words. It adds a moral or a summary of what the facts already show, follows one clean line, closes every open question and gives generalities where a reader wants specifics. The rules in this plugin come from the StoryScope study of how AI text differs from human text ([arXiv 2604.03136](https://arxiv.org/abs/2604.03136)), moved from fiction to work texts: they keep what makes a text clearer to its reader and drop what only makes it look human.

## What it does

1. **Finds out the reader** and what they will do after reading (decide, start work, approve, be informed). If that cannot be told from the request, it asks one question.
2. **Collects a fact card from the repo**: README, manifest, git log, task artifacts, `docs/features/`. Every fact has a source; a gap is named, not invented.
3. **Writes the draft from the card** by 11 rules (structure first, then words) and sizes it to the reader: 5–12 lines for a manager, a screen or two for a team.
4. **Checks the draft in a clean context** with the `human-text-check` agent: 14 closed questions, and only the violations come back. The skill fixes them in the text.
5. **Hands over the text** and lists the gaps it could not fill.

For: status updates, handoffs, project intros, client letters, docs about a feature.

## What it does not do

- It does not write code, commit messages or PR descriptions. (With [`stage-pipeline`](https://github.com/maggi08/claude-pipeline) installed, `/task-wrapup` writes the PR description by these same rules.)
- It does not run on its own: the skill is manual only, the model never starts it by itself.
- It does not make a text "undetectable". It makes it clearer to a person; rule 11 (word markers) is the smallest part of it.
- The study is about fiction, so the rules are a transfer, not a proof that a text written by them passes any detector.

## Install

```bash
claude plugin marketplace add maggi08/claude-pipeline
claude plugin install human-text@magzhan
```

Restart Claude Code after the install. The marketplace `magzhan` is the repository `maggi08/claude-pipeline`; this repository is the source of the plugin that its catalog points to. Nothing else is needed: no config, no MCP servers.

## Use

```
/human-text:human-text <to whom> <about what>
```

For example:

```
/human-text:human-text managers, payments status
```

The skill reads the repo, builds the card, writes a short status for a manager and shows it with the list of gaps. Without arguments it asks who reads the text.

## The check agent

`human-text-check` is a read-only agent (tool: Read) that runs in a clean context. It gets the draft, the reader, the goal, the fact card and the language, answers 14 closed questions and returns only the violations, without rewriting the text. Other skills can call it and add their own questions (`D1…`) and a reading condition.

## Layout

- `skills/human-text/SKILL.md` — the process, steps 1–5.
- `skills/human-text/references/rules.md` — rules 1–11 and "Don't overdo it"; other plugins read it.
- `agents/human-text-check.md` — the checker.
- `scripts/validate.mjs` — structure checks: manifest, frontmatter, agent tools, size budget, CHANGELOG matches the version. Run `node scripts/validate.mjs`.

## Relation to stage-pipeline

[`stage-pipeline`](https://github.com/maggi08/claude-pipeline) carries a copy of the skill, the rules and the agent, so `/stage-pipeline:human-text` works without a second install, and `/task-wrapup`, `/feature-doc` and the force summary write by the same rules. **This repository is the source of truth.** The copy is brought in by `scripts/sync-human-text.mjs` in the stage-pipeline repo and pinned by commit and checksums in its `human-text.lock.json`; do not edit the copy, change the rules here and sync.

## License

No license file: the repository is for installing and reading.

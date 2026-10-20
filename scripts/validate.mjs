import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const fail = (file, msg) => errors.push(`${file}: ${msg}`)

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(join(ROOT, path), 'utf8'))
  } catch (e) {
    fail(path, `does not parse — ${e.message}`)
    return null
  }
}

/**
 * Skill frontmatter: a minimal parser for top-level fields.
 * Full YAML is not needed — only name and description matter.
 */
const readFrontmatter = (absPath) => {
  const lines = readFileSync(absPath, 'utf8').split('\n')
  if (lines[0].trim() !== '---') return null
  const end = lines.indexOf('---', 1)
  if (end === -1) return null
  const fields = {}
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([a-zA-Z-]+):\s*(.*)$/)
    if (match) fields[match[1]] = match[2].trim()
  }
  return fields
}

const walkMd = (dir, visit) => {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules' || name === '.claude') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walkMd(path, visit)
    else if (name.endsWith('.md')) visit(path)
  }
}

const manifestPath = '.claude-plugin/plugin.json'
const manifest = readJson(manifestPath)
if (manifest) {
  if (!manifest.name) fail(manifestPath, 'no name')
  if (!manifest.version) fail(manifestPath, 'no version — claude plugin tag does not work without it')
  if (!manifest.description) fail(manifestPath, 'no description')
}

/** The first CHANGELOG section is the current version. */
if (manifest?.version && existsSync(join(ROOT, 'CHANGELOG.md'))) {
  const top = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8').match(/^## (\d+\.\d+\.\d+)/m)?.[1]
  if (top !== manifest.version) fail('CHANGELOG.md', `the top section is ${top ?? 'missing'}, plugin.json has ${manifest.version}`)
}

/** Every skill: SKILL.md with name = folder name and a description; size within the budget. */
const SKILL_KB = 30
const skillsDir = join(ROOT, 'skills')
const skillNames = existsSync(skillsDir) ? readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory()) : []
if (skillNames.length === 0) fail('skills', 'no skills')
for (const name of skillNames) {
  const skillPath = join(skillsDir, name, 'SKILL.md')
  const rel = `skills/${name}/SKILL.md`
  if (!existsSync(skillPath)) {
    fail(rel, 'skill without SKILL.md')
    continue
  }
  const fm = readFrontmatter(skillPath)
  if (!fm) fail(rel, 'no frontmatter')
  else if (fm.name !== name) fail(rel, `name "${fm.name}" does not match the folder name "${name}"`)
  else if (!fm.description) fail(rel, 'no description — the skill cannot be found by its description')

  const kb = statSync(skillPath).size / 1024
  if (kb > SKILL_KB) fail(rel, `${kb.toFixed(1)} KB over a ${SKILL_KB} KB budget — move precedents and measurements to references/`)
}

/**
 * Every agent (found recursively): name = file name, a description, tools = a whitelist of read-only ones.
 * A checker that can write or run commands is not a checker; a missing `tools:` line means ALL tools, so it fails too.
 */
const ALLOWED_AGENT_TOOLS = ['read', 'grep', 'glob']

const findMd = (dir, found = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) findMd(path, found)
    else if (name.endsWith('.md')) found.push(path)
  }
  return found
}

/** Raw `tools` value of a frontmatter: a comma line, `[a, b]` or a YAML list of `- X`; null if there is no key. */
const readAgentTools = (absPath) => {
  const lines = readFileSync(absPath, 'utf8').split('\n')
  const end = lines.indexOf('---', 1)
  const block = lines.slice(1, end === -1 ? lines.length : end)
  const at = block.findIndex((l) => /^tools:/.test(l))
  if (at === -1) return null
  const inline = block[at].replace(/^tools:/, '').trim().replace(/^\[|\]$/g, '')
  const items = inline ? inline.split(',') : []
  for (const l of block.slice(at + 1)) {
    const m = l.match(/^\s+-\s*(.*)$/)
    if (!m) break
    items.push(m[1])
  }
  return items.map((t) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
}

const agentsDir = join(ROOT, 'agents')
const agentFiles = existsSync(agentsDir) ? findMd(agentsDir) : []
for (const abs of agentFiles) {
  const rel = abs.replace(`${ROOT}/`, '')
  const base = abs.split('/').pop().replace(/\.md$/, '')
  const fm = readFrontmatter(abs)
  if (!fm) {
    fail(rel, 'no frontmatter')
    continue
  }
  if (fm.name !== base) fail(rel, `name "${fm.name}" does not match the file name "${base}"`)
  if (!fm.description) fail(rel, 'no description')
  const tools = readAgentTools(abs)
  if (!tools || tools.length === 0) {
    fail(rel, 'no tools — without a `tools:` line the agent gets all tools; list Read, Grep, Glob only')
    continue
  }
  for (const tool of tools) {
    const name = tool.split('(')[0].trim().toLowerCase()
    if (!ALLOWED_AGENT_TOOLS.includes(name)) fail(rel, `tools contain ${tool} — a checker agent is read-only (Read, Grep, Glob only)`)
  }
}

/**
 * Links inside the plugin must go through ${CLAUDE_PLUGIN_ROOT}:
 * a ~/.claude/skills path exists only on the author's machine; for everyone else the link leads nowhere.
 */
walkMd(ROOT, (path) => {
  readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
    if (/~\/\.claude\/(skills|agents)/.test(line)) {
      fail(`${path.replace(`${ROOT}/`, '')}:${i + 1}`, 'link to ~/.claude — use ${CLAUDE_PLUGIN_ROOT}')
    }
  })
})

/**
 * Cyrillic is allowed only in the Russian marker list of rule 11 — between the ru-list markers in rules.md.
 * The plugin is English; a stray Russian line elsewhere is an untranslated leftover.
 */
const RU_ALLOWED = { file: 'skills/human-text/references/rules.md', start: '<!-- ru-list:start -->', end: '<!-- ru-list:end -->' }
walkMd(ROOT, (path) => {
  const rel = path.replace(`${ROOT}/`, '')
  let inside = false
  let starts = 0
  let ends = 0
  readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
    if (rel === RU_ALLOWED.file) {
      if (line.includes(RU_ALLOWED.start)) {
        inside = true
        starts++
      } else if (line.includes(RU_ALLOWED.end)) {
        inside = false
        ends++
      }
    }
    if (!inside && /[Ѐ-ӿ]/.test(line)) fail(`${rel}:${i + 1}`, 'Cyrillic outside the Russian marker list of rule 11')
  })
  if (rel === RU_ALLOWED.file && (inside || starts !== 1 || ends !== 1)) {
    fail(rel, `expected exactly one closed pair of ru-list markers (start=${starts}, end=${ends}, closed=${!inside})`)
  }
})
if (!existsSync(`${ROOT}/${RU_ALLOWED.file}`)) fail(RU_ALLOWED.file, 'missing — the Cyrillic check has no rules file')

if (errors.length > 0) {
  console.error(`validate: ${errors.length} error(s)`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log('validate: ok')

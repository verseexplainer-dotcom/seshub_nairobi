You are a senior ecommerce systems engineer.

Your task is to CLEAN and RESTRUCTURE this repository into a scalable, production-ready architecture.

## GOAL
Transform the repo into a clean separation of:
- frontend (Astro)
- backend (Supabase + Workers)
- AI system (agents, prompts)
- automation tools (Python + Node)
- docs

## REQUIRED STRUCTURE

ses-ict-hub/
  README.md
  package.json
  astro.config.mjs
  tsconfig.json
  wrangler.jsonc

  /docs/
  /ai/
    ai/AGENTS.md
    ai/GUARDRAILS.md
    ai/SKILLS.md
    ai/PROMPTS.md
    /agents/
    /prompts/
    /codex/
    /design/

  /src/
  /public/

  /workers/
  /supabase/

  /tools/
    /python/
    /node/

  /scripts/
  /tests/

## TASKS

1. MOVE FILES

- Move:
  .agents -> /ai/agents
  .codex -> /ai/codex
  prompts -> /ai/prompts
  .aidesigner -> /ai/design

2. MERGE DOCUMENTS

- Merge PROJECT_ai/GUARDRAILS.md into ai/GUARDRAILS.md
- Delete PROJECT_ai/GUARDRAILS.md after merge

3. CLEAN ROOT

- Move all AI-related markdown files into /ai/
- Move architecture docs into /docs/

4. REMOVE BAD PRACTICES

- Delete:
  dist/
  output/
  venv/

- Add them to .gitignore

5. SPLIT TOOLS

- Move Python-related files to /tools/python/
- Move Node scripts to /tools/node/

6. VERIFY IMPORTS

- Fix all broken imports after moving files

7. KEEP SAFE

- Do NOT delete:
  src/
  public/
  supabase/
  workers/

8. FINAL STEP

- Print final folder tree
- Ensure project builds successfully

## RULES

- Do NOT break Astro build
- Do NOT modify business logic
- Only restructure + organize
- Keep everything production safe

Proceed step-by-step and confirm changes.

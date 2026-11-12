# Workspace Agent Skills (`.agents/`)

Struktur skill workspace menggunakan pola **Bank + Aktif** agar ringkas, sesuai standar universal `.agents/skills/<nama-skill>/SKILL.md`, dan tidak membebani *context budget* Antigravity:

- **`.agents/skills/<nama-skill>/`** — Berisi **51 skill inti aktif** yang otomatis dideteksi Antigravity (dan kompatibel lintas agent/tool), termasuk skill evaluasi/judge UI (`visual-critique`, `design-judge-qa`, `improve-ui`, `fixing-accessibility`, `fixing-motion-performance`, `kill-ai-slop`) serta routing Multi-LLM, resilient scraping, macro GDELT REST & semantic dedup (`llm-routing-and-scraping`, `gemini-api-integration` `@google/genai` + embeddings, `zod-validation-expert` Zod v4).
- **[`000 - SKILLS_cleaned/`](../000%20-%20SKILLS_cleaned/CATALOG.md)** — Bank library berisi **169 skill terkurasi** yang rapi per kategori pembuatan webapp (`01-planning-architecture` s.d. `08-writing-copy-docs`).

## Menambah atau Mengurangi Skill Aktif

- **Aktifkan skill tambahan** (misalnya `drizzle-orm-expert`, `motionmaxxing`, `hallmark`, `docker-expert`, `seo-audit`, `xlsx-export`): salin folder skill dari `000 - SKILLS_cleaned/<kategori>/<nama-skill>/` ke `.agents/skills/<nama-skill>/`.
- **Nonaktifkan skill**: hapus folder tersebut dari `.agents/skills/` (salinan utamanya tetap tersimpan rapi di `000 - SKILLS_cleaned/`).

// server/utils/llm-config.ts
import type { MultiLlmRouterOptions, RouterEnvConfig } from '../services/llm/router';

export interface RuntimeLlmAndScraperConfigLike {
  geminiApiKey?: string;
  geminiApiKeys?: string;
  groqApiKey?: string;
  groqApiKeys?: string;
  openrouterApiKey?: string;
  openrouterFreeModel?: string;
  llmClassifyChain?: string;
  llmSynthesisChain?: string;
  scraperMaxLlmCallsPerRun?: number | string;
  scraperMaxArticlesPerRun?: number | string;
}

function nonEmptyOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toPositiveIntOrUndefined(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}

/**
 * Menerjemahkan Nuxt `runtimeConfig` (termasuk override env `NUXT_*`) menjadi `RouterEnvConfig`.
 * String kosong diubah ke `undefined` agar fallback ke `process.env` tetap berjalan bila belum diset.
 */
export function buildRouterEnvFromRuntimeConfig(
  cfg: RuntimeLlmAndScraperConfigLike,
): RouterEnvConfig {
  return {
    geminiApiKey: nonEmptyOrUndefined(cfg.geminiApiKey),
    geminiApiKeys: nonEmptyOrUndefined(cfg.geminiApiKeys),
    groqApiKey: nonEmptyOrUndefined(cfg.groqApiKey),
    groqApiKeys: nonEmptyOrUndefined(cfg.groqApiKeys),
    openrouterApiKey: nonEmptyOrUndefined(cfg.openrouterApiKey),
    openrouterFreeModel: nonEmptyOrUndefined(cfg.openrouterFreeModel),
    llmClassifyChain: nonEmptyOrUndefined(cfg.llmClassifyChain),
    llmSynthesisChain: nonEmptyOrUndefined(cfg.llmSynthesisChain),
  };
}

/**
 * Membangun opsi runtime pipeline & router secara konsisten untuk API routes dan Nitro tasks.
 */
export function buildScraperPipelineRuntimeOptions(cfg: RuntimeLlmAndScraperConfigLike): {
  maxArticlesPerRun?: number;
  routerOptions: MultiLlmRouterOptions;
} {
  const maxArticlesPerRun = toPositiveIntOrUndefined(cfg.scraperMaxArticlesPerRun);
  const maxCallsPerRun = toPositiveIntOrUndefined(cfg.scraperMaxLlmCallsPerRun);

  return {
    ...(maxArticlesPerRun !== undefined ? { maxArticlesPerRun } : {}),
    routerOptions: {
      env: buildRouterEnvFromRuntimeConfig(cfg),
      ...(maxCallsPerRun !== undefined ? { maxCallsPerRun } : {}),
    },
  };
}


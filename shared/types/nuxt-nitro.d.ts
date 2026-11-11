// shared/types/nuxt-nitro.d.ts
// Menjembatani tipe NitroTypes pada @nuxt/schema dengan NitroConfig/Nitro dari nitropack
// agar konfigurasi `nitro.experimental.tasks` pada nuxt.config.ts terketik penuh tanpa cast.
import type { Nitro, NitroConfig } from 'nitropack/types';

declare module '@nuxt/schema' {
  interface NitroTypes {
    config: NitroConfig;
    instance: Nitro;
  }
}

export {};


<!-- app/pages/login.vue -->
<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { LoginRequestSchema, type LoginRequestInput } from '#shared/schemas/auth.schema';
import type { AuthProvidersResponse, AuthUser, UiSemanticColor } from '~/types/sipena';

definePageMeta({
  layout: false,
});

useHead({
  title: 'Masuk Workstation Nerwilis — SIPENA KTT',
});

const route = useRoute();
const toast = useToast();
const { user, fetchSession, setUser } = useAdminSession();

const { data: providersData } = await useFetch<AuthProvidersResponse>('/api/auth/providers');

const formState = reactive<LoginRequestInput>({
  email: '',
  password: '',
});

const showPassword = ref(false);
const isSubmitting = ref(false);
const isRedirectingGoogle = ref(false);
const errorMessage = ref<string | null>(null);

interface OAuthAlertInfo {
  title: string;
  description: string;
  color: UiSemanticColor;
}

const OAUTH_ERROR_MAP: Record<string, OAuthAlertInfo> = {
  not_whitelisted: {
    title: 'Akses Ditolak: Email Tidak Terdaftar pada Whitelist',
    description:
      'Alamat Gmail / Google Anda belum didaftarkan di sistem SIPENA KTT. Hubungi Administrator Utama untuk menambahkan email Anda di menu Kelola Akses & Tim.',
    color: 'error',
  },
  account_inactive: {
    title: 'Akun Staf Sedang Dinonaktifkan',
    description:
      'Email Anda terdaftar di SIPENA KTT, namun status akses admin saat ini dinonaktifkan. Hubungi Administrator Utama untuk mengaktifkan kembali.',
    color: 'warning',
  },
  forbidden_role: {
    title: 'Peran Akses Tidak Mencukupi',
    description: 'Akun Anda tidak memiliki otorisasi Admin atau Operator.',
    color: 'error',
  },
  email_unverified: {
    title: 'Email Google Belum Terverifikasi',
    description:
      'Pastikan alamat email pada akun Google Anda sudah terverifikasi sebelum digunakan untuk masuk.',
    color: 'warning',
  },
  access_denied: {
    title: 'Login Google Dibatalkan',
    description: 'Anda membatalkan proses persetujuan masuk melalui akun Google.',
    color: 'warning',
  },
  invalid_state: {
    title: 'Sesi OAuth Kedaluwarsa atau Tidak Valid',
    description: 'Silakan klik kembali tombol Masuk dengan Google dari halaman ini.',
    color: 'warning',
  },
  rate_limited: {
    title: 'Terlalu Banyak Percobaan Login',
    description: 'Silakan tunggu beberapa menit sebelum mencoba masuk kembali.',
    color: 'error',
  },
  google_not_configured: {
    title: 'Google OAuth Belum Dikonfigurasi di Server',
    description:
      'Variabel GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET pada file .env server belum diisi. Gunakan login kata sandi atau lengkapi konfigurasi .env.',
    color: 'warning',
  },
  session_not_configured: {
    title: 'Kunci Sesi Server Belum Dikonfigurasi',
    description: 'Variabel NUXT_SESSION_PASSWORD (minimal 32 karakter) pada .env server belum diisi.',
    color: 'warning',
  },
  oauth_failed: {
    title: 'Autentikasi Google Gagal',
    description:
      'Terjadi kendala saat memverifikasi respons dari Google. Silakan coba ulang atau gunakan email dan kata sandi.',
    color: 'error',
  },
};

const oauthAlert = computed<OAuthAlertInfo | null>(() => {
  const code = route.query.oauth_error;
  if (typeof code !== 'string' || !code.trim()) return null;
  return OAUTH_ERROR_MAP[code.trim()] ?? OAUTH_ERROR_MAP.oauth_failed ?? null;
});

const googleLoginEnabled = computed(() => providersData.value?.googleEnabled === true);

function sanitizeRedirectTarget(rawTarget: unknown): string {
  if (typeof rawTarget !== 'string') return '/admin';
  const trimmed = rawTarget.trim();
  if (
    !trimmed ||
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed === '/login' ||
    trimmed.startsWith('/api/auth')
  ) {
    return '/admin';
  }
  return trimmed;
}

function handleGoogleLogin() {
  if (isRedirectingGoogle.value || !googleLoginEnabled.value) return;
  isRedirectingGoogle.value = true;
  errorMessage.value = null;
  const destination = sanitizeRedirectTarget(route.query.redirect);
  window.location.assign(`/api/auth/google/login?redirect=${encodeURIComponent(destination)}`);
}

onMounted(async () => {
  const active = await fetchSession();
  if (active) {
    await navigateTo(sanitizeRedirectTarget(route.query.redirect), { replace: true });
  }
});

async function handleSubmit(event: FormSubmitEvent<LoginRequestInput>) {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const res = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: event.data,
      credentials: 'include',
    });

    setUser(res.user);
    toast.add({
      title: `Selamat datang, ${res.user.name}`,
      description: 'Anda berhasil masuk ke Workstation Nerwilis SIPENA KTT.',
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    });

    const destination = sanitizeRedirectTarget(route.query.redirect);
    await navigateTo(destination, { replace: true });
  } catch (err: unknown) {
    const fetchErr = err as {
      statusCode?: number;
      data?: { message?: string; statusMessage?: string };
      message?: string;
    };
    if (fetchErr.statusCode === 429) {
      errorMessage.value =
        fetchErr.data?.message ||
        'Terlalu banyak percobaan login. Silakan tunggu beberapa menit sebelum mencoba lagi.';
    } else if (fetchErr.statusCode === 401) {
      errorMessage.value = fetchErr.data?.message || 'Email atau kata sandi tidak sesuai.';
    } else {
      errorMessage.value =
        fetchErr.data?.message || 'Gagal menghubungi server autentikasi. Coba kembali.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#F6F5F1] text-[#141917] font-sans selection:bg-[#E3F0EA] selection:text-[#0B3D2E]">
    <div class="min-h-screen grid grid-cols-1 lg:grid-cols-12">
      <!-- Left 5 Columns: Deep Borneo Pine Editorial Manifesto Panel (Desktop) -->
      <aside
        class="hidden lg:flex lg:col-span-5 bg-[#0B3D2E] text-white p-12 flex-col justify-between relative overflow-hidden"
      >
        <!-- Background Architectural Dot Matrix Grid -->
        <div
          class="absolute inset-0 opacity-[0.05] pointer-events-none"
          style="background-image: radial-gradient(#FFFFFF 1px, transparent 1px); background-size: 20px 20px;"
        />

        <!-- Brand Top Lockup -->
        <div class="relative z-10 space-y-3">
          <NuxtLink to="/" class="inline-flex items-center gap-2.5">
            <span class="font-display font-extrabold tracking-tight text-2xl text-white">
              SIPENA <span class="text-emerald-300">KTT</span>
            </span>
          </NuxtLink>
          <div class="text-[11px] font-mono text-emerald-200 tracking-wider uppercase">
            Badan Pusat Statistik &bull; Kabupaten Tana Tidung
          </div>
        </div>

        <!-- Middle Manifesto Statement -->
        <div class="relative z-10 space-y-6 my-auto max-w-md">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-mono font-semibold text-emerald-200">
            <span class="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            <span>KONSOL KERJA NERWILIS</span>
          </div>

          <h2 class="font-display font-bold text-3xl sm:text-4xl leading-tight text-white tracking-tight">
            Presisi Analisis untuk Angka PDRB Berkualitas.
          </h2>

          <p class="text-sm text-emerald-100/80 leading-relaxed">
            Portal workstation terpadu Tim Nerwilis untuk menelaah, mengklasifikasi, dan memvalidasi fenomena ekonomi daerah dari pemberitaan media lokal dan kebijakan strategis nasional.
          </p>

          <div class="space-y-3 pt-2 text-xs font-mono text-emerald-200">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-emerald-300 shrink-0 font-bold">✓</span>
              <span>17 Lapangan Usaha KBLI 2025 Multi-Generasi</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-emerald-300 shrink-0 font-bold">✓</span>
              <span>6 Komponen Pengeluaran PDRB Standar SNA 2008</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-emerald-300 shrink-0 font-bold">✓</span>
              <span>Audit Jejak Waktu &amp; Sinkronisasi WITA (UTC+8)</span>
            </div>
          </div>
        </div>

        <!-- Bottom Colophon -->
        <div class="relative z-10 text-[11px] text-emerald-100/60 font-mono">
          &copy; {{ new Date().getFullYear() }} BPS Kabupaten Tana Tidung. Hak Cipta Dilindungi.
        </div>
      </aside>

      <!-- Right 7 Columns: Clean Auth Canvas -->
      <main
        id="main-content"
        tabindex="-1"
        class="lg:col-span-7 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-16 py-12 relative"
      >
        <div class="w-full max-w-md space-y-6">
          <!-- Mobile Brand Lockup -->
          <div class="lg:hidden text-center space-y-2 mb-6">
            <NuxtLink to="/" class="inline-flex items-center gap-2">
              <span class="font-display font-extrabold text-2xl text-[#141917]">
                SIPENA <span class="text-[#0B3D2E]">KTT</span>
              </span>
            </NuxtLink>
            <div class="text-xs text-[#737B76]">
              Workstation Nerwilis BPS Kab. Tana Tidung
            </div>
          </div>

          <!-- Auth Card -->
          <div class="bg-white rounded-3xl border border-[#141917]/[0.08] shadow-[0_2px_10px_rgba(20,25,23,0.03),0_20px_44px_-16px_rgba(20,25,23,0.06)] p-7 sm:p-9 space-y-6">
            <!-- Active Session State -->
            <div v-if="user" class="text-center space-y-4 py-3">
              <div class="w-14 h-14 rounded-2xl bg-[#E3F0EA] border border-[#BBD8CB] text-[#0B3D2E] flex items-center justify-center mx-auto">
                <UIcon name="i-solar-check-circle-bold-duotone" class="w-7 h-7" />
              </div>
              <div class="space-y-1">
                <h1 class="text-lg font-bold text-[#141917] font-display">Sesi Aktif Terdeteksi</h1>
                <p class="text-xs text-[#4A524E]">
                  Anda telah masuk sebagai <strong class="text-[#141917]">{{ user.name }}</strong> ({{ user.role }}).
                </p>
              </div>
              <NuxtLink
                to="/admin"
                class="obs-btn-primary w-full h-11 px-5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Buka Workstation Admin</span>
                <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
              </NuxtLink>
            </div>

            <!-- Normal Login Flow -->
            <div v-else class="space-y-5">
              <div>
                <h1 class="text-2xl font-extrabold text-[#141917] tracking-tight font-display">
                  Masuk ke Workstation
                </h1>
                <p class="text-xs sm:text-[13px] text-[#4A524E] mt-1 leading-relaxed">
                  Gunakan akun staf terdaftar BPS Kabupaten Tana Tidung untuk mengakses konsol kurasi PDRB.
                </p>
              </div>

              <!-- OAuth / System Alerts -->
              <UAlert
                v-if="oauthAlert"
                :color="oauthAlert.color"
                variant="subtle"
                icon="i-lucide-shield-alert"
                :title="oauthAlert.title"
                :description="oauthAlert.description"
                class="text-xs"
              />

              <UAlert
                v-if="errorMessage"
                color="error"
                variant="subtle"
                icon="i-lucide-shield-alert"
                :title="errorMessage"
                class="text-xs"
              />

              <!-- Primary Email & Password Form -->
              <UForm
                method="post"
                :schema="LoginRequestSchema"
                :state="formState"
                class="space-y-4"
                @submit="handleSubmit"
              >
                <UFormField label="Email Staf" name="email" required>
                  <UInput
                    v-model="formState.email"
                    type="email"
                    placeholder="nama@bps.go.id"
                    icon="i-lucide-mail"
                    autocomplete="email"
                    size="md"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Kata Sandi" name="password" required>
                  <UInput
                    v-model="formState.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Masukkan kata sandi"
                    icon="i-lucide-lock"
                    autocomplete="current-password"
                    size="md"
                    class="w-full"
                  >
                    <template #trailing>
                      <UButton
                        type="button"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                        :aria-label="showPassword ? 'Sembunyikan' : 'Tampilkan'"
                        @click="showPassword = !showPassword"
                      />
                    </template>
                  </UInput>
                </UFormField>

                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="obs-btn-primary w-full h-11 rounded-xl text-xs sm:text-[13px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <UIcon v-if="isSubmitting" name="i-lucide-loader-circle" class="w-4 h-4 animate-spin" />
                  <span>{{ isSubmitting ? 'Memverifikasi...' : 'Masuk dengan Email' }}</span>
                </button>
              </UForm>

              <!-- Divider -->
              <div class="relative flex items-center justify-center pt-2">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-[#141917]/10" />
                </div>
                <span class="relative px-3 bg-white text-[11px] font-medium text-[#737B76]">
                  atau masuk menggunakan
                </span>
              </div>

              <!-- Secondary Google OAuth Option -->
              <div class="space-y-2">
                <button
                  type="button"
                  :disabled="!googleLoginEnabled || isRedirectingGoogle"
                  class="w-full h-11 px-4 rounded-xl bg-white hover:bg-[#F6F5F1] border border-[#141917]/15 text-[#141917] text-xs sm:text-[13px] font-semibold transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                  @click="handleGoogleLogin"
                >
                  <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>{{ isRedirectingGoogle ? 'Mengalihkan ke Google...' : 'Google OAuth (Whitelist Staf)' }}</span>
                </button>

                <p
                  v-if="providersData && !googleLoginEnabled"
                  class="text-[11px] text-[#B45309] bg-[#FEF7E6] border border-[#F3D89C] rounded-xl p-2.5 text-center"
                >
                  Google OAuth belum aktif di server. Gunakan email &amp; kata sandi di atas.
                </p>
              </div>
            </div>
          </div>

          <!-- Bottom Navigation Link -->
          <div class="text-center">
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A524E] hover:text-[#0B3D2E] transition-colors"
            >
              <span>&larr; Kembali ke Observatorium Publik</span>
            </NuxtLink>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

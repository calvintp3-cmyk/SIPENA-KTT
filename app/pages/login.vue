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
const showLocalLogin = ref(false);
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
  <div
    class="min-h-screen canvas-aurora-light relative flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-10 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900"
  >
    <main id="main-content" tabindex="-1" class="relative z-10 w-full max-w-5xl mx-auto">
      <div
        class="w-full rounded-3xl bg-white border border-slate-200/90 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12"
      >
        <!-- Showcase Column (Desktop Left lg:col-span-7) -->
        <aside
          aria-label="Informasi Workstation SIPENA KTT"
          class="order-2 lg:order-1 lg:col-span-7 hero-mesh-dark p-7 sm:p-9 text-white relative overflow-hidden flex flex-col justify-between gap-6 border-t lg:border-t-0 lg:border-r border-white/10"
        >
          <div class="relative z-10 space-y-5">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-emerald-200"
              >
                <UIcon name="i-solar-buildings-2-bold-duotone" class="w-4 h-4 text-emerald-400" />
                <span>BPS Kabupaten Tana Tidung</span>
              </span>
              <span class="text-xs text-slate-300 font-medium">• Portal Intelijen Ekonomi</span>
            </div>

            <div class="space-y-2">
              <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                Pusat Kurasi &amp; Analisis
                <span class="block text-emerald-300">
                  Fenomena Ekonomi Daerah
                </span>
              </h2>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Platform terpadu pemantauan berita lokal Kabupaten Tana Tidung, pelacakan transmisi
                kebijakan nasional, dan penyusunan ikhtisar perkembangan ekonomi daerah.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-3 pt-1">
              <div
                class="rounded-xl bg-white/[0.06] hover:bg-white/[0.09] transition-colors border border-white/10 p-3.5 flex items-start gap-3"
              >
                <div
                  class="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0"
                >
                  <UIcon name="i-solar-radar-2-bold-duotone" class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white">Radar Sebaran Sektor Usaha</div>
                  <p class="text-xs text-slate-300/90 mt-0.5 leading-relaxed">
                    Pantau cakupan pemberitaan pada 17 sektor usaha dan 6 kelompok permintaan secara real-time.
                  </p>
                </div>
              </div>

              <div
                class="rounded-xl bg-white/[0.06] hover:bg-white/[0.09] transition-colors border border-white/10 p-3.5 flex items-start gap-3"
              >
                <div
                  class="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0"
                >
                  <UIcon name="i-solar-checklist-bold-duotone" class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white">Validasi Berbasis Bukti Berita</div>
                  <p class="text-xs text-slate-300/90 mt-0.5 leading-relaxed">
                    Verifikasi draf klasifikasi AI dengan sitasi tautan asli serta pencatatan manual lapangan oleh analis.
                  </p>
                </div>
              </div>

              <div
                class="rounded-xl bg-white/[0.06] hover:bg-white/[0.09] transition-colors border border-white/10 p-3.5 flex items-start gap-3"
              >
                <div
                  class="w-9 h-9 rounded-lg bg-violet-500/20 border border-violet-400/30 text-violet-300 flex items-center justify-center shrink-0"
                >
                  <UIcon name="i-solar-magic-stick-3-bold-duotone" class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white">Studio Rangkuman Eksekutif</div>
                  <p class="text-xs text-slate-300/90 mt-0.5 leading-relaxed">
                    Hasilkan ringkasan laporan analitis per sektor lengkap dengan penomoran referensi dan unduhan dokumen.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            class="relative z-10 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300"
          >
            <span class="inline-flex items-center gap-2 font-semibold text-emerald-200">
              <UIcon name="i-solar-shield-check-bold-duotone" class="w-4 h-4 text-emerald-300" />
              <span>Akses Whitelist Staf Terdaftar</span>
            </span>
            <span class="text-slate-400 tabular-nums">WITA (UTC+8)</span>
          </div>
        </aside>

        <!-- Form Console Column (Desktop Right lg:col-span-5) -->
        <div class="order-1 lg:order-2 lg:col-span-5 p-7 sm:p-9 flex flex-col justify-between bg-white">
          <div class="w-full max-w-sm mx-auto space-y-5">
            <!-- Active Session View -->
            <div
              v-if="user"
              class="rounded-2xl bg-emerald-50/80 border border-emerald-200/90 p-6 text-center space-y-4"
            >
              <div
                class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm"
              >
                <UIcon name="i-solar-check-circle-bold-duotone" class="w-6 h-6" />
              </div>
              <div class="space-y-1">
                <h1 class="text-base font-bold text-slate-900">Sesi Aktif Ditemukan</h1>
                <p class="text-xs text-slate-600">
                  Anda sudah masuk sebagai <strong class="text-slate-900">{{ user.name }}</strong>.
                </p>
              </div>
              <NuxtLink
                to="/admin"
                class="btn-primary-gradient w-full h-10 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <UIcon name="i-solar-widget-5-bold-duotone" class="w-4 h-4 text-emerald-100" />
                <span>Buka Dashboard Admin</span>
                <UIcon name="i-solar-alt-arrow-right-bold-duotone" class="w-4 h-4" />
              </NuxtLink>
            </div>

            <!-- Login View -->
            <div v-else class="space-y-4">
              <div class="space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
                    SIPENA KTT • Auth Console
                  </span>
                  <span class="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Terproteksi
                  </span>
                </div>

                <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 pt-1">
                  Masuk ke Workstation
                </h1>
                <p class="text-xs text-slate-600 leading-relaxed">
                  Gunakan akun Google instansi atau email terdaftar pada whitelist administrator.
                </p>
              </div>

              <UAlert
                v-if="oauthAlert"
                :color="oauthAlert.color"
                variant="subtle"
                icon="i-lucide-shield-alert"
                :title="oauthAlert.title"
                :description="oauthAlert.description"
              />

              <UAlert
                v-if="errorMessage"
                color="error"
                variant="subtle"
                icon="i-lucide-shield-alert"
                :title="errorMessage"
              />

              <div class="space-y-2.5">
                <button
                  type="button"
                  :disabled="!googleLoginEnabled || isRedirectingGoogle"
                  class="w-full h-11 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-indigo-400 text-slate-800 text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                  <span>{{ isRedirectingGoogle ? 'Mengalihkan ke Google...' : 'Masuk dengan Akun Google' }}</span>
                </button>

                <p
                  v-if="providersData && !googleLoginEnabled"
                  class="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center leading-relaxed"
                >
                  Konfigurasi OAuth Google belum aktif di server.
                </p>
                <p v-else class="text-[11px] text-slate-500 text-center">
                  Login aman satu-klik untuk akun terdaftar whitelist.
                </p>
              </div>

              <div class="pt-2.5 border-t border-slate-100 text-center">
                <button
                  type="button"
                  :aria-expanded="showLocalLogin"
                  class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer"
                  @click="() => { showLocalLogin = !showLocalLogin; }"
                >
                  <UIcon
                    :name="showLocalLogin ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    class="w-3.5 h-3.5"
                  />
                  <span>
                    {{ showLocalLogin ? 'Tutup form kata sandi lokal' : 'Gunakan email & kata sandi lokal' }}
                  </span>
                </button>
              </div>

              <UForm
                v-if="showLocalLogin"
                method="post"
                :schema="LoginRequestSchema"
                :state="formState"
                class="space-y-3 pt-2 border-t border-slate-100"
                @submit="handleSubmit"
              >
                <UFormField label="Email Terdaftar" name="email" required>
                  <UInput
                    v-model="formState.email"
                    type="email"
                    placeholder="nama@instansi.go.id"
                    icon="i-lucide-mail"
                    autocomplete="email"
                    size="sm"
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
                    size="sm"
                    class="w-full"
                  >
                    <template #trailing>
                      <UButton
                        type="button"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                        :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                        @click="() => { showPassword = !showPassword; }"
                      />
                    </template>
                  </UInput>
                </UFormField>

                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="btn-primary-gradient w-full h-10 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UIcon v-if="isSubmitting" name="i-lucide-loader-circle" class="w-4 h-4 animate-spin" />
                  <UIcon v-else name="i-solar-shield-keyhole-bold-duotone" class="w-4 h-4 text-emerald-100" />
                  <span>{{ isSubmitting ? 'Memverifikasi...' : 'Masuk Workstation' }}</span>
                </button>
              </UForm>
            </div>
          </div>

          <!-- Bottom Navigation Links -->
          <div class="flex flex-wrap items-center justify-center gap-4 pt-5 text-xs font-semibold border-t border-slate-100 mt-5">
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-700 transition-colors"
            >
              <UIcon name="i-solar-home-smile-bold-duotone" class="w-3.5 h-3.5 text-indigo-600" />
              <span>Beranda</span>
            </NuxtLink>
            <span class="text-slate-400" aria-hidden="true">•</span>
            <NuxtLink
              to="/linimasa"
              class="inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 hover:underline"
            >
              <UIcon name="i-solar-calendar-search-bold-duotone" class="w-3.5 h-3.5 text-emerald-700" />
              <span>Linimasa Publik</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

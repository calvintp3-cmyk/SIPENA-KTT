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
    class="min-h-screen bg-slate-950 text-slate-100 relative flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500 selection:text-white overflow-hidden"
  >
    <!-- Ambient Aurora Glow & Subtle Dot Grid Backdrop -->
    <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[440px] bg-gradient-to-tr from-indigo-600/30 via-emerald-500/20 to-teal-400/20 blur-[110px] rounded-full pointer-events-none" />
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

    <main id="main-content" tabindex="-1" class="w-full max-w-[430px] relative z-10">
      <!-- Ultra-Modern SaaS Command Console Workstation Card -->
      <div
        class="bg-slate-900/85 backdrop-blur-2xl rounded-3xl border border-white/12 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_80px_rgba(79,70,229,0.12)] p-6 sm:p-8 space-y-5"
      >
        <!-- Active Session Card -->
        <div v-if="user" class="text-center space-y-4 py-3">
          <div class="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <UIcon name="i-solar-check-circle-bold-duotone" class="w-7 h-7" />
          </div>
          <div class="space-y-1">
            <h1 class="text-lg font-extrabold text-white">Sesi Aktif Terdeteksi</h1>
            <p class="text-xs text-slate-300">
              Anda terautentikasi sebagai <strong class="text-emerald-300">{{ user.name }}</strong> ({{ user.role }}).
            </p>
          </div>
          <NuxtLink
            to="/admin"
            class="btn-primary-gradient w-full h-11 px-5 rounded-2xl text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25"
          >
            <UIcon name="i-solar-widget-5-bold-duotone" class="w-4 h-4 text-emerald-100" />
            <span>Buka Workstation Admin</span>
            <UIcon name="i-solar-alt-arrow-right-bold-duotone" class="w-4 h-4" />
          </NuxtLink>
        </div>

        <!-- Normal Login Card -->
        <div v-else class="space-y-5">
          <!-- Institutional Security Badge & Brand Header -->
          <div class="text-center space-y-3">
            <div
              class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-emerald-300 tracking-wider uppercase"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-400" />
              <span>BPS KTT • Nerwilis Secure Gateway</span>
            </div>

            <div class="flex items-center justify-center gap-3 pt-1">
              <div
                class="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0"
              >
                <UIcon name="i-solar-chart-2-bold-duotone" class="w-6 h-6" />
              </div>
              <div class="text-left">
                <div class="font-extrabold text-lg text-white tracking-tight leading-tight">
                  SIPENA <span class="text-indigo-400">KTT</span>
                </div>
                <div class="text-[11px] font-medium text-slate-400">
                  Konsol Kurasi &amp; Analisis PDRB
                </div>
              </div>
            </div>
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

          <!-- Google Auth Button (Primary Single Click) -->
          <div class="space-y-2">
            <button
              type="button"
              :disabled="!googleLoginEnabled || isRedirectingGoogle"
              class="w-full h-11 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              @click="handleGoogleLogin"
            >
              <svg class="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
              <span>{{ isRedirectingGoogle ? 'Mengalihkan ke Google...' : 'Masuk Cepat dengan Akun Google' }}</span>
            </button>

            <p
              v-if="providersData && !googleLoginEnabled"
              class="text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 text-center"
            >
              Google OAuth belum aktif di server. Gunakan email &amp; kata sandi di bawah.
            </p>
          </div>

          <!-- Divider -->
          <div class="relative flex items-center justify-center">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/10" />
            </div>
            <span class="relative px-3 bg-slate-900 text-[11px] font-medium text-slate-400">
              atau gunakan kata sandi
            </span>
          </div>

          <!-- Email & Password Form -->
          <UForm
            method="post"
            :schema="LoginRequestSchema"
            :state="formState"
            class="space-y-3.5"
            @submit="handleSubmit"
          >
            <UFormField label="Alamat Email Staf" name="email" required>
              <UInput
                v-model="formState.email"
                type="email"
                placeholder="nama@bps.go.id"
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
                placeholder="Masukkan kata sandi akun"
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
                    :aria-label="showPassword ? 'Sembunyikan' : 'Tampilkan'"
                    @click="() => { showPassword = !showPassword; }"
                  />
                </template>
              </UInput>
            </UFormField>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="btn-primary-gradient w-full h-10.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <UIcon v-if="isSubmitting" name="i-lucide-loader-circle" class="w-4 h-4 animate-spin" />
              <UIcon v-else name="i-solar-shield-keyhole-bold-duotone" class="w-4 h-4 text-emerald-100" />
              <span>{{ isSubmitting ? 'Memverifikasi Kredensial...' : 'Masuk ke Workstation' }}</span>
            </button>
          </UForm>
        </div>

        <!-- Security Trust Micro-Bar & Back Link -->
        <div class="pt-4 border-t border-white/10 space-y-3">
          <div class="flex items-center justify-center gap-3 text-[10px] text-slate-400 font-medium text-center">
            <span class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-lock" class="w-3 h-3 text-emerald-400" />
              <span>TLS / AES Encrypted</span>
            </span>
            <span>•</span>
            <span class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-shield-check" class="w-3 h-3 text-indigo-400" />
              <span>RBAC Whitelist</span>
            </span>
            <span>•</span>
            <span>WITA (UTC+8)</span>
          </div>

          <div class="text-center pt-1">
            <NuxtLink
              to="/linimasa"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <UIcon name="i-lucide-arrow-left" class="w-3.5 h-3.5" />
              <span>Kembali ke Linimasa Publik</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

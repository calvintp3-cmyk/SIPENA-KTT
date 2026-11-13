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
    class="min-h-screen bg-slate-50/80 relative flex flex-col justify-center items-center px-4 py-10 sm:px-6 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900"
  >
    <main id="main-content" tabindex="-1" class="w-full max-w-[410px]">
      <!-- Single Minimalist Modern SaaS Card -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] p-6 sm:p-8 space-y-5">
        <!-- Active Session Card -->
        <div v-if="user" class="text-center space-y-4 py-2">
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
            <UIcon name="i-solar-check-circle-bold-duotone" class="w-6 h-6" />
          </div>
          <div class="space-y-1">
            <h1 class="text-base font-bold text-slate-900">Sesi Aktif Terdeteksi</h1>
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

        <!-- Normal Login Card -->
        <div v-else class="space-y-5">
          <!-- Brand & Heading -->
          <div class="text-center space-y-2">
            <div
              class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-teal-700 text-white flex items-center justify-center shadow-xs mx-auto"
            >
              <UIcon name="i-solar-chart-2-bold-duotone" class="w-5 h-5" />
            </div>
            <div class="space-y-1 pt-1">
              <h1 class="text-xl font-extrabold tracking-tight text-slate-900">
                Masuk ke Konsol Admin
              </h1>
              <p class="text-xs text-slate-500">
                Portal Fenomena Ekonomi Kab. Tana Tidung
              </p>
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
          />

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-shield-alert"
            :title="errorMessage"
          />

          <!-- Google Auth Button (Primary Single Click) -->
          <div class="space-y-2">
            <button
              type="button"
              :disabled="!googleLoginEnabled || isRedirectingGoogle"
              class="w-full h-10.5 px-4 rounded-xl bg-white hover:bg-slate-50/90 border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
              <span>{{ isRedirectingGoogle ? 'Mengalihkan...' : 'Lanjutkan dengan Google' }}</span>
            </button>

            <p
              v-if="providersData && !googleLoginEnabled"
              class="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-lg p-2 text-center"
            >
              Google OAuth belum aktif di server.
            </p>
          </div>

          <!-- Divider -->
          <div class="relative flex items-center justify-center">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200" />
            </div>
            <span class="relative px-3 bg-white text-[11px] font-medium text-slate-600">
              atau masuk dengan email
            </span>
          </div>

          <!-- Email & Password Form -->
          <UForm
            method="post"
            :schema="LoginRequestSchema"
            :state="formState"
            class="space-y-3"
            @submit="handleSubmit"
          >
            <UFormField label="Email" name="email" required>
              <UInput
                v-model="formState.email"
                type="email"
                placeholder="nama@email.com"
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
                placeholder="Kata sandi akun"
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
              class="btn-primary-gradient w-full h-10 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer pt-0.5"
            >
              <UIcon v-if="isSubmitting" name="i-lucide-loader-circle" class="w-4 h-4 animate-spin" />
              <UIcon v-else name="i-solar-shield-keyhole-bold-duotone" class="w-4 h-4 text-emerald-100" />
              <span>{{ isSubmitting ? 'Memverifikasi...' : 'Masuk' }}</span>
            </button>
          </UForm>
        </div>

        <!-- Back to Public Link -->
        <div class="pt-4 border-t border-slate-100 text-center">
          <NuxtLink
            to="/linimasa"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <UIcon name="i-lucide-arrow-left" class="w-3.5 h-3.5" />
            <span>Kembali ke Linimasa Publik</span>
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

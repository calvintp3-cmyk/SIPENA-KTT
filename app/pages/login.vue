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
    class="min-h-screen bg-[#F9F8F6] text-[#1A1D1B] relative flex flex-col justify-center items-center px-4 py-12 selection:bg-[#0F4C3A] selection:text-white overflow-hidden"
  >
    <main id="main-content" tabindex="-1" class="w-full max-w-[408px] relative z-10 space-y-5">
      <div
        class="bg-white rounded-2xl border border-[#E7E4DC] shadow-[0_2px_10px_rgba(26,29,27,0.04),0_20px_44px_-16px_rgba(26,29,27,0.08)] p-7 sm:p-8 space-y-5"
      >
        <!-- Active Session Card -->
        <div v-if="user" class="text-center space-y-4 py-3">
          <div class="w-14 h-14 rounded-2xl bg-[#E7F3EE] border border-[#C3DFD3] text-[#0F4C3A] flex items-center justify-center mx-auto">
            <UIcon name="i-solar-check-circle-bold-duotone" class="w-7 h-7" />
          </div>
          <div class="space-y-1">
            <h1 class="text-lg font-extrabold text-[#1A1D1B] font-display">Sesi Aktif Terdeteksi</h1>
            <p class="text-xs text-[#5C615E]">
              Anda terautentikasi sebagai <strong class="text-[#1A1D1B]">{{ user.name }}</strong> ({{ user.role }}).
            </p>
          </div>
          <NuxtLink
            to="/admin"
            class="btn-primary-gradient w-full h-11 px-5 rounded-[10px] text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <UIcon name="i-solar-widget-5-bold-duotone" class="w-4 h-4 text-white" />
            <span>Buka Workstation Admin</span>
            <UIcon name="i-solar-alt-arrow-right-bold-duotone" class="w-4 h-4" />
          </NuxtLink>
        </div>

        <!-- Normal Login Card -->
        <div v-else class="space-y-5">
          <!-- Brand Header -->
          <div class="space-y-3">
            <div class="flex items-center gap-2.5">
              <div
                class="w-9 h-9 rounded-[9px] bg-[#0F4C3A] text-white flex items-center justify-center font-display font-extrabold text-xs tracking-tight shrink-0"
              >
                SK
              </div>
              <span class="font-display font-extrabold text-base text-[#1A1D1B] tracking-tight">
                SIPENA <span class="text-[#0F4C3A]">KTT</span>
              </span>
            </div>

            <div>
              <h1 class="text-xl font-extrabold text-[#1A1D1B] tracking-tight font-display">
                Masuk ke Workstation
              </h1>
              <p class="text-[13px] text-[#5C615E] mt-1 leading-relaxed">
                Gunakan akun staf BPS Kabupaten Tana Tidung yang terdaftar untuk mengakses konsol kurasi PDRB.
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

          <!-- Primary Email & Password Form (Upfront) -->
          <UForm
            method="post"
            :schema="LoginRequestSchema"
            :state="formState"
            class="space-y-3.5"
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
                placeholder="Masukkan kata sandi akun"
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
                    @click="() => { showPassword = !showPassword; }"
                  />
                </template>
              </UInput>
            </UFormField>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="btn-primary-gradient w-full h-10.5 rounded-[10px] text-[13px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <UIcon v-if="isSubmitting" name="i-lucide-loader-circle" class="w-4 h-4 animate-spin" />
              <span>{{ isSubmitting ? 'Memverifikasi Kredensial...' : 'Masuk dengan Email' }}</span>
            </button>
          </UForm>

          <!-- Divider -->
          <div class="relative flex items-center justify-center">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-[#EFECE6]" />
            </div>
            <span class="relative px-3 bg-white text-[11px] font-medium text-[#6B6F6C]">
              atau masuk menggunakan
            </span>
          </div>

          <!-- Secondary Google Auth Button -->
          <div class="space-y-2">
            <button
              type="button"
              :disabled="!googleLoginEnabled || isRedirectingGoogle"
              class="w-full h-10.5 px-4 rounded-[10px] bg-white hover:bg-[#FAF9F7] border border-[#DDD9D0] text-[#1A1D1B] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
              class="text-[11px] text-[#92400E] bg-[#FEF3C7]/60 border border-[#FDE68A] rounded-xl p-2.5 text-center"
            >
              Google OAuth belum aktif di server. Gunakan email &amp; kata sandi di atas.
            </p>
          </div>
        </div>
      </div>

      <div class="text-center">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C615E] hover:text-[#0F4C3A] transition-colors"
        >
          <span>← Kembali ke Portal Publik SIPENA KTT</span>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<!-- app/pages/login.vue -->
<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { LoginRequestSchema, type LoginRequestInput } from '#shared/schemas/auth.schema';
import type { AuthProvidersResponse, AuthUser, UiSemanticColor } from '~/types/sipena';

definePageMeta({
  layout: false,
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
  <div class="min-h-screen bg-[#EFF2F7] relative flex flex-col justify-center px-4 py-12 text-[#0B1220]">
    <div
      aria-hidden="true"
      class="pointer-events-none fixed inset-x-0 top-0 h-[440px] bg-[radial-gradient(ellipse_75%_45%_at_50%_-10%,rgba(15,118,110,0.12),rgba(37,99,235,0.05),transparent)]"
    />

    <div class="relative z-10 sm:mx-auto sm:w-full sm:max-w-[440px] space-y-6">
      <div class="text-center space-y-2.5">
        <div
          class="mx-auto h-11 w-11 rounded-xl bg-gradient-to-b from-[#0F766E] to-[#0B5B55] text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_10px_rgba(15,118,110,0.28)]"
        >
          <UIcon name="i-lucide-box" class="w-5 h-5" />
        </div>
        <div>
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-teal-700">
            BPS Kab. Tana Tidung • Nerwilis
          </span>
          <h1 class="text-2xl font-bold tracking-tight text-[#0B1220] mt-0.5">
            Workstation SIPENA <span class="text-teal-700">KTT</span>
          </h1>
        </div>
        <p class="text-[13px] text-[#5B677A] max-w-sm mx-auto leading-relaxed">
          Kurasi harian fenomena ekonomi, analisis gap sektoral 17 KBLI, dan draf sintesis narasi PDRB.
        </p>
      </div>

      <div v-if="user" class="saas-card rounded-2xl p-6 text-center space-y-4">
        <p class="text-sm text-[#334155]">
          Anda sudah masuk sebagai <strong class="text-[#0B1220]">{{ user.name }}</strong>.
        </p>
        <NuxtLink
          to="/admin"
          class="obsidian-button w-full py-2.5 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2"
        >
          <span>Lanjutkan ke Dashboard Admin</span>
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>

      <div v-else class="saas-card rounded-2xl p-6 sm:p-7 space-y-5">
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
            class="w-full h-10 px-4 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#DCE3EC] text-[#0B1220] text-xs font-semibold shadow-[0_1px_2px_rgba(11,18,32,0.05)] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <span>{{ isRedirectingGoogle ? 'Mengalihkan ke Google...' : 'Masuk dengan Google (Staf Whitelist)' }}</span>
          </button>

          <p
            v-if="providersData && !googleLoginEnabled"
            class="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center leading-relaxed"
          >
            Login Google belum aktif — isi <code class="font-mono">GOOGLE_CLIENT_ID</code> &amp;
            <code class="font-mono">GOOGLE_CLIENT_SECRET</code> pada <code class="font-mono">.env</code> server.
          </p>
          <p v-else class="text-[11px] text-[#5B677A] text-center leading-relaxed">
            Autentikasi OAuth-First khusus Super Admin dan akun staf aktif pada daftar whitelist.
          </p>
        </div>

        <div class="pt-4 border-t border-[#E2E8F0] text-center">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B677A] hover:text-[#0B1220] transition-colors"
            @click="showLocalLogin = !showLocalLogin"
          >
            <UIcon
              :name="showLocalLogin ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="w-3.5 h-3.5"
            />
            <span>
              {{ showLocalLogin ? 'Sembunyikan login kata sandi cadangan' : 'Login alternatif email & kata sandi lokal' }}
            </span>
          </button>
        </div>

        <UForm
          v-if="showLocalLogin"
          :schema="LoginRequestSchema"
          :state="formState"
          class="space-y-4 pt-3 border-t border-[#E2E8F0]"
          @submit="handleSubmit"
        >
          <UFormField label="Email Instansi / Gmail Terdaftar" name="email" required>
            <UInput
              v-model="formState.email"
              type="email"
              placeholder="admin@sipena-ktt.go.id"
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
                  :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                  @click="() => { showPassword = !showPassword; }"
                />
              </template>
            </UInput>
          </UFormField>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="obsidian-button w-full h-10 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2"
          >
            <UIcon v-if="isSubmitting" name="i-lucide-loader-circle" class="w-4 h-4 animate-spin" />
            <UIcon v-else name="i-lucide-log-in" class="w-4 h-4 text-teal-300" />
            <span>{{ isSubmitting ? 'Memverifikasi...' : 'Masuk ke Workstation Admin' }}</span>
          </button>
        </UForm>
      </div>

      <div class="text-center">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
        >
          <UIcon name="i-lucide-arrow-left" class="w-3.5 h-3.5" />
          Kembali ke Portal Publik SIPENA KTT
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

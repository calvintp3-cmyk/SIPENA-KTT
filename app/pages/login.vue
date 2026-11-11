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
      'Alamat Gmail / Google Anda belum didaftarkan di sistem SIPENA KTT. Hubungi Administrator Utama untuk menambahkan email Anda di menu Kelola Akses Admin.',
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
  if (typeof rawTarget !== 'string') return '/admin/review';
  const trimmed = rawTarget.trim();
  if (
    !trimmed ||
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed === '/login' ||
    trimmed.startsWith('/api/auth')
  ) {
    return '/admin/review';
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
      description: 'Anda berhasil masuk ke workspace kurasi SIPENA KTT.',
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
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-12">
    <div class="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
      <div class="text-center space-y-2">
        <div
          class="mx-auto h-12 w-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm"
        >
          <UIcon name="i-lucide-bar-chart-3" class="w-6 h-6" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">SIPENA KTT</h1>
        <p class="text-sm text-slate-600 max-w-sm mx-auto">
          Masuk ke Workstation Kurasi Fenomena Ekonomi &amp; Pemetaan PDRB Kabupaten Tana Tidung
        </p>
      </div>

      <UCard v-if="user" class="text-center">
        <div class="space-y-3 py-2">
          <p class="text-sm text-slate-700">
            Anda sudah masuk sebagai <strong>{{ user.name }}</strong>.
          </p>
          <UButton to="/admin/review" color="primary" block icon="i-lucide-arrow-right">
            Lanjutkan ke Workspace Admin
          </UButton>
        </div>
      </UCard>

      <UCard v-else>
        <UAlert
          v-if="oauthAlert"
          :color="oauthAlert.color"
          variant="subtle"
          icon="i-lucide-shield-alert"
          :title="oauthAlert.title"
          :description="oauthAlert.description"
          class="mb-4"
        />

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-shield-alert"
          :title="errorMessage"
          class="mb-4"
        />

        <!-- Login dengan Akun Google Whitelist -->
        <div class="space-y-2">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="md"
            block
            :loading="isRedirectingGoogle"
            :disabled="!googleLoginEnabled"
            class="bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-medium"
            @click="handleGoogleLogin"
          >
            <template #leading>
              <svg
                class="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
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
            </template>
            Masuk dengan Google (Staf Terdaftar)
          </UButton>

          <p
            v-if="providersData && !googleLoginEnabled"
            class="text-xs text-amber-700 bg-amber-50/80 border border-amber-200/80 rounded-md px-2.5 py-1.5 text-center"
          >
            Login Google belum aktif — isi <code class="font-mono">GOOGLE_CLIENT_ID</code> &amp;
            <code class="font-mono">GOOGLE_CLIENT_SECRET</code> di <code class="font-mono">.env</code> server.
          </p>
          <p v-else class="text-[11px] text-slate-500 text-center">
            Khusus alamat Gmail staf yang telah didaftarkan pada daftar whitelist admin.
          </p>
        </div>

        <div class="relative my-5">
          <div class="absolute inset-0 flex items-center" aria-hidden="true">
            <div class="w-full border-t border-slate-200" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-white px-2.5 text-slate-400 font-medium">
              atau masuk dengan kata sandi
            </span>
          </div>
        </div>

        <UForm
          :schema="LoginRequestSchema"
          :state="formState"
          class="space-y-4"
          @submit="handleSubmit"
        >
          <UFormField label="Email Instansi" name="email" required>
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
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <div class="pt-2">
            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="md"
              block
              :loading="isSubmitting"
              icon="i-lucide-log-in"
            >
              Masuk ke Workspace Admin
            </UButton>
          </div>
        </UForm>
      </UCard>

      <div class="text-center">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline"
        >
          <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
          Kembali ke Portal Publik SIPENA KTT
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

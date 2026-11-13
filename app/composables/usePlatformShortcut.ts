// app/composables/usePlatformShortcut.ts
export function usePlatformShortcut() {
  const isMac = ref(false);

  onMounted(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const platform = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform
        || navigator.platform
        || navigator.userAgent;
      isMac.value = /mac/i.test(platform);
    }
  });

  const shortcutKey = computed(() => (isMac.value ? '⌘K' : 'Ctrl K'));
  const shortcutTitle = computed(() =>
    isMac.value
      ? 'Tekan ⌘K untuk membuka pencarian cepat'
      : 'Tekan Ctrl+K atau / untuk membuka pencarian cepat',
  );

  return {
    isMac,
    shortcutKey,
    shortcutTitle,
  };
}


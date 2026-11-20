// app/composables/useSynthesisDraftGuard.ts
import { onBeforeRouteLeave } from 'vue-router';

export function useSynthesisDraftGuard(
  hasUnsavedChanges: Ref<boolean>,
  resetDirtyWorkspace: () => void,
) {
  const confirmDiscardOpen = ref(false);
  const confirmDiscardTitle = ref('Buang Perubahan Draf yang Belum Disimpan?');
  const confirmDiscardDescription = ref(
    'Anda memiliki suntingan narasi BRS yang belum disimpan ke database.',
  );
  let pendingDiscardAction: (() => Promise<void> | void) | null = null;
  let bypassRouteGuardOnce = false;

  function promptDiscardIfDirty(
    action: () => Promise<void> | void,
    options?: { title?: string; description?: string },
  ) {
    if (!hasUnsavedChanges.value) {
      void action();
      return;
    }
    confirmDiscardTitle.value = options?.title ?? 'Buang Perubahan Draf yang Belum Disimpan?';
    confirmDiscardDescription.value =
      options?.description ??
      'Anda memiliki suntingan narasi BRS yang belum disimpan ke database. Perubahan yang belum disimpan akan hilang jika Anda melanjutkan.';
    pendingDiscardAction = action;
    confirmDiscardOpen.value = true;
  }

  function cancelDiscardModal() {
    pendingDiscardAction = null;
    confirmDiscardOpen.value = false;
  }

  async function confirmDiscardAndProceed() {
    const action = pendingDiscardAction;
    pendingDiscardAction = null;
    confirmDiscardOpen.value = false;
    if (action) await action();
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasUnsavedChanges.value) return;
    event.preventDefault();
    event.returnValue = '';
  }

  onMounted(() => {
    if (import.meta.client) window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onBeforeUnmount(() => {
    if (import.meta.client) window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  onBeforeRouteLeave((to) => {
    if (bypassRouteGuardOnce || !hasUnsavedChanges.value) {
      bypassRouteGuardOnce = false;
      return true;
    }
    const nextPath = to.fullPath;
    promptDiscardIfDirty(
      async () => {
        bypassRouteGuardOnce = true;
        await navigateTo(nextPath);
      },
      {
        title: 'Tinggalkan Studio Penulisan BRS?',
        description: 'Masih ada perubahan draf yang belum disimpan.',
      },
    );
    return false;
  });

  return {
    confirmDiscardOpen,
    confirmDiscardTitle,
    confirmDiscardDescription,
    promptDiscardIfDirty,
    cancelDiscardModal,
    confirmDiscardAndProceed,
  };
}

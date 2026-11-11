// app/composables/useExcelExport.ts
export interface ExportArticlesParams {
  format: 'xlsx' | 'csv';
  status?: string;
  llmStatus?: string;
  isEconomic?: string;
  year?: number | string;
  quarter?: number | string;
  kbli?: string;
  pdrbGroup?: string;
  expenditure?: string;
  portal?: string;
  from?: string;
  to?: string;
  q?: string;
}

function extractDownloadFilename(headerValue: string | null, fallbackName: string): string {
  if (!headerValue) return fallbackName;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(headerValue);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return fallbackName;
    }
  }

  const basicMatch = /filename="?([^";]+)"?/i.exec(headerValue);
  if (basicMatch?.[1]) {
    return basicMatch[1].trim();
  }
  return fallbackName;
}

export function useExcelExport() {
  const toast = useToast();
  const isExporting = ref(false);
  const exportingFormat = ref<'xlsx' | 'csv' | null>(null);

  async function downloadExport(params: ExportArticlesParams): Promise<boolean> {
    if (isExporting.value) return false;

    isExporting.value = true;
    exportingFormat.value = params.format;

    try {
      const searchParams = new URLSearchParams();
      searchParams.set('format', params.format);

      const optionalEntries: Array<[string, string | number | undefined]> = [
        ['status', params.status],
        ['llmStatus', params.llmStatus],
        ['isEconomic', params.isEconomic],
        ['year', params.year],
        ['quarter', params.quarter],
        ['kbli', params.kbli],
        ['pdrbGroup', params.pdrbGroup],
        ['expenditure', params.expenditure],
        ['portal', params.portal],
        ['from', params.from],
        ['to', params.to],
        ['q', params.q],
      ];

      for (const [key, rawVal] of optionalEntries) {
        if (rawVal === undefined || rawVal === null) continue;
        const valStr = String(rawVal).trim();
        if (valStr !== '' && valStr !== 'ALL') {
          searchParams.set(key, valStr);
        }
      }

      const response = await fetch(`/api/admin/articles/export?${searchParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.status === 401) {
        toast.add({
          title: 'Sesi Berakhir',
          description: 'Silakan login kembali untuk mengekspor data.',
          color: 'warning',
          icon: 'i-lucide-lock',
        });
        await navigateTo('/login');
        return false;
      }

      if (!response.ok) {
        let message = 'Gagal menghasilkan berkas ekspor.';
        try {
          const errJson = (await response.json()) as { statusMessage?: string; message?: string };
          message = errJson.message || errJson.statusMessage || message;
        } catch {
          // Abaikan error parse body non-JSON
        }
        toast.add({
          title: 'Ekspor Gagal',
          description: message,
          color: 'error',
          icon: 'i-lucide-alert-triangle',
        });
        return false;
      }

      const blob = await response.blob();
      const defaultExt = params.format === 'csv' ? 'csv' : 'xlsx';
      const fallbackFilename = `SIPENA_KTT_Fenomena_PDRB.${defaultExt}`;
      const filename = extractDownloadFilename(
        response.headers.get('content-disposition'),
        fallbackFilename,
      );

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);

      toast.add({
        title: `Berhasil Mengunduh ${params.format.toUpperCase()}`,
        description: `Berkas ${filename} siap digunakan untuk kertas kerja PDRB.`,
        color: 'success',
        icon: 'i-lucide-download',
      });
      return true;
    } catch (error) {
      toast.add({
        title: 'Terjadi Kesalahan Jaringan',
        description:
          error instanceof Error ? error.message : 'Tidak dapat terhubung ke server ekspor.',
        color: 'error',
        icon: 'i-lucide-wifi-off',
      });
      return false;
    } finally {
      isExporting.value = false;
      exportingFormat.value = null;
    }
  }

  return {
    isExporting: readonly(isExporting),
    exportingFormat: readonly(exportingFormat),
    downloadExport,
  };
}


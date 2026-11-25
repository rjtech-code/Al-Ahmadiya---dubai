'use client';

import { useState } from 'react';

type ImportResult = {
  success?: boolean;
  message?: string;
  copiedRows?: number;
  totalRows?: number;
  tables?: { table: string; rows: number | null }[];
};

export default function DataImportPage() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  async function uploadDemoData() {
    if (running) return;
    setRunning(true);
    setMessage('Uploading demo data. Please keep this page open…');
    setResult(null);
    try {
      const response = await fetch('/api/v1/admin/demo-import', { method: 'POST' });
      const data = (await response.json()) as ImportResult & { message?: string };
      if (!response.ok || !data.success) throw new Error(data.message || 'Demo data import failed.');
      setResult(data);
      setMessage('All demo data uploaded successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed. Please try again.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f1e8] px-5 py-10 text-[#123b3b]">
      <section className="w-full max-w-xl rounded-3xl border border-[#d8c9a7] bg-white p-8 text-center shadow-xl sm:p-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#9b7838]">Al Ahmadiya · Temporary utility</p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Demo Data Import</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#536565]">Upload the complete SQL demo dataset to the connected database.</p>
        <button type="button" onClick={uploadDemoData} disabled={running}
          className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-[#123b3b] px-6 py-4 text-base font-semibold text-white transition hover:bg-[#1c5554] disabled:cursor-wait disabled:opacity-60">
          {running ? 'Uploading demo data…' : 'Upload All Demo Data'}
        </button>
        <p aria-live="polite" className="mt-5 text-sm font-medium text-[#536565]">{message}</p>
        {result && <div className="mt-5 rounded-xl bg-[#edf6ef] p-4 text-left text-sm text-[#24533a]">
          <p className="font-semibold">{result.message}</p>
          <p className="mt-1">Rows copied: {result.copiedRows?.toLocaleString() ?? 0}</p>
          <p>Total rows verified: {result.totalRows?.toLocaleString() ?? 0}</p>
          <p>Tables processed: {result.tables?.length ?? 0}</p>
        </div>}
      </section>
    </main>
  );
}

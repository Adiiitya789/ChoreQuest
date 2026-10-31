import { useState, type DragEvent } from 'react';
import { FileUp, Sparkles } from 'lucide-react';
import { buildDemoWave } from '@/lib/sampleData';
import { MAX_STATEMENT_BYTES, parseStatementCsv } from '@/lib/csv';
import { mergeExpenses } from '@/lib/expenses';
import { useGame } from '@/state/useGame';
import type { Expense } from '@/types';

type Notice = { tone: 'success' | 'error'; text: string };

export function StatementImport() {
  const { state, dispatch } = useGame();
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  function importExpenses(incoming: Expense[]) {
    const preview = mergeExpenses(state.expenses, incoming);
    dispatch({ type: 'IMPORT_EXPENSES', incoming });
    return preview;
  }

  async function handleFile(file: File) {
    if (file.size > MAX_STATEMENT_BYTES) {
      setNotice({ tone: 'error', text: 'That file is too large. Please upload a statement under 1 MB.' });
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setNotice({ tone: 'error', text: 'Please choose a CSV file exported from your bank or payment app.' });
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseStatementCsv(text, () => crypto.randomUUID());
      if (!parsed.ok) {
        setNotice({ tone: 'error', text: parsed.error });
        return;
      }
      const result = importExpenses(parsed.expenses);
      const parts = [`Imported ${result.added} new transactions`];
      if (result.duplicates > 0) parts.push(`${result.duplicates} already in your list`);
      if (parsed.skipped > 0) parts.push(`skipped ${parsed.skipped} unreadable rows`);
      setNotice({ tone: 'success', text: `${parts.join(', ')}.` });
    } catch {
      setNotice({ tone: 'error', text: 'We could not read that file. Please try exporting it again.' });
    }
  }

  function handleDemo() {
    const result = importExpenses(buildDemoWave(() => crypto.randomUUID()));
    setNotice({ tone: 'success', text: `${result.added} new demo asteroids are on their way.` });
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <section aria-labelledby="import-heading" className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="import-heading" className="text-lg font-semibold text-ink">
            Add transactions
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Upload a CSV with Date, Description and Amount columns. Dates are read as day/month/year.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDemo}
          className="focus-ring flex shrink-0 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-primary-500 hover:text-primary-600"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Load a demo wave
        </button>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`focus-ring mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition ${
          dragging ? 'border-primary-500 bg-primary-50' : 'border-secondary-600 bg-paper hover:border-primary-500'
        }`}
      >
        <FileUp className="h-6 w-6 text-primary-600" aria-hidden="true" />
        <span className="text-sm font-semibold text-ink">Drop a CSV here or click to choose a file</span>
        <span className="text-xs text-ink-muted">Up to 500 transactions, 1 MB</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void handleFile(file);
          }}
        />
      </label>

      {notice && (
        <p
          role="status"
          className={`mt-4 rounded-lg px-4 py-2.5 text-sm ${
            notice.tone === 'error' ? 'bg-danger-50 text-danger-700' : 'bg-primary-50 text-primary-700'
          }`}
        >
          {notice.text}
        </p>
      )}
    </section>
  );
}

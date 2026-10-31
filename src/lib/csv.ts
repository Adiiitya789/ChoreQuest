import type { Expense } from '@/types';

export const MAX_STATEMENT_BYTES = 1_000_000;
export const MAX_STATEMENT_ROWS = 500;

const DESCRIPTION_HEADER = /description|narration|merchant|payee|details|particulars|name|memo/;
const AMOUNT_HEADER = /amount|debit|withdrawal|spent|paid/;

export type StatementParseResult =
  | { ok: true; expenses: Expense[]; skipped: number }
  | { ok: false; error: string };

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

function parseDate(raw: string): string | null {
  const value = raw.trim();
  let year: number;
  let month: number;
  let day: number;

  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    [year, month, day] = isoMatch.slice(1).map(Number);
  } else {
    const dayFirst = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (!dayFirst) return null;
    day = Number(dayFirst[1]);
    month = Number(dayFirst[2]);
    year = Number(dayFirst[3]);
    if (year < 100) year += 2000;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCDate() !== day) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  const value = Number(cleaned);
  if (!cleaned || !Number.isFinite(value)) return null;
  return Math.round(Math.abs(value) * 100) / 100;
}

function findColumn(headers: string[], pattern: RegExp): number {
  return headers.findIndex((header) => pattern.test(header));
}

export function parseStatementCsv(text: string, makeId: () => string): StatementParseResult {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) {
    return { ok: false, error: 'The file needs a header row and at least one transaction.' };
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const columns = {
    date: headers.findIndex((header) => header.includes('date')),
    description: findColumn(headers, DESCRIPTION_HEADER),
    amount: findColumn(headers, AMOUNT_HEADER),
  };
  const missing = Object.entries(columns)
    .filter(([, index]) => index === -1)
    .map(([name]) => name);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Could not find a ${missing.join(', ')} column. Expected headers like Date, Description and Amount.`,
    };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_STATEMENT_ROWS) {
    return { ok: false, error: `Please upload at most ${MAX_STATEMENT_ROWS} transactions at a time.` };
  }

  const expenses: Expense[] = [];
  let skipped = 0;
  for (const row of dataRows) {
    const date = parseDate(row[columns.date] ?? '');
    const merchant = (row[columns.description] ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const amount = parseAmount(row[columns.amount] ?? '');
    if (!date || !merchant || amount === null || amount === 0) {
      skipped++;
      continue;
    }
    expenses.push({ id: makeId(), merchant, amount, date, category: null });
  }

  if (expenses.length === 0) {
    return { ok: false, error: 'No valid transactions were found in this file.' };
  }
  return { ok: true, expenses, skipped };
}

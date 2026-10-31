import { describe, expect, it } from 'vitest';
import { parseCsv, parseStatementCsv } from '@/lib/csv';

let n = 0;
const makeId = () => `id-${++n}`;

describe('parseCsv', () => {
  it('handles quoted fields with commas and escaped quotes', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\n1,2,3')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });
});

describe('parseStatementCsv', () => {
  it('reads bank-style headers and both date formats', () => {
    const result = parseStatementCsv(
      'Txn Date,Narration,Withdrawal Amt\n05/10/2026,SWIGGY ORDER,"₹1,250.50"\n2026-10-06,Uber Trip,300',
      makeId,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.expenses.map(({ merchant, amount, date }) => ({ merchant, amount, date }))).toEqual([
      { merchant: 'SWIGGY ORDER', amount: 1250.5, date: '2026-10-05' },
      { merchant: 'Uber Trip', amount: 300, date: '2026-10-06' },
    ]);
  });

  it('skips rows with impossible dates or zero amounts', () => {
    const result = parseStatementCsv('Date,Description,Amount\n31/02/2026,Ghost,10\n01/03/2026,Free,0\n02/03/2026,Cafe,90', makeId);
    expect(result.ok && result.expenses.map((e) => e.merchant)).toEqual(['Cafe']);
  });

  it('explains which column is missing', () => {
    const result = parseStatementCsv('Date,Amount\n01/01/2026,10', makeId);
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.error).toContain('description');
  });
});

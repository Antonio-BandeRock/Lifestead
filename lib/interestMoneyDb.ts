// Reading and writing Interests > Money (2026-10-30). What an amount says
// about itself is decided in lib/interestMoney.ts with no database; this
// carries out the changes. See interest_money in lib/db.ts.

import { getDatabase } from './db';
import { cleanInterestText } from './interests';
import { readMoneyDirection, type MoneyDirection, type MoneyEntry } from './interestMoney';

type MoneyRow = Omit<MoneyEntry, 'direction'> & { direction: string };

const MONEY_COLUMNS = `id, interest_id AS interestId, direction, amount, on_day AS onDay, what, who, note, created_at AS createdAt`;

function cleanOrNull(text: string | null | undefined): string | null {
  const cleaned = text ? cleanInterestText(text) : '';
  return cleaned ? cleaned : null;
}

export async function listInterestMoney(): Promise<MoneyEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MoneyRow>(`SELECT ${MONEY_COLUMNS} FROM interest_money ORDER BY on_day DESC, created_at DESC`);
  return rows.map((row) => ({ ...row, direction: readMoneyDirection(row.direction) }));
}

export type MoneyInput = {
  interestId: string;
  direction: MoneyDirection;
  amount: number;
  onDay: string;
  what: string;
  who: string | null;
  note: string | null;
};

export async function addInterestMoney(input: MoneyInput): Promise<string> {
  const db = await getDatabase();
  const id = `interest_money_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO interest_money (id, interest_id, direction, amount, on_day, what, who, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.interestId,
    input.direction,
    input.amount,
    input.onDay,
    cleanInterestText(input.what),
    cleanOrNull(input.who),
    cleanOrNull(input.note),
    now,
    now,
  );
  return id;
}

export async function updateInterestMoney(id: string, input: MoneyInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE interest_money SET interest_id = ?, direction = ?, amount = ?, on_day = ?, what = ?, who = ?, note = ?, updated_at = ?
     WHERE id = ?`,
    input.interestId,
    input.direction,
    input.amount,
    input.onDay,
    cleanInterestText(input.what),
    cleanOrNull(input.who),
    cleanOrNull(input.note),
    new Date().toISOString(),
    id,
  );
}

export async function deleteInterestMoney(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM interest_money WHERE id = ?', id);
}

/** How many amounts are kept, for the My Interests menu. */
export async function countInterestMoney(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM interest_money');
  return Number(row?.n ?? 0);
}

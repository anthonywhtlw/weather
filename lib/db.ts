import { neon } from "@neondatabase/serverless";

type NeonClient = ReturnType<typeof neon>;

let client: NeonClient | null = null;
let schemaReady: Promise<void> | null = null;

function connectionString(): string {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "No database connection string. Connect the Neon store to this project on Vercel.",
    );
  }
  return url;
}

export function db(): NeonClient {
  if (!client) client = neon(connectionString());
  return client;
}

/**
 * The tables are created by the app itself, on the first request, so there is
 * never any SQL to run by hand. `if not exists` makes every later call a no-op.
 */
export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = db();

      await sql`
        create table if not exists readings (
          id          bigserial primary key,
          station     text not null,
          temperature real not null,
          humidity    real,
          taken_at    timestamptz not null default now()
        )`;

      await sql`
        create table if not exists settings (
          id          int primary key default 1,
          threshold_c real not null default 24
        )`;

      await sql`insert into settings (id) values (1) on conflict (id) do nothing`;
    })().catch((error) => {
      schemaReady = null; // let the next request try again
      throw error;
    });
  }

  return schemaReady;
}

export type ReadingRow = {
  timestamp: string;
  temperature: number;
  humidity: number | null;
};

export async function insertReading(
  station: string,
  temperature: number,
  humidity: number | null,
): Promise<void> {
  await ensureSchema();
  await db()`
    insert into readings (station, temperature, humidity)
    values (${station}, ${temperature}, ${humidity})`;
}

/** Newest first. `taken_at` is formatted in SQL so the JSON is clean ISO-8601. */
export async function recentReadings(limit = 120): Promise<ReadingRow[]> {
  await ensureSchema();

  const rows = await db()`
    select to_char(taken_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as timestamp,
           temperature,
           humidity
    from readings
    order by taken_at desc
    limit ${limit}`;

  return rows as ReadingRow[];
}

export async function getThreshold(): Promise<number> {
  await ensureSchema();

  const rows = (await db()`select threshold_c from settings where id = 1`) as {
    threshold_c: number;
  }[];

  return rows[0]?.threshold_c ?? 24;
}

export async function setThreshold(value: number): Promise<number> {
  await ensureSchema();

  const rows = (await db()`
    update settings set threshold_c = ${value} where id = 1
    returning threshold_c`) as { threshold_c: number }[];

  return rows[0]?.threshold_c ?? value;
}

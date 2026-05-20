import { createClient } from "@/lib/supabase/client";

/**
 * Fetches ALL rows from a Supabase table, paginating in batches of 1000.
 * Supabase default limit is 1000 rows per query.
 */
export async function fetchAllRows<T>(
  table: string,
  select: string = "*",
  filters?: { column: string; value: string | boolean }[]
): Promise<T[]> {
  const supabase = createClient();
  const pageSize = 1000;
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);

    if (filters) {
      for (const f of filters) {
        query = query.eq(f.column, f.value);
      }
    }

    const { data, error } = await query;

    if (error || !data) {
      break;
    }

    allData = allData.concat(data as T[]);

    if (data.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }

  return allData;
}

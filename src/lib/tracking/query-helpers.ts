import { createClient } from '@/lib/supabase/client'
import type { OrgTables } from './organizations'

/**
 * Query multiple org tables and merge results (for "Todas Empresas").
 * The buildQuery callback receives the table name and should use
 * a supabase client (obtained via getTrackingClient or createClient)
 * to build and execute the query.
 */
export async function queryMultiOrg<T>(
  orgTablesList: OrgTables[],
  tablePick: (t: OrgTables) => string,
  buildQuery: (tableName: string) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const results = await Promise.all(
    orgTablesList.map(async (tables) => {
      const tableName = tablePick(tables)
      const { data, error } = await buildQuery(tableName)
      if (error) {
        console.error(`[queryMultiOrg] Error querying ${tableName}:`, error)
      }
      return data || []
    })
  )
  return results.flat()
}

/**
 * Count across multiple org tables and sum (for "Todas Empresas").
 * Uses the browser Supabase client from plataforma-email.
 */
export async function countMultiOrg(
  orgTablesList: OrgTables[],
  tablePick: (t: OrgTables) => string,
  buildQuery: (tableName: string) => PromiseLike<{ count: number | null; error: unknown }>
): Promise<number> {
  const results = await Promise.all(
    orgTablesList.map(async (tables) => {
      const tableName = tablePick(tables)
      const { count, error } = await buildQuery(tableName)
      if (error) {
        console.error(`[countMultiOrg] Error querying ${tableName}:`, error)
      }
      return count || 0
    })
  )
  return results.reduce((a, b) => a + b, 0)
}

/**
 * Get a Supabase client instance for use in tracking queries.
 * This is the browser client — use only in client components.
 */
export function getTrackingClient() {
  return createClient()
}

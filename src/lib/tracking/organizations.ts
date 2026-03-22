/**
 * Tracking organization table mappings.
 *
 * Each client org uses separate tables in the same Supabase project.
 * These map org slugs to the correct table names for events,
 * conversions, and lead_journey views.
 */

export interface OrgTables {
  events: string
  conversions: string
  leadJourney: string
}

export interface TrackingOrganization {
  id: string
  name: string
  orgId: string // Supabase organization UUID
  tables: OrgTables
}

export const TRACKING_ORGANIZATIONS: TrackingOrganization[] = [
  {
    id: 'templum',
    name: 'Templum',
    orgId: 'd7a3cbaa-6f5c-4f21-9326-03d9c30a6c7b',
    tables: {
      events: 'events',
      conversions: 'conversions',
      leadJourney: 'lead_journey',
    },
  },
  {
    id: 'orbit',
    name: 'Orbit Gestao',
    orgId: 'aa652b9a-5a03-4c59-be37-8a81cd6ecdb9',
    tables: {
      events: 'orbit_gestao_events',
      conversions: 'orbit_gestao_conversions',
      leadJourney: 'orbit_gestao_lead_journey',
    },
  },
  {
    id: 'evolutto',
    name: 'Evolutto',
    orgId: '657d0237-5a96-4dc4-bc9a-a3638278de04',
    tables: {
      events: 'evolutto_events',
      conversions: 'evolutto_conversions',
      leadJourney: 'evolutto_lead_journey',
    },
  },
]

export function getTrackingOrgById(id: string): TrackingOrganization | undefined {
  return TRACKING_ORGANIZATIONS.find(o => o.id === id)
}

/**
 * Find tracking org by platform organization UUID.
 * This is the main function to use — maps currentOrg.id to tracking tables.
 */
export function getTrackingOrgByOrgId(orgId: string): TrackingOrganization | undefined {
  return TRACKING_ORGANIZATIONS.find(o => o.orgId === orgId)
}

/**
 * Match a platform org slug (e.g. "templum-consultoria-1772822369099")
 * to a tracking organization (e.g. id="templum").
 * Tries: exact match, slug contains org id, org name matches slug start.
 */
export function findTrackingOrgBySlug(slug: string): TrackingOrganization | undefined {
  const s = slug.toLowerCase()
  return TRACKING_ORGANIZATIONS.find(
    (o) =>
      o.id === s ||
      s.includes(o.id) ||
      s.startsWith(o.name.toLowerCase().replace(/\s+/g, '-'))
  )
}

export function getAllOrgTables(): OrgTables[] {
  return TRACKING_ORGANIZATIONS.map(o => o.tables)
}

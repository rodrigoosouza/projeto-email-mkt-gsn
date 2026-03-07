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
  tables: OrgTables
}

export const TRACKING_ORGANIZATIONS: TrackingOrganization[] = [
  {
    id: 'templum',
    name: 'Templum',
    tables: {
      events: 'events',
      conversions: 'conversions',
      leadJourney: 'lead_journey',
    },
  },
  {
    id: 'orbit',
    name: 'Orbit Gestao',
    tables: {
      events: 'orbit_gestao_events',
      conversions: 'orbit_gestao_conversions',
      leadJourney: 'orbit_gestao_lead_journey',
    },
  },
  {
    id: 'evolutto',
    name: 'Evolutto',
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

export function getAllOrgTables(): OrgTables[] {
  return TRACKING_ORGANIZATIONS.map(o => o.tables)
}

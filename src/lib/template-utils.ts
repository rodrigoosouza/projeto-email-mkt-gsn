/**
 * Replace template variables like {{first_name}}, {{last_name}}, {{company}}, {{email}}, {{position}}
 */
export function replaceTemplateVariables(
  html: string,
  variables: Record<string, string>
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match
  })
}

/**
 * Build variables map from a lead
 */
export function buildLeadVariables(lead: {
  email: string
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  position?: string | null
}): Record<string, string> {
  return {
    email: lead.email,
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    company: lead.company || '',
    position: lead.position || '',
    full_name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email,
  }
}

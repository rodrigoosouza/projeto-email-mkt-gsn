// ============= ENUMS =============
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum LeadStatus {
  ACTIVE = 'active',
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PAUSED = 'paused',
  FAILED = 'failed',
}

export enum SegmentType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
}

export enum OperatorType {
  EQUALS = 'equals',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
}

// ============= ORGANIZATIONS =============
export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  website: string | null
  sender_email: string | null
  sender_name: string | null
  custom_domain: string | null
  domain_verified: boolean
  created_at: string
  updated_at: string
  created_by: string
}

// ============= USERS =============
export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
}

export interface OrganizationMember {
  id: string
  org_id: string
  user_id: string
  role: UserRole
  created_at: string
  user?: User
  organization?: Organization
}

// ============= LEADS =============
export interface Lead {
  id: string
  org_id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  company: string | null
  position: string | null
  status: LeadStatus
  score: number
  custom_fields: Record<string, any>
  source: string | null
  external_id: string | null
  created_at: string
  updated_at: string
  last_contacted_at: string | null
}

export interface LeadTag {
  id: string
  org_id: string
  name: string
  color: string
  created_at: string
}

export interface LeadTagAssignment {
  id: string
  lead_id: string
  tag_id: string
  created_at: string
}

// ============= SEGMENTS =============
export interface Segment {
  id: string
  org_id: string
  name: string
  description: string | null
  type: SegmentType
  rules: SegmentRule[] | null
  lead_count: number
  created_at: string
  updated_at: string
}

export interface SegmentRule {
  id: string
  segment_id: string
  field: string
  operator: OperatorType
  value: any
  logic: 'AND' | 'OR'
}

export interface SegmentMembership {
  id: string
  segment_id: string
  lead_id: string
  created_at: string
}

// ============= TEMPLATES =============
export interface EmailTemplate {
  id: string
  org_id: string
  name: string
  description: string | null
  category: string
  subject: string
  html_content: string
  unlayer_json: any
  preview_text: string | null
  is_ai_generated: boolean
  created_at: string
  updated_at: string
  created_by: string
}

// ============= CAMPAIGNS =============
export interface Campaign {
  id: string
  org_id: string
  name: string
  status: CampaignStatus
  template_id: string
  segment_id: string
  total_leads: number
  sent_at: string | null
  scheduled_for: string | null
  created_at: string
  updated_at: string
  created_by: string
  template?: EmailTemplate
  segment?: Segment
}

export interface CampaignStats {
  id: string
  campaign_id: string
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_bounced: number
  total_complained: number
  updated_at: string
}

export interface CampaignSendLog {
  id: string
  campaign_id: string
  lead_id: string
  email: string
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'
  mailersend_message_id: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  bounced_at: string | null
  complained_at: string | null
  error_message: string | null
  updated_at: string
}

// ============= INVITATIONS =============
export interface Invitation {
  id: string
  org_id: string
  email: string
  role: UserRole
  token: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
  created_by: string
}

// ============= API KEYS =============
export interface ApiKey {
  id: string
  org_id: string
  name: string
  key_hash: string
  created_at: string
  last_used_at: string | null
  created_by: string
}

// ============= CUSTOM FIELDS =============
export interface CustomFieldDefinition {
  id: string
  org_id: string
  name: string
  label: string
  field_type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'url' | 'email' | 'phone'
  options: string[] | null
  required: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ============= LEAD EVENTS =============
export type LeadEventType =
  | 'created' | 'updated' | 'tag_added' | 'tag_removed'
  | 'email_sent' | 'email_delivered' | 'email_opened' | 'email_clicked'
  | 'email_bounced' | 'email_complained'
  | 'segment_added' | 'segment_removed'
  | 'score_changed' | 'status_changed'
  | 'campaign_added' | 'note' | 'custom'

export interface LeadEvent {
  id: string
  org_id: string
  lead_id: string
  event_type: LeadEventType
  title: string
  description: string | null
  metadata: Record<string, any>
  created_at: string
}

// ============= LEAD SCORING =============
export type ScoringConditionType =
  | 'email_opened' | 'email_clicked' | 'email_bounced' | 'email_complained'
  | 'tag_added' | 'tag_removed'
  | 'field_equals' | 'field_contains' | 'field_not_empty'
  | 'page_visited' | 'form_submitted'
  | 'days_since_last_activity'

export interface LeadScoringRule {
  id: string
  org_id: string
  name: string
  description: string | null
  condition_type: ScoringConditionType
  condition_value: string | null
  score_change: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============= INTEGRATIONS =============
export type IntegrationProvider =
  | 'google_analytics'
  | 'meta_ads'
  | 'google_ads'
  | 'whatsapp'
  | 'mailersend'
  | 'gtm'
  | 'twilio'
  | 'openrouter'
  | 'n8n'
  | 'vercel'

export interface Integration {
  id: string
  org_id: string
  provider: IntegrationProvider
  config: Record<string, any>
  is_active: boolean
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export type AnalyticsMetricType =
  | 'page_views' | 'sessions' | 'users' | 'bounce_rate'
  | 'top_pages' | 'traffic_sources' | 'conversions'
  | 'ad_spend' | 'ad_impressions' | 'ad_clicks' | 'ad_ctr' | 'ad_cpc'
  | 'ad_campaigns' | 'lead_ads'

export interface AnalyticsData {
  id: string
  org_id: string
  integration_id: string
  metric_type: AnalyticsMetricType
  data: Record<string, any>
  period_start: string
  period_end: string
  fetched_at: string
}

// ============= AUTOMATIONS =============
export type AutomationTriggerType =
  | 'lead_created' | 'tag_added' | 'tag_removed'
  | 'score_threshold' | 'email_opened' | 'email_clicked'
  | 'status_changed' | 'custom_event' | 'scheduled'

export type AutomationActionType =
  | 'send_email' | 'add_tag' | 'remove_tag'
  | 'update_field' | 'webhook' | 'notify'
  | 'add_to_segment' | 'remove_from_segment'
  | 'update_score' | 'wait'

export interface AutomationAction {
  id: string
  type: AutomationActionType
  config: Record<string, any>
}

export interface Automation {
  id: string
  org_id: string
  name: string
  description: string | null
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, any>
  actions: AutomationAction[]
  is_active: boolean
  n8n_workflow_id: string | null
  execution_count: number
  last_executed_at: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export interface AutomationLog {
  id: string
  automation_id: string
  org_id: string
  lead_id: string | null
  status: 'success' | 'error' | 'skipped'
  trigger_data: Record<string, any>
  actions_executed: Record<string, any>[]
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

// ============= WHATSAPP =============
export interface WhatsAppTemplate {
  id: string
  org_id: string
  name: string
  language: string
  category: 'marketing' | 'utility' | 'authentication'
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  components: any[]
  wa_template_id: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppConversation {
  id: string
  org_id: string
  lead_id: string | null
  phone_number: string
  contact_name: string | null
  status: 'open' | 'closed' | 'expired'
  last_message_at: string | null
  unread_count: number
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppMessage {
  id: string
  conversation_id: string
  org_id: string
  direction: 'inbound' | 'outbound'
  message_type: 'text' | 'image' | 'document' | 'video' | 'audio' | 'template' | 'interactive' | 'reaction'
  content: Record<string, any>
  wa_message_id: string | null
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'received' | null
  created_at: string
}

export interface WhatsAppBroadcast {
  id: string
  org_id: string
  name: string
  template_id: string
  segment_id: string | null
  status: 'draft' | 'sending' | 'sent' | 'failed'
  total_recipients: number
  total_sent: number
  total_delivered: number
  total_read: number
  total_failed: number
  sent_at: string | null
  created_at: string
  created_by: string
}

// ============= SMS =============
export interface SmsMessage {
  id: string
  org_id: string
  lead_id: string | null
  phone_number: string
  direction: 'inbound' | 'outbound'
  body: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received' | null
  provider_message_id: string | null
  error_message: string | null
  created_at: string
}

export interface SmsBroadcast {
  id: string
  org_id: string
  name: string
  body: string
  segment_id: string | null
  status: 'draft' | 'sending' | 'sent' | 'failed'
  total_recipients: number
  total_sent: number
  total_delivered: number
  total_failed: number
  sent_at: string | null
  created_at: string
  created_by: string
}

// ============= FORMS =============
export type FormType = 'inline' | 'popup' | 'slide_in' | 'floating_button'

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea'
  required: boolean
  placeholder?: string
  options?: string[]
}

export interface LeadForm {
  id: string
  org_id: string
  name: string
  description: string | null
  form_type: FormType
  fields: FormField[]
  settings: Record<string, any>
  style: Record<string, any>
  success_message: string
  redirect_url: string | null
  tag_ids: string[]
  segment_id: string | null
  is_active: boolean
  submission_count: number
  created_at: string
  updated_at: string
  created_by: string
}

export interface FormSubmission {
  id: string
  form_id: string
  org_id: string
  lead_id: string | null
  data: Record<string, any>
  source_url: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// ============= CHATBOT =============
export interface ChatbotConfig {
  id: string
  org_id: string
  name: string
  welcome_message: string | null
  ai_enabled: boolean
  ai_model: string
  ai_system_prompt: string | null
  widget_color: string
  widget_position: 'bottom-right' | 'bottom-left'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ChatbotRule {
  id: string
  org_id: string
  chatbot_id: string
  trigger_pattern: string
  response_text: string
  priority: number
  is_active: boolean
  created_at: string
}

export interface ChatbotConversation {
  id: string
  org_id: string
  chatbot_id: string
  lead_id: string | null
  visitor_id: string | null
  status: 'open' | 'closed' | 'archived'
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ChatbotMessage {
  id: string
  conversation_id: string
  org_id: string
  role: 'visitor' | 'bot' | 'agent'
  content: string
  metadata: Record<string, any>
  created_at: string
}

// ============= AUDIENCE EXPORTS =============
export type AudiencePlatform = 'meta_ads' | 'google_ads'

export interface AudienceExport {
  id: string
  org_id: string
  name: string
  platform: AudiencePlatform
  segment_id: string | null
  config: Record<string, any>
  status: 'draft' | 'processing' | 'completed' | 'failed'
  total_leads: number
  exported_leads: number
  platform_audience_id: string | null
  last_synced_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  created_by: string
}

// ============= SEO ANALYZER =============
export interface SeoAnalysis {
  id: string
  org_id: string
  url: string
  title: string | null
  meta_description: string | null
  overall_score: number
  issues: SeoIssue[]
  recommendations: string[]
  performance_data: Record<string, any>
  status: 'pending' | 'analyzing' | 'completed' | 'failed'
  analyzed_at: string | null
  created_at: string
  created_by: string
}

export interface SeoIssue {
  type: 'error' | 'warning' | 'info'
  category: string
  message: string
  element?: string
}

// ============= SOCIAL MEDIA =============
export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'tiktok'

export interface SocialAccount {
  id: string
  org_id: string
  platform: SocialPlatform
  account_name: string
  account_id: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SocialPost {
  id: string
  org_id: string
  account_id: string
  content: string
  media_urls: string[]
  hashtags: string[]
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduled_for: string | null
  published_at: string | null
  platform_post_id: string | null
  metrics: Record<string, any>
  error_message: string | null
  created_at: string
  updated_at: string
  created_by: string
  account?: SocialAccount
}

// ============= BIO LINKS =============
export interface BioPage {
  id: string
  org_id: string
  slug: string
  title: string
  description: string | null
  avatar_url: string | null
  background_color: string
  text_color: string
  button_style: 'rounded' | 'pill' | 'square'
  custom_css: string | null
  is_active: boolean
  view_count: number
  created_at: string
  updated_at: string
  created_by: string
  links?: BioLink[]
}

export interface BioLink {
  id: string
  bio_page_id: string
  org_id: string
  title: string
  url: string
  icon: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  sort_order: number
  is_active: boolean
  click_count: number
  created_at: string
}

// ============= WHITE LABEL =============
export interface WhiteLabelConfig {
  id: string
  org_id: string
  app_name: string
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  custom_domain: string | null
  custom_css: string | null
  hide_branding: boolean
  email_footer_text: string | null
  created_at: string
  updated_at: string
}

// ============= REQUESTS/RESPONSES =============
export interface CreateLeadPayload {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  company?: string
  position?: string
  score?: number
  custom_fields?: Record<string, any>
  source?: string
  external_id?: string
  tags?: string[]
}

export interface CreateCampaignPayload {
  name: string
  template_id: string
  segment_id: string
  scheduled_for?: string
}

export interface EventWebhookPayload {
  event: string
  data: {
    message_id: string
    email: string
    timestamp: string
    [key: string]: any
  }
}

// ============= DASHBOARD =============
export interface DashboardKPI {
  label: string
  value: number | string
  change?: number
  changeLabel?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

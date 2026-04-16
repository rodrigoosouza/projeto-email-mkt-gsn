# Google Ads API — Design Document

**Application:** Internal Marketing Reporting Platform
**Company:** [SUA EMPRESA — ex: Orbit Gestão / Templum Consultoria / Sua Razão Social]
**Date:** April 2026
**Contact:** rodrigoosouzaamarketing@gmail.com

---

## 1. Tool Overview

We are building an internal reporting and analytics platform used by our marketing
agency team to monitor and report on advertising performance across multiple
channels for our SMB clients in Brazil.

The platform consolidates data from:
- **Meta Ads (Facebook/Instagram)** — already integrated, in production
- **Google Ads** — this application
- **Pipedrive CRM** — for lead/deal attribution
- **Internal lead capture forms** — for full-funnel visibility

The Google Ads API will be used **exclusively to fetch reporting and insights
data** for display inside our internal dashboard. The tool is consumed only by
our agency staff (employees, contractors). External users (clients) may
optionally view a read-only shareable report link, but cannot interact with
campaigns or modify ad accounts in any way through our tool.

We will **not** use the API for:
- Automated bidding or budget changes
- Campaign, ad group, or ad creation
- Account management or user provisioning
- Conversion tracking setup
- Remarketing list management

---

## 2. Business Purpose & Use Case

We currently manage Google Ads accounts for three active clients:
- **Templum Consultoria**
- **Evolutto**
- **Orbit Gestão**

Today our team manually copies metrics from the Google Ads UI into spreadsheets
to produce weekly performance reports for clients and management. This is
error-prone and time-consuming.

The Google Ads API integration replaces this manual process with automated
nightly data ingestion into our internal database (PostgreSQL on Supabase),
which then powers an internal dashboard showing:
- Daily campaign-level metrics (spend, impressions, clicks, conversions, leads)
- Cost-per-lead and ROAS calculations
- Period-over-period comparisons
- Lead-source attribution (cross-referencing Google Ads `gclid` parameter
  with leads captured in our CRM)

---

## 3. Architecture

```
┌─────────────────┐         ┌──────────────────┐       ┌────────────────┐
│  Google Ads API │ ◄────── │  Sync Service    │ ────► │   Supabase     │
│  (v17, REST)    │  GAQL   │  (Next.js cron)  │ INSRT │   PostgreSQL   │
└─────────────────┘         └──────────────────┘       └────────────────┘
                                                                │
                                                                ▼
                                                         ┌────────────────┐
                                                         │  Next.js App   │
                                                         │  Dashboard UI  │
                                                         └────────────────┘
                                                                │
                                                                ▼
                                                         ┌────────────────┐
                                                         │  Internal team │
                                                         │  (employees)   │
                                                         └────────────────┘
```

**Hosting:** Vercel (Next.js) + Supabase (PostgreSQL)
**Authentication:** OAuth 2.0 (offline access with refresh token, server-side only)
**Token storage:** Encrypted refresh tokens stored in our `google_ads_accounts`
table, accessible only via Supabase Row Level Security.

---

## 4. API Methods Used

We will only use **read-only** methods. Specifically, we will execute the
following GAQL queries via `customers/{customer_id}/googleAds:searchStream`:

### 4.1 Account discovery
```sql
SELECT customer_client.id, customer_client.descriptive_name,
       customer_client.currency_code, customer_client.time_zone
FROM customer_client
WHERE customer_client.level <= 1
```

### 4.2 Campaign-level daily insights
```sql
SELECT campaign.id, campaign.name, campaign.status,
       segments.date,
       metrics.cost_micros, metrics.impressions, metrics.clicks,
       metrics.conversions, metrics.conversions_value,
       metrics.average_cpc, metrics.ctr,
       metrics.search_impression_share
FROM campaign
WHERE segments.date BETWEEN '2026-04-01' AND '2026-04-30'
```

### 4.3 Ad group daily insights
```sql
SELECT ad_group.id, ad_group.name, ad_group.campaign,
       segments.date,
       metrics.cost_micros, metrics.impressions, metrics.clicks,
       metrics.conversions
FROM ad_group
WHERE segments.date BETWEEN '2026-04-01' AND '2026-04-30'
```

### 4.4 Ad-level daily insights
```sql
SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type,
       ad_group_ad.ad_group, ad_group_ad.status,
       segments.date,
       metrics.cost_micros, metrics.impressions, metrics.clicks,
       metrics.conversions
FROM ad_group_ad
WHERE segments.date BETWEEN '2026-04-01' AND '2026-04-30'
```

We **do not** use any mutate, create, update, or remove operations.

---

## 5. Data Flow & Storage

1. **OAuth setup** — An internal admin user clicks "Connect Google Ads" inside
   our platform. They are redirected to Google's OAuth consent page (scope:
   `https://www.googleapis.com/auth/adwords`). The refresh token is stored
   encrypted in our database, scoped to the client's organization.

2. **Daily sync (cron)** — A scheduled job runs once per day at 06:00 UTC. For
   each connected account:
   - Refresh the access token using the stored refresh token.
   - Run the four GAQL queries above for the previous 7 days (Google reports
     are settled with a delay, so we re-fetch a rolling window).
   - Upsert results into our PostgreSQL tables: `google_campaign_insights`,
     `google_adgroup_insights`, `google_ad_insights`, `google_adgroups`.
   - Log sync status into `google_sync_logs`.

3. **Manual sync** — The internal user can also trigger a sync manually from
   the dashboard.

4. **Dashboard** — Internal users view aggregated metrics (charts, tables) by
   reading from the local PostgreSQL tables. The Google Ads API is never called
   from the browser.

---

## 6. User Interface

The dashboard shows:
- **KPI cards:** Total spend, total leads, average CPL, total impressions, total
  clicks (current vs previous period comparison)
- **Time-series chart:** Daily spend / leads / clicks / CPL
- **Campaign table:** Sortable list of campaigns with spend, impressions, CTR,
  conversions, CPL, sortable columns
- **Ad-group breakdown:** When a campaign is selected, daily metrics by ad
  group
- **Read-only share link (optional):** An admin can generate a token to share
  the read-only dashboard view with a client. The shared view does not expose
  any API access — it only serves cached PostgreSQL data.

No part of the UI exposes the ability to create, modify or pause Google Ads
entities.

---

## 7. Security & Compliance

- **OAuth tokens:** Refresh tokens are stored server-side only, never sent to
  the browser. Access tokens are generated per-request and cached briefly in
  memory.
- **Row Level Security:** All client data is isolated by organization ID using
  PostgreSQL RLS policies. A user from agency client A cannot see data from
  client B.
- **Audit trail:** Every sync operation is logged in `google_sync_logs` with
  timestamps, status, records synced and any errors.
- **Rate limiting:** We respect Google Ads API quotas. Sync jobs run at off-peak
  hours and use the streaming endpoint to minimize request count.
- **No PII export:** We do not export user-level click data, only aggregated
  campaign / ad group / ad metrics.
- **Compliance:** We comply with the Google Ads API Terms of Service. We do not
  store, transmit, or display API responses to anyone outside the agency staff
  and the specific client to whom the data belongs.

---

## 8. Who Has Access

- **Internal users (primary):** Agency staff (5-15 employees and contractors).
  They have full read access to the dashboard for the clients they manage.
- **External users (read-only, optional):** Clients may receive a tokenized
  read-only link to view their own report. The link only grants access to
  pre-rendered metrics from our database — no API operations are exposed.

---

## 9. Token Usage

- **Single developer token** used by our internal sync service.
- **Per-client OAuth refresh tokens** stored encrypted, used to access each
  client's individual Google Ads account.
- **API call volume estimate:** ~50 queries per day per client account (during
  the daily sync window). With 3 clients, this totals ~150 queries/day, well
  below standard quota limits.

---

## 10. Roadmap

- **Phase 1 (current):** Read-only reporting dashboard for internal team and
  optional read-only share for clients.
- **Phase 2 (future, separate token application if needed):** None planned. We
  do not intend to expand into automated bidding, campaign management, or
  conversion uploads.

---

**End of Design Document**

# Base de Conhecimento Prática - Orbit

> Última atualização: Março 2026 | Versão 3.0

## 📋 Sumário
1. [Stack e Dependências](#1-stack-e-dependências)
2. [Guia de Acesso e Autenticação](#2-guia-de-acesso-e-autenticação)
3. [Catálogo Completo de Rotas](#3-catálogo-completo-de-rotas)
4. [Módulos por Domínio](#4-módulos-por-domínio)
5. [Catálogo de Edge Functions](#5-catálogo-de-edge-functions)
6. [Catálogo de RPCs](#6-catálogo-de-rpcs)
7. [Hooks Transversais](#7-hooks-transversais)
8. [Serviços (Service Layer)](#8-serviços-service-layer)
9. [Tipos TypeScript](#9-tipos-typescript)
10. [Schemas das Tabelas Principais](#10-schemas-das-tabelas-principais)
11. [Triggers, RLS e Side-Effects](#11-triggers-rls-e-side-effects)
12. [Fluxos Operacionais Passo a Passo](#12-fluxos-operacionais-passo-a-passo)
13. [Sistema de Permissões Completo](#13-sistema-de-permissões-completo)

---

## 1. Stack e Dependências

### Runtime
- **React** 18.3.1 + **Vite** 5.4.1 + **TypeScript** 5.5.3
- **React Router DOM** 6.26.2
- **React Query** (@tanstack/react-query) 5.56.2
- **Zustand** 5.0.11 (estado global auxiliar)
- **Supabase JS** 2.98.0

### UI
- **Tailwind CSS** 3.4.11 + shadcn/ui (Radix UI)
- **Lucide React** 0.462.0 (ícones)
- **Framer Motion** 12.33.0 (animações)
- **Recharts** 2.12.7 (gráficos)

### Formulários e Validação
- **React Hook Form** 7.53.0 + **Zod** 3.23.8 + **@hookform/resolvers** 3.9.0

### Documentos e Exportação
- **docx** 9.5.1 + **docx-preview** 0.3.6 (Word)
- **jspdf** 4.1.0 + **pdfjs-dist** 5.3.31 (PDF)
- **xlsx** 0.18.5 (Excel)

### Editor de Texto Rico
- **@tiptap/*** (editor WYSIWYG)

### BPMN
- **bpmn-js** 18.12.0 + **bpmn-js-properties-panel** 6.0.1

### Fluxogramas
- **reactflow** 11.11.4

### Voz e IA
- **@elevenlabs/react** 0.14.0 (voz em tempo real)
- OpenAI via Edge Functions (STT, TTS, stream)

### Markdown
- **react-markdown** 9.1.0 + **remark-gfm** 4.0.1 + **marked** 12.0.2

### Utilitários
- **date-fns** 3.6.0, **uuid** 9.0.1, **dompurify** 3.2.6, **sonner** 1.5.0

---

## 2. Guia de Acesso e Autenticação

### Rotas Públicas (sem autenticação)
- `/` → Página inicial (Index)
- `/login` → Login
- `/register` → Registro
- `/forgot-password` → Recuperação de senha
- `/reset-password` → Redefinição de senha
- `/create-organization` → Criação de organização
- `/complete-organization` → Completar organização
- `/auth/callback` → Callback OAuth
- `/pricing` → Página de preços
- `/checkout` → Checkout (lazy)
- `/checkout-success` → Sucesso no checkout (lazy)
- `/become-partner` → Seja parceiro (lazy)
- `/consultor` → Página consultor (lazy)
- `/privacy-policy` → Política de privacidade
- `/terms-of-service` → Termos de uso
- `/s/:slug` → Resposta pública de pesquisa (lazy)
- `/share/:token` → Compartilhamento público de documento
- `/supplier/onboarding/:token` → Onboarding de fornecedor (lazy)
- `/cotacao/:token` → Portal de cotação para fornecedores (lazy)
- `/p/:slug` → Documento público (App.tsx)
- `/bpmn/view/:shareToken` → Visualização BPMN pública (App.tsx)
- `/folder/:token` → Pasta pública (App.tsx)
- `/orgchart/view/:shareToken` → Organograma público (App.tsx)

### Componentes de Proteção
- **ProtectedRoute** — exige autenticação
- **RequirePrivilege** — exige privilégio específico (ex: `purchasing_admin`)
- **RequireModuleEnabled** — exige módulo habilitado na organização

### Hooks de Autenticação
- `useUserAuth` — autenticação do usuário
- `useLogin` — lógica de login
- `useAuthCheck` — verificação contínua de sessão
- `useCheckPrivilege` — verificação de privilégio
- `useCheckSuperAdmin` — verificação de super admin
- `useOrgAdminAccess` — acesso admin da organização
- `useLicenseCheck` — verificação de licença

---

## 3. Catálogo Completo de Rotas

### Dashboard
- `/dashboard` → Dashboard principal

### Processos
- `/process-assistant` → Assistente de processos (IA)
- `/process/:id` → Detalhes do processo
- `/activity/:processId/:activityId` → Detalhes da atividade
- `/execution/:executionId` → Roteador inteligente de execução
- `/execution/:processId/:executionId` → Execução de processo (compatibilidade)
- `/process-execution/:executionId` → Execução de processo (compatibilidade)
- `/manual-execution/:processId/:executionId` → Execução manual

### Workflows
- `/workflows` → Gestão de workflows (versões, validação, ativação)

### Estratégico
- `/strategic-planning` → Planejamento estratégico

### Indicadores e Qualidade
- `/indicators-dashboard` → Dashboard de indicadores
- `/indicator/:processId/:indicatorId` → Detalhe do indicador
- `/process/:processId/indicator/:indicatorId` → Detalhe do indicador (alt)
- `/standalone-indicator/:indicatorId` → Indicador standalone
- `/quality-control/:processId/:qualityControlId` → Controle de qualidade
- `/process/:processId/quality-control/:qualityControlId` → Controle de qualidade (alt)

### Tarefas
- `/task-dashboard` → Dashboard de tarefas
- `/tasks/reports` → Relatórios de tarefas

### MyOrbit
- `/my-orbit` → Visão pessoal do colaborador
- `/my-orbit/team-dashboard` → Dashboard do time

### Treinamentos
- `/training` → Cursos disponíveis
- `/training/:courseId` → Detalhe do curso
- `/my-training/:enrollmentId` → Meu curso (portal do colaborador)

### Gestão de Usuários e Estrutura
- `/users` → Gestão de usuários
- `/users/:id/edit` → Editar usuário (EditUser)
- `/orgchart` → Organograma (5 visões: Hierárquica, Departamentos, Funcionograma, Combinada, Funções)
- `/departments` → Departamentos
- `/job-positions` → Cargos
- `/locations` → Localidades (CRUD completo — nome, endereço, cidade, estado, país, CEP)
- `/organization-setup` → Configuração da organização

### Gestão de Pessoas (RH)
- `/pdi` → Planos de Desenvolvimento Individual
- `/pdi/new` → Novo PDI
- `/pdi/:id` → Detalhe do PDI
- `/cv-analyzer` → Analisador de CVs
- `/saved-cv-analyses` → Análises de CV salvas

### Documentos e Instruções
- `/work-instructions` → Instruções de trabalho
- `/documents` → Gestão de documentos

### Reuniões
- `/meetings` → Repositório de reuniões
- `/meetings/:id` → Detalhe da reunião

### Problemas
- `/problems` → Repositório de problemas
- `/problems/:id` → Detalhe do problema
- `/problems/reports` → Relatórios de problemas

### Riscos
- `/risks` → Repositório de riscos
- `/risks/reports` → Relatórios de riscos

### Oportunidades
- `/opportunities` → Repositório de oportunidades
- `/opportunities/reports` → Relatórios de oportunidades

### Pesquisas (Surveys)
- `/surveys` → Lista de pesquisas
- `/surveys/new` → Nova pesquisa (SurveyBuilder)
- `/surveys/:id` → Visualização da pesquisa
- `/surveys/:id/edit` → Edição da pesquisa
- `/surveys/:id/respond` → Responder pesquisa
- `/surveys/:id/results` → Resultados da pesquisa

### APIs
- `/apis` → Gestão de APIs (RequireModuleEnabled)

### CRM
- `/crm` → Dashboard CRM
- `/crm/webforms` → Web forms
- `/crm/automations` → Automações
- `/crm/reports` → Relatórios CRM
- `/crm/api-keys` → Chaves de API do CRM
- `/crm/webhooks` → Webhooks do CRM
- Legado: `/commercial/crm*` → redireciona para `/crm*`

### Comercial
- `/commercial/strategic-info` → Informações estratégicas
- `/commercial/products-analysis` → Análise de produtos
- `/commercial/clients-partners` → Clientes e parceiros
- `/commercial/marketing-calendar` → Calendário de marketing
- `/commercial/programs` → Programas comerciais

### Compras (Purchasing)
- `/purchasing` → redireciona para `/purchasing/requests`
- `/purchasing/requests` → Solicitações de compra
- `/purchasing/requests/:id` → Detalhe da solicitação
- `/purchasing/requests/:id/edit` → Edição da solicitação
- `/purchasing/approvals` → Aprovações de compra
- `/purchasing/rfqs` → RFQs
- `/purchasing/rfqs/:id` → Detalhe do RFQ
- `/purchasing/suppliers` → Fornecedores
- `/purchasing/suppliers/:id` → Detalhe do fornecedor
- `/purchasing/suppliers/:id/edit` → Edição do fornecedor
- `/purchasing/reports` → Relatórios de compras
- `/purchasing/settings` → **RequirePrivilege: "purchasing_admin"** → Configurações

### Admin
- `/privileges` → Gestão de privilégios
- `/org-admin` → Administração da organização

---

## 4. Módulos por Domínio

### 🎯 Estratégico
**Rota**: `/strategic-planning`
**Componente**: StrategicPlanning
**Descrição**: Missão, visão, valores, SWOT, objetivos estratégicos, tarefas geradas por IA
**Edge Functions**: `generate-strategic-planning`, `ai-mission-refinement`, `ai-vision-refinement`, `ai-values-refinement`, `generate-swot-recommendations`, `generate-strategic-tasks`

### 🏢 Estrutura Organizacional

**Departamentos**: `/departments` → Departments
**Cargos**: `/job-positions` → JobPositions — competências, treinamentos, exportação PDF/Word. Campo "Cargo Superior" usa `parent_position_id` (FK self-reference → job_positions) para hierarquia de cargos.
**Edge Functions**: `generate-job-position`, `generate-job-position-suggestions`, `generate-job-position-trainings`, `fix-job-positions`
**Localidades**: `/locations` → Locations — CRUD com nome, descrição, endereço, cidade, estado, país, CEP. Tabela `locations` (org-scoped, RLS). Campo `location_id` em `employee_details` vincula colaborador à localidade.

**Organograma**: `/orgchart` → OrgChart | view pública: `/orgchart/view/:shareToken` → OrgChartPublicView
- 5 visões: Hierárquica (pessoas), Departamentos, Funcionograma (cargos individuais), Combinada, **Funções** (cargos agrupados por título único com contagem e ocupantes agregados)
- Visão "Funções" usa `useRolesLayout` que agrupa `jobPositions` por título case-insensitive, resolve hierarquia via `parent_position_id`, e exibe `RoleNode` com badge de contagem (×N)

### 👥 Gestão de Pessoas

**Usuários**: `/users` → Users | `/users/:id/edit` → EditUser
**PDI**: `/pdi`, `/pdi/new`, `/pdi/:id` — planos com IA
**Edge Functions**: `generate-pdi-recommendation`, `generate-pdi-suggestions`

**Analisador de CVs**: `/cv-analyzer`, `/saved-cv-analyses`
**Edge Function**: `analyze-cv`

### 🔄 Processos

**Assistente**: `/process-assistant` → geração de processos com IA
**Detalhe**: `/process/:id` → ProcessDetail
**Atividades**: `/activity/:processId/:activityId` → ActivityDetail
**Execuções**: `ExecutionRouter`, `ProcessExecutionDetail`, `ManualExecutionDetail`
**BPMN**: `/bpmn/view/:shareToken` → BPMNPublicView
**Instruções**: `/work-instructions` → WorkInstructions
**Edge Functions**: `generate-processes`, `generate-process-details`, `process-instructions-assistant`, `generate-activity-instructions`, `generate-bpmn`, `generate-quality-policy-scope`

### 🔁 Workflows
**Rota**: `/workflows` → WorkflowsPage
**Hooks**: `useWorkflows`, `useWorkflowVersions`, `useWorkflowSteps`, `useWorkflowValidation`, `useWorkflowActivation`, `useUnifiedWorkflows`, `useDefaultWorkflow`

### 📊 Indicadores e Qualidade

**Dashboard**: `/indicators-dashboard` → IndicatorsDashboard
**Detalhe**: `/indicator/:processId/:indicatorId` → IndicatorDetail
**Standalone**: `/standalone-indicator/:indicatorId` → StandaloneIndicatorDetail
**Controle de Qualidade**: `/quality-control/:processId/:qualityControlId` → QualityControlDetail
**Edge Functions**: `analyze-indicators`, `generate-indicator-suggestions`, `delete-indicator`

### ✅ Tarefas
**Dashboard**: `/task-dashboard` → TaskDashboard
**Relatórios**: `/tasks/reports` → TasksReports
**Edge Functions**: `check-overdue-tasks`, `check-task-reminders`, `send-task-notification`, `extract-tasks-from-transcription`, `backfill-completed-dates`
**Hook**: `useTaskNotifications`

### 🌀 MyOrbit
**Rota**: `/my-orbit` → MyOrbit
**Team**: `/my-orbit/team-dashboard` → MyOrbitTeamDashboard
**Serviço**: `orbitService` | **Hook**: `useOrbitContext`

### 🎓 Treinamentos
**Lista**: `/training` → Training
**Detalhe**: `/training/:courseId` → TrainingCourseDetail
**Portal colaborador**: `/my-training/:enrollmentId` → MyTrainingCourse
**Edge Functions**: `training-tutor`, `process-training-content`, `sync-training-completion`
**Serviço**: `trainingIntegrationService`

### 📋 Documentos
**Gestão**: `/documents` → DocumentManagement
**Público**: `/p/:slug` → PublicDocumentView | `/folder/:token` → PublicFolderView
**Edge Functions**: `download-document`, `check-expiring-documents`, `process-knowledge-queue`, `update-knowledge-embeddings`
**Hooks**: `useVersionEditor`

### 🤝 Reuniões
**Repositório**: `/meetings` → MeetingRepository
**Detalhe**: `/meetings/:id` → MeetingDetail
**Funcionalidades**: transcrição, gravação, extração de tarefas, convites
**Edge Functions**: `get-recording`, `get-transcription`, `request-transcription`, `process-transcription-ai`, `create-evolumeet`, `send-meeting-invitation`, `extract-tasks-from-transcription`
**Hooks**: `useMeetingData`, `useMeetingRecording`, `useMeetingTranscription`, `useMeetingAttachments`

### 🚨 Problemas
**Repositório**: `/problems` → ProblemsRepository
**Detalhe**: `/problems/:id` → ProblemDetail
**Relatórios**: `/problems/reports` → ProblemsReports
**API**: `/problems/api-keys` → ProblemApiKeys
**Edge Functions**: `generate-problem-description`, `generate-problem-hypotheses`, `generate-problem-report`, `problems-api`
**Serviços**: `problemService`, `problemExportService`, `problemReportPdfExportService`, `problemReportWordExportService`, `problemApiKeysService`

### ⚠️ Riscos
**Repositório**: `/risks` → RisksRepository
**Relatórios**: `/risks/reports` → RisksReports
**Edge Functions**: `generate-risk-opportunity-actions`
**Serviço**: `riskService`, `riskExportService`

### 🚀 Oportunidades
**Repositório**: `/opportunities` → OpportunitiesRepository
**Relatórios**: `/opportunities/reports` → OpportunitiesReports
**Serviço**: `opportunityService`, `opportunityExportService`

### 📋 Pesquisas (Surveys)
**Gestão**: `/surveys` → Surveys
**Builder**: `/surveys/new`, `/surveys/:id/edit` → SurveyBuilder
**Resposta pública**: `/s/:slug` → PublicSurveyRespond
**Resultados**: `/surveys/:id/results` → SurveyResultsPage
**Edge Functions**: `generate-survey-ai`, `survey-ai-analysis`, `survey-results`, `survey-export-csv`
**Hooks**: `useSurveys`, `useSurveyResults`, `useSurveyResponses`, `useSurveyAIAnalysis`, `useSurveyPermissions`, `useSurveyNotifications`, `usePublicSurveys`

### 🛒 Compras (Purchasing)
**Solicitações**: `/purchasing/requests` → PurchaseRequestsPage
**Aprovações**: `/purchasing/approvals` → PurchaseApprovalsPage
**RFQs**: `/purchasing/rfqs` → RFQsPage
**Portal fornecedor**: `/cotacao/:token` → SupplierQuotePage (público)
**Fornecedores**: `/purchasing/suppliers` → SuppliersPage
**Onboarding fornecedor**: `/supplier/onboarding/:token` → SupplierOnboarding (público)
**Relatórios**: `/purchasing/reports` → ProcurementReportsPage
**Configurações**: `/purchasing/settings` → PurchaseSettingsPage (requer `purchasing_admin`)
**Edge Functions**: `rfq-portal`, `supplier-portal`, `send-supplier-invitation`
**Serviços**: `approvalLimitService`, `excelSupplierImportService`
**Hook**: `useApprovalLimits`
**Anexos**: Tabela `purchase_request_attachments` (FK → `purchase_requests.id`, CASCADE). Bucket privado `purchase-request-attachments` com signed URLs. Componente `PurchaseRequestAttachments` (dropzone, upload, download, delete). RLS: SELECT/INSERT para membros da org, DELETE apenas pelo uploader.

### 🎯 Recrutamento e Seleção
**Dashboard**: `/recrutamento` → Recruitment
**Candidatura pública**: `/p/vaga/:token` → PublicJobApplication
**Entrevista pública**: `/p/interview/:token` → PublicInterview
**Callback OAuth**: `/linkedin/callback` → LinkedInCallback
**Edge Functions**: `extract-cv-text`, `analyze-cv-for-job`, `recruitment-agent`, `linkedin-oauth-exchange`, `linkedin-post-job`, `linkedin-post-job-listing`, `generate-linkedin-post`, `tts-interview`
**Hooks**: `useRecruitmentJobs`, `useRecruitmentCandidates`, `useRecruitmentInterviews`, `useRecruitmentAI`, `useAutomationSettings`, `useLinkedInIntegration`
**Tabelas**: `recruitment_jobs`, `recruitment_candidates`, `recruitment_interviews`, `recruitment_interview_answers`, `recruitment_interview_progress`, `recruitment_automation_settings`, `linkedin_connections`

**Integração LinkedIn (Feed)**: Publica posts no feed via UGC Posts API. Usa `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET` (secrets) e `VITE_LINKEDIN_CLIENT_ID` (env var frontend).
**Integração LinkedIn (Jobs API)**: Publica vagas oficiais via `/v2/jobPostings`. Requer aprovação como ATS Partner. Usa `LINKEDIN_JOBS_CLIENT_ID` + `LINKEDIN_JOBS_CLIENT_SECRET` + `LINKEDIN_ATS_ID` (secrets) e `VITE_LINKEDIN_JOBS_CLIENT_ID` (env var frontend).

**Tabela `linkedin_connections`**:
- `integration_type` (text, NOT NULL, default 'feed'): 'feed' ou 'jobs_api'
- UNIQUE(organization_id, integration_type) — até 2 registros por org
- `jobs_api_company_id`, `jobs_api_access_token`, `jobs_api_token_expires_at` — campos exclusivos da Jobs API

**Tabela `recruitment_jobs`** (campos LinkedIn):
- `linkedin_post_id` — ID do post no feed
- `linkedin_posted_at` — data de publicação no feed
- `linkedin_job_posting_id` — ID da vaga oficial
- `linkedin_job_posted_at`, `linkedin_job_expires_at` — datas da Jobs API

### 🤖 CRM
**Dashboard**: `/crm` → CRM.tsx
**Web Forms**: `/crm/webforms` → CRMWebForms
**Automações**: `/crm/automations` → CRMAutomations
**Relatórios**: `/crm/reports` → CRMReports
**API Keys**: `/crm/api-keys` → CRMApiKeys
**Webhooks**: `/crm/webhooks` → CRMWebhooks
**Edge Functions**: `crm-api`, `crm-lead-ai-coach`, `crm-webform-embed`, `crm-webform-submit`, `crm-webhook-dispatch`, `check-crm-sla`
**Serviços**: `crmService`, `crmApiKeysService`, `crmAutomationsService`, `crmWebFormsService`, `crmWebhooksService`, `leadExportService`, `leadImportService`
**Hooks**: `usePipelineProcessor`

### 📈 Comercial
**Info Estratégica**: `/commercial/strategic-info` → StrategicInfo
**Análise de Produtos**: `/commercial/products-analysis` → ProductsAnalysis
**Clientes e Parceiros**: `/commercial/clients-partners` → ClientsPartnersAnalysis
**Calendário de Marketing**: `/commercial/marketing-calendar` → MarketingCalendar
**Programas**: `/commercial/programs` → CommercialPrograms
**Hooks**: `useCommercialGuide`, `useCommercialPrograms`, `useCommercialStrategicInfo`, `useMarketingCalendar`

### 🧠 IA e Assistentes
**Assistente da plataforma**: Edge Function `platform-assistant`
**Omnipresent Agent**: componente `omnipresent-agent/` + Edge Function `omnipresent-agent`
**RAG Search**: `rag-search` + `search-knowledge` + `knowledge-base-daily-reindex`
**Deep Research**: Edge Function `deep-research`
**Editor com IA**: Edge Function `editor-ai`
**Voz em tempo real**: `@elevenlabs/react` + Edge Functions `elevenlabs-conversation-token`, `realtime-voice`, `voice-chat`, `voice-response`
**STT/TTS**: Edge Functions `openai-stt`, `openai-tts`, `openai-stream`, `tts-stream`, `transcribe-audio`
**Hooks**: `useVoiceConversation`, `useAIAssistant`, `useAgentProcessor`
**Serviços**: `realtimeVoiceService`, `realtimeWebSocketService`, `audioService`, `aiContextService`, `aiGenerationService`

### 🔔 Notificações
**Sistema V2**: `NotificationsV2Context` + `notificationsV2Service`
**Email**: `send-email`, `send-notification-email`, `send-notification-email-v2`, `process-email-queue`
**Hooks**: `useNotifications`, `useNotificationsV2`, `usePdiNotifications`, `useSurveyNotifications`, `useTaskNotifications`

### 💳 Comercial / Pagamentos
**Pricing**: `/pricing` → Pricing
**Checkout**: `/checkout` → Checkout | `/checkout-success` → CheckoutSuccess
**Parceiro**: `/become-partner` → BecomePartner
**Consultor**: `/consultor` → Consultor
**Stripe**: Edge Functions `create-checkout-session`, `create-channel-checkout`, `create-public-checkout`, `create-public-b2b-checkout`, `stripe-webhook`, `retry-payment`, `manage-subscription`, `modify-channel-subscription`
**Trial**: `convert-trial`, `create-trial-signup`
**Hooks**: `useCheckoutCart`, `useCheckoutSettings`, `useTrialStatus`, `usePlanSubscriptions`, `usePricingPlans`, `usePricingAddons`, `useVouchers`, `useSubscriptions`, `usePaymentGateway`
**Canal (white-label)**: `useChannelTheme`, `useChannelLogo`, `useChannelConfig`, `useChannelPlans`, `useChannelQuota`, `useChannelDebts`

### 🔐 Admin e Super Admin
**Privilégios**: `/privileges` → Privileges
**Org Admin**: `/org-admin` → OrgAdmin (com painel de knowledge base, email monitoring, organizações em quarentena, gestão de super admin, renovações)
**Super Admin**: `useCheckSuperAdmin`, `useSuperAdmin`, `useChannelAdminAccess`, `useChannelAdminPromotion`
**Edge Functions**: `delete-orphan-users`, `replicate-organization-template`, `crop-avatar`, `oauth-callback`

### 🌐 APIs Externas
**Rota**: `/apis` → ApisPage (RequireModuleEnabled)
**Integrações**: EvolúHelp (`evoluhelp-sync`, `evoluhelp-webhook`), OAuth (`oauth-callback`)

---

## 5. Catálogo de Edge Functions

### Gestão de Membros
- `add-organization-member`
- `remove-organization-member`
- `update-organization-member`
- `restore-organization-member`

### Usuários e Auth
- `update-user-metadata`
- `delete-orphan-users`
- `oauth-callback`
- `send-auth-email`
- `send-user-invitation`
- `crop-avatar`

### IA — Planejamento Estratégico
- `generate-strategic-planning`
- `ai-mission-refinement`
- `ai-vision-refinement`
- `ai-values-refinement`
- `generate-swot-recommendations`
- `generate-strategic-tasks`

### IA — Processos
- `generate-processes`
- `generate-process-details`
- `process-instructions-assistant`
- `generate-activity-instructions`
- `generate-bpmn`
- `generate-quality-policy-scope`

### IA — Problemas
- `generate-problem-description`
- `generate-problem-hypotheses`
- `generate-problem-report`

### IA — Riscos e Oportunidades
- `generate-risk-opportunity-actions`

### IA — Indicadores
- `generate-indicator-suggestions`
- `analyze-indicators`
- `delete-indicator`

### IA — Cargos e Pessoas
- `generate-job-position`
- `generate-job-position-suggestions`
- `generate-job-position-trainings`
- `fix-job-positions`
- `generate-pdi-recommendation`
- `generate-pdi-suggestions`
- `analyze-cv`

### IA — Pesquisas
- `generate-survey-ai`
- `survey-ai-analysis`
- `survey-results`
- `survey-export-csv`

### IA — Assistentes e Pesquisa
- `platform-assistant`
- `omnipresent-agent`
- `rag-search`
- `search-knowledge`
- `deep-research`
- `editor-ai`
- `agent-visualizations`
- `sync-agent-action-guide`

### IA — Departamentos e Sugestões
- `generate-department-suggestions`
- `generate-contextual-suggestions` *(legado)*

### IA — Treinamentos
- `training-tutor`
- `process-training-content`
- `sync-training-completion`

### Voz e Áudio
- `elevenlabs-conversation-token`
- `realtime-voice`
- `voice-chat`
- `voice-response`
- `openai-stream`
- `openai-stt`
- `openai-tts`
- `tts-stream`
- `transcribe-audio`

### Transcrição e Reuniões
- `get-recording`
- `get-transcription`
- `request-transcription`
- `process-transcription-ai`
- `create-evolumeet`
- `send-meeting-invitation`
- `extract-tasks-from-transcription`

### Tarefas e Monitoramento
- `check-overdue-tasks`
- `check-task-reminders`
- `send-task-notification`
- `backfill-completed-dates`
- `extract-action-data`

### Documentos e Knowledge Base
- `download-document`
- `check-expiring-documents`
- `process-knowledge-queue`
- `update-knowledge-embeddings`
- `knowledge-base-daily-reindex`
- `manage-document-permissions` *(RPC)*

### CRM
- `crm-api`
- `crm-lead-ai-coach`
- `crm-webform-embed`
- `crm-webform-submit`
- `crm-webhook-dispatch`
- `check-crm-sla`

### Compras e Fornecedores
- `rfq-portal`
- `supplier-portal`
- `send-supplier-invitation`

### Email
- `send-email`
- `send-notification-email`
- `send-notification-email-v2`
- `send-auth-email`
- `process-email-queue`
- `check-mailersend-status`

### Pagamentos e Assinaturas (Stripe)
- `create-checkout-session`
- `create-channel-checkout`
- `create-public-checkout`
- `create-public-b2b-checkout`
- `stripe-webhook`
- `retry-payment`
- `manage-subscription`
- `modify-channel-subscription`
- `convert-trial`
- `create-trial-signup` — Quando `channel_email === orbit@evoluum.io` (orgânico), insere lead automaticamente no pipeline `pipe-leads-organicos` da org oficial Orbit (`2ad664c4...`) com tags `['Trial', 'Orgânico']`, `external_source = 'trial-signup'` e `external_source_id = org.id`. Insert é non-fatal.

### Administração
- `replicate-organization-template`
- `create-global-announcements`

### Integrações Externas
- `evoluhelp-sync`
- `evoluhelp-webhook`
- `sync-external-data`
- `save-consultor-lead`

---

## 6. Catálogo de RPCs

### Autenticação e Sessão
- `update_user_session`
- `verify_pin`
- `debug_auth_status`

### Organizações
- `get_user_active_organizations`
- `is_organization_active`
- `check_organization_license_status`
- `update_organization_license`
- `cancel_organization_deletion`
- `get_quarantined_organizations`
- `toggle_organization_celebration`
- `toggle_all_organizations_celebration`

### Privilégios
- `has_org_privilege`

### Super Admin
- `is_current_user_super_admin`
- `get_current_super_admin_level`
- `is_current_user_channel`

### Canal
- `check_channel_quota`
- `assign_organization_to_channel`
- `get_organizations_with_stats_filtered`
- `count_online_users_for_channel`
- `count_online_users`

### Estatísticas
- `get_monthly_organizations_stats`
- `get_monthly_processes_stats`
- `get_monthly_instructions_stats`

### Membros
- `get_org_members_with_last_login`

### Quotas
- `update_organization_quota_rpc`

### Documentos
- `manage_document_permissions`

### Licenças
- `get_all_renewal_requests_for_super`

### Reuniões
- `is_user_meeting_member`

---

## 7. Hooks Transversais

### Auth e Permissões
- `useUserAuth`, `useLogin`, `useAuthCheck`
- `useCheckPrivilege`, `useCheckSuperAdmin`, `useOrgAdminAccess`
- `useAdminStatus`, `useLicenseCheck`

### Organização
- `useOrganizationCheck`, `useOrganizations`, `useOrganizationMembers`
- `useOrganizationStatus`, `useOrganizationMonitoring`, `useOrganizationIndicators`
- `useOrganizationChannel`, `useEnabledModules`, `useEnabledModulesIntegration`
- `useSimpleModuleAccess`, `useModuleAccess`

### Membros
- `useMemberFetch`, `useMemberMutations`, `useMemberOperations`, `useMemberState`
- `useCurrentMemberId`, `useDeletedMembers`, `useOnboardingCheck`, `useOnlineUsers`

### Notificações
- `useNotifications`, `useNotificationsV2`
- `usePdiNotifications`, `useSurveyNotifications`, `useTaskNotifications`

### UI / UX
- `use-mobile`, `use-toast`, `useTranslatedToast`
- `useRouteScrollCleanup`, `useScrollLockSafetyNet`, `useDialogScrollCleanup`
- `useSidebarPins`, `useBannerConfig`, `useCelebrationManager`, `useCelebrationToggle`
- `useTour`, `useTourStepsAdmin`, `useTourStepsData`
- `useDashboardWidgets`, `useManagementWidgetData`

### Canal e Comercial
- `useChannelTheme`, `useChannelLogo`, `useChannelConfig`, `useChannelPlans`
- `useChannelQuota`, `useChannelDebts`, `useChannelAdminAccess`, `useChannelAdminPromotion`
- `useChannelConfig`, `usePreLoginChannelTitle`, `useLegacyChannelMigration`

### Pagamentos
- `useCheckoutCart`, `useCheckoutSettings`, `useTrialStatus`
- `usePlanSubscriptions`, `usePricingPlans`, `usePricingAddons`
- `useVouchers`, `useSubscriptions`, `usePaymentGateway`

### IA e Voz
- `useAIAssistant`, `useAgentProcessor`, `useVoiceConversation`
- `useActionGuide`, `useCommercialGuide`

---

## 8. Serviços (Service Layer)

### Core
- `organizationService`, `memberService`, `memberRemovalService`
- `authCleanupService`, `licenseService`, `licenseRenewalService`
- `cacheManagementService`, `recommendationsService`

### Processos e Atividades
- `processService`, `activityService`, `activityInstructionsService`
- `processDepartmentService`, `processResponsibleService`
- `processSequenceService`, `processRiskActionsService`
- `processWordExportService`

### Indicadores e Qualidade
- `indicatorService`, `indicatorSuggestionsService`
- `qualityControlService`, `qualityControlSuggestionsService`
- `indicatorAnalysisExportService`

### Pessoas e RH
- `employeeService`, `jobPositionService`
- `jobPositionExportService`, `jobPositionPdfExportService`, `jobPositionWordExportService`

### Documentos
- `documentService` (pasta `services/documents/`)

### Problemas, Riscos, Oportunidades
- `problemService`, `problemExportService`, `problemReportPdfExportService`
- `problemReportWordExportService`, `problemApiKeysService`
- `riskService`, `riskExportService`
- `opportunityService`, `opportunityExportService`

### Reuniões
- `meetingService` (via hooks)

### Pesquisas
- `surveyAnalysisWordExportService`, `surveyResultsPdfExportService`

### CRM
- `crmService`, `crmApiKeysService`, `crmAutomationsService`
- `crmWebFormsService`, `crmWebhooksService`
- `leadExportService`, `leadImportService`

### Compras
- `approvalLimitService`, `excelSupplierImportService`
- `excelImportService`

### Estratégico
- `strategicPlanningService`
- `swotItemActionsService`, `swotItemScoresService`

### Notificações
- `notificationsV2Service`

### Tarefas
- `manualTaskService`, `taskExportService`

### Treinamentos
- `trainingIntegrationService`

### MyOrbit
- `orbitService`

### IA e Áudio
- `aiContextService`, `aiGenerationService`
- `audioService`, `realtimeVoiceService`, `realtimeWebSocketService`

### Departamentos
- `departmentService`

### Exportações e Integrações
- `organizationExportService`, `evoluHelpSync`, `instructionsMonitoring`
- `instructionsValidator`, `instructionsWordExportService`

---

## 9. Tipos TypeScript

| Arquivo | Conteúdo |
|---|---|
| `activity-instructions.ts` | Instruções de atividades |
| `attachments.ts` | Anexos |
| `auth.ts` | Autenticação |
| `commercial.ts` | Módulo comercial |
| `crm.ts`, `crm-api.ts`, `crm-automations.ts`, `crm-webforms.ts` | CRM |
| `documents.ts` | Documentos |
| `executionComments.ts` | Comentários de execução |
| `meetings.ts` | Reuniões |
| `moduleAccess.ts` | Controle de módulos |
| `notifications.ts`, `notifications-v2.ts` | Notificações |
| `opportunities.ts` | Oportunidades |
| `orbit.ts` | MyOrbit |
| `organization.ts` | Organização |
| `payment.ts` | Pagamentos |
| `people.ts` | Gestão de pessoas |
| `problems.ts`, `problem-api.ts` | Problemas |
| `process.ts` | Processos |
| `recurring.ts` | Execuções recorrentes |
| `rfq.ts` | RFQ/Compras |
| `risks.ts` | Riscos |
| `strategicPlanning.ts` | Planejamento estratégico |
| `supplier-invitations.ts`, `suppliers.ts` | Fornecedores |
| `support-tickets.ts` | Suporte |
| `surveys.ts` | Pesquisas |
| `swotActions.ts`, `swotScores.ts` | SWOT |
| `taskExtraction.ts` | Extração de tarefas |
| `work-instructions.ts` | Instruções de trabalho |

---

## 10. Schemas das Tabelas Principais

> Legenda: **\*** = campo obrigatório (NOT NULL sem default automático). Campos com default preenchido pelo banco não precisam ser enviados no INSERT.

### 10.1 organizations

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| name | text | SIM* | — | Nome da organização |
| owner_id | uuid | SIM* | — | FK auth.users — quem criou |
| cnpj | text | não | null | CNPJ brasileiro |
| sector | text | não | null | Setor de atuação |
| size | text | não | null | micro/pequena/media/grande |
| logo_url | text | não | null | URL do logo |
| is_active | boolean | não | true | Status ativo |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |
| deleted_at | timestamptz | não | null | Soft-delete (quarentena) |
| deletion_scheduled_for | timestamptz | não | null | Agendamento de exclusão |
| celebration_active | boolean | não | false | Modo celebração |

**Status válidos**: Ativa (`is_active=true`), Quarentena (`deleted_at IS NOT NULL`)

### 10.2 organization_members

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| organization_id | uuid | SIM* | — | FK organizations |
| user_id | uuid | SIM* | — | FK auth.users |
| name | text | SIM* | — | Nome do membro |
| email | text | SIM* | — | Email |
| phone | text | não | null | Telefone |
| country_code | text | não | '+55' | Código do país |
| role | user_role (enum) | SIM* | — | 'admin' ou 'member' |
| created_at | timestamptz | auto | now() | |
| deleted_at | timestamptz | não | null | Soft-delete |
| force_password_change | boolean | não | false | Forçar troca de senha |

**IMPORTANTE**: `role` é um enum PostgreSQL (`user_role`) com valores `'admin'` e `'member'`. Não aceita outros valores.

### 10.3 employee_details

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| member_id | uuid | SIM* | — | FK organization_members |
| job_title | text | não | null | Cargo livre |
| job_position_id | uuid | não | null | FK job_positions (cargo cadastrado) |
| department | text | não | null | Departamento |
| hire_date | date | não | null | Data de contratação |
| salary | numeric | não | null | Salário |
| employment_status | text | não | 'active' | active/inactive/terminated |
| manager_id | uuid | não | null | FK organization_members |
| custom_role_id | uuid | não | null | FK organization_custom_roles — perfil de acesso |
| avatar_url | text | não | null | URL do avatar |
| exclude_from_orgchart | boolean | não | false | Excluir do organograma |
| is_external_user | boolean | não | false | Usuário externo |
| external_role | text | não | null | Papel do externo |
| tags | text[] | não | '{}' | Tags |
| location_id | uuid | não | null | FK locations — localidade do colaborador |

### 10.3.1 locations

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| organization_id | uuid | SIM | — | FK organizations |
| name | text | SIM | — | Nome da localidade (UNIQUE por org) |
| description | text | não | null | Descrição |
| address | text | não | null | Endereço |
| city | text | não | null | Cidade |
| state | text | não | null | Estado |
| country | text | não | 'Brasil' | País |
| zip_code | text | não | null | CEP |
| is_active | boolean | não | true | Ativa |
| created_at | timestamptz | auto | now() | — |
| updated_at | timestamptz | auto | now() | — |

### 10.4 projects

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| organization_id | uuid | SIM* | — | FK organizations |
| name | text | SIM* | — | Nome do projeto |
| description | text | não | null | Descrição |
| status | text | não | 'planning' | planning/active/on_hold/completed/cancelled |
| priority | text | não | 'medium' | low/medium/high/critical |
| color | text | não | '#6366f1' | Cor do projeto |
| start_date | date | não | null | Data início |
| due_date | date | não | null | Data limite |
| created_by | uuid | não | null | auth.uid() — criador |
| owner_id | uuid | não | null | Dono do projeto (member_id) |
| tags | text[] | não | '{}' | Tags |
| folder_id | uuid | não | null | FK project_folders |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

**IMPORTANTE**: Trigger `auto_add_project_creator` adiciona automaticamente o criador como membro com `role='owner'` após INSERT.

### 10.5 project_stages (Kanban)

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| project_id | uuid | SIM* | — | FK projects |
| name | text | SIM* | — | Nome do estágio |
| color | text | não | '#6366f1' | Cor |
| position | integer | SIM* | — | Ordem no kanban (0-based) |
| created_at | timestamptz | auto | now() | |

### 10.6 project_members

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| project_id | uuid | SIM* | — | FK projects |
| member_id | uuid | SIM* | — | FK organization_members |
| role | text | não | 'member' | owner/manager/member/viewer |
| added_by | uuid | não | auth.uid() | Quem adicionou |
| is_suspended | boolean | não | false | Suspender acesso |
| access_expires_at | timestamptz | não | null | Expiração do acesso |
| created_at | timestamptz | auto | now() | |

### 10.7 activity_executions (Tarefas)

> Tabela central de tarefas — usada tanto para tarefas de processo quanto manuais, de projetos, de problemas, riscos e oportunidades.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| activity_id | text | SIM* | — | 'manual-activity' para avulsas, ou ID da atividade do processo |
| organization_id | uuid | não** | null | FK organizations — **obrigatório para tarefas manuais** |
| process_id | uuid | não | null | FK processes — null = tarefa manual |
| name | text | não | null | Título da tarefa |
| status | text | não | 'pending' | pending/in_progress/completed/cancelled/blocked |
| priority | text | SIM | 'medium' | low/medium/high/critical |
| responsible_id | text | não | null | member_id (cast text) do responsável |
| deadline | timestamptz | não | null | Prazo |
| completion_percentage | numeric | não | 0 | 0-100 |
| observations | text | não | null | Observações |
| created_by | uuid | auto trigger | auth.uid() | Trigger `set_created_by_default` |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |
| completed_date | timestamptz | não | null | Trigger `set_completed_date` preenche ao status='completed' |
| **Campos de Origem** | | | | |
| problem_origin_id | uuid | não | null | FK problems — tarefa originada de problema |
| hypothesis_id | uuid | não | null | FK problem_hypotheses — tarefa de hipótese |
| risk_origin_id | uuid | não | null | FK risks — tarefa de mitigação de risco |
| opportunity_origin_id | uuid | não | null | FK opportunities — tarefa de oportunidade |
| custom_origin_id | uuid | não | null | FK custom_origin_options |
| strategic_planning_id | text | não | null | ID do planejamento estratégico |
| source_objective_text | text | não | null | Texto do objetivo estratégico |
| **Campos de Projeto** | | | | |
| project_id | uuid | não | null | FK projects — vincula ao projeto |
| project_stage_id | uuid | não | null | FK project_stages — estágio do kanban |
| kanban_position | integer | não | 0 | Posição dentro do estágio |
| **Campos de Recorrência** | | | | |
| is_recurring | boolean | não | false | Se é tarefa recorrente |
| recurrence_config | jsonb | não | null | Configuração de recorrência |
| series_id | uuid | não | null | FK execution_series |
| series_position | integer | não | null | Posição na série |
| **Outros** | | | | |
| reminder_at | timestamptz | não | null | Data do lembrete |
| reminder_sent | boolean | não | false | Lembrete já enviado |
| efficacy_status | text | não | 'not_evaluated' | not_evaluated/effective/ineffective/partially_effective |
| efficacy_evidence | text | não | null | Evidência de eficácia |
| tags | text[] | não | '{}' | Tags |

**REGRAS CRÍTICAS**:
- Tarefas manuais: `process_id = null`, `activity_id = 'manual-activity'`, `organization_id` OBRIGATÓRIO
- Tarefas de processo: `process_id` preenchido, `organization_id` pode ser null (derivado do processo)
- `responsible_id` é TEXT (member_id cast para text), não UUID
- RLS INSERT exige: `user_is_member_of_org(organization_id)` E `is_valid_org_member(responsible_id, organization_id)`

### 10.8 activity_execution_items (Subtarefas/Checklist)

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| execution_id | uuid | SIM* | — | FK activity_executions |
| description | text | SIM* | — | Descrição do item |
| checked | boolean | não | false | Marcado como feito |
| position | integer | não | 0 | Ordem |
| assignee_id | text | não | null | member_id do responsável |
| deadline | timestamptz | não | null | Prazo do item |
| priority | text | não | null | low/medium/high/critical |
| completed_at | timestamptz | não | null | Data de conclusão |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

### 10.9 execution_followers

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| execution_id | uuid | SIM* | — | FK activity_executions |
| member_id | uuid | SIM* | — | FK organization_members |
| added_by | uuid | não | auth.uid() | Quem adicionou |
| created_at | timestamptz | auto | now() | |

### 10.10 crm_pipelines

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| organization_id | uuid | SIM* | — | FK organizations |
| name | text | SIM* | — | Nome do pipeline |
| description | text | não | null | |
| objective | text | SIM | 'sales' | sales/support/recruitment/custom |
| is_default | boolean | não | false | Pipeline padrão |
| is_active | boolean | não | true | |
| created_by | uuid | não | null | auth.uid() |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

### 10.11 crm_stages

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| pipeline_id | uuid | SIM* | — | FK crm_pipelines |
| name | text | SIM* | — | Nome do estágio |
| color | text | não | '#6366f1' | |
| order_index | integer | SIM* | — | Ordem |
| stage_type | text | não | 'normal' | normal/won/lost |
| sla_days | integer | não | null | SLA em dias |
| win_probability | integer | não | 50 | Probabilidade de ganho (0-100) |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

### 10.12 crm_leads

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| organization_id | uuid | SIM* | — | FK organizations |
| pipeline_id | uuid | SIM* | — | FK crm_pipelines |
| stage_id | uuid | SIM* | — | FK crm_stages |
| title | text | SIM* | — | Título do lead |
| contact_name | text | não | null | Nome do contato |
| contact_email | text | não | null | Email |
| contact_phone | text | não | null | Telefone |
| company_name | text | não | null | Empresa |
| value | numeric | não | null | Valor monetário |
| probability | integer | não | 50 | 0-100 |
| lead_score | integer | não | 50 | Score do lead |
| weighted_value | numeric | não | null | value * probability/100 |
| responsible_id | uuid | não | null | FK organization_members |
| source | text | não | null | Origem do lead |
| channel | text | não | null | Canal |
| status | text | não | 'open' | open/won/lost |
| loss_reason_id | uuid | não | null | FK crm_loss_reasons |
| expected_close_date | date | não | null | Previsão de fechamento |
| closed_at | timestamptz | não | null | Data de fechamento |
| tags | text[] | não | '{}' | |
| custom_fields | jsonb | não | '{}' | Campos customizados |
| created_by | uuid | não | null | auth.uid() |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

### 10.13 problems

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| title | text | SIM* | — | Título |
| description | text | não | null | Descrição |
| organization_id | uuid | SIM* | — | FK organizations |
| process_id | uuid | não | null | FK processes |
| severity_id | uuid | não | null | FK severity options |
| frequency_id | uuid | não | null | FK frequency options |
| status | text | SIM | 'open' | open/analyzing/implementing/resolved/closed |
| priority | integer | não | null | 1-5 |
| created_by | uuid | SIM* | — | auth.uid() |
| assigned_to | text | não | null | member_id do responsável |
| detected_date | timestamptz | auto | now() | Data de detecção |
| resolved_date | timestamptz | não | null | Data de resolução |
| deadline | timestamptz | não | null | Prazo |
| is_recurring | boolean | não | false | Problema recorrente |
| indicator_id | text | não | null | ID do indicador vinculado |
| project_id | uuid | não | null | FK projects |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

**RLS INSERT**: Exige `organization_members.user_id = auth.uid()` E `created_by = auth.uid()`

### 10.14 risks

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| title | text | SIM* | — | Título |
| description | text | não | null | Descrição |
| organization_id | uuid | SIM* | — | FK organizations |
| process_id | uuid | não | null | FK processes |
| probability_id | uuid | não | null | FK probability options |
| impact_id | uuid | não | null | FK impact options |
| status | text | SIM | 'identified' | identified/analyzing/mitigating/resolved/accepted |
| strategy | text | não | null | avoid/mitigate/transfer/accept |
| priority_score | integer | não | null | Calculado: probabilidade * impacto |
| classification | text | não | null | strategic/operational/financial/compliance |
| created_by | uuid | SIM* | — | auth.uid() |
| assigned_to | uuid | não | null | member_id |
| identification_date | timestamptz | auto | now() | |
| target_date | timestamptz | não | null | Prazo alvo |
| project_id | uuid | não | null | FK projects |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

### 10.15 opportunities

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| title | text | SIM* | — | Título |
| description | text | não | null | Descrição |
| organization_id | uuid | SIM* | — | FK organizations |
| process_id | uuid | não | null | FK processes |
| probability_id | uuid | não | null | |
| impact_id | uuid | não | null | |
| status | text | SIM | 'identified' | identified/analyzing/implementing/realized/closed |
| strategy | text | não | null | Estratégia |
| priority_score | integer | não | null | |
| classification | text | não | null | |
| created_by | uuid | SIM* | — | auth.uid() |
| assigned_to | uuid | não | null | |
| identification_date | timestamptz | auto | now() | |
| target_date | timestamptz | não | null | |
| project_id | uuid | não | null | FK projects |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

### 10.16 meetings

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| title | text | SIM* | — | Título |
| description | text | não | null | |
| meeting_date | timestamptz | SIM* | — | Data/hora |
| duration_minutes | integer | não | 60 | Duração |
| location | text | não | null | Local |
| meeting_type | meeting_type (enum) | não | 'internal' | internal/external/online |
| status | meeting_status (enum) | não | 'scheduled' | scheduled/in_progress/completed/cancelled |
| organization_id | uuid | SIM* | — | FK organizations |
| created_by | uuid | auto | auth.uid() | |
| location_type | text | não | 'other' | other/evolumeet/google_meet/teams/zoom |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

**RLS INSERT**: `is_organization_member(organization_id) AND created_by = auth.uid()`

### 10.17 documents

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| name | text | SIM* | — | Nome do documento |
| file_path | text | SIM* | — | Caminho no storage |
| file_type | text | SIM* | — | MIME type |
| file_size | bigint | SIM* | — | Tamanho em bytes |
| organization_id | uuid | SIM* | — | FK organizations |
| uploaded_by | uuid | SIM* | — | auth.uid() |
| version | integer | SIM | 1 | Versão atual |
| document_type | document_type (enum) | SIM | 'other' | manual/procedure/form/record/policy/other |
| access_level | access_level (enum) | SIM | 'public' | public/restricted/confidential |
| description | text | não | null | |
| is_active | boolean | SIM | true | |
| folder_id | uuid | não | null | FK document_categories |
| approval_required | boolean | não | false | |
| approval_status | document_approval_status | não | 'pending' | pending/approved/rejected |
| tags | text[] | não | null | |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

### 10.18 processes

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| id | uuid | auto | gen_random_uuid() | PK |
| company_id | uuid | SIM* | — | FK companies (NÃO organizations diretamente) |
| name | text | SIM* | — | Nome do processo |
| description | text | não | null | |
| status | text | não | 'active' | active/inactive/draft |
| category | text | não | null | |
| type | text | não | null | |
| created_at | timestamptz | auto | now() | |
| updated_at | timestamptz | auto | now() | |

**ATENÇÃO**: Processos usam `company_id` (FK `companies`), não `organization_id` diretamente. A tabela `companies` faz o link: `companies.organization_id → organizations.id`.

---

## 11. Triggers, RLS e Side-Effects

### 11.1 Triggers Principais

#### activity_executions
| Trigger | Timing | Função | Efeito |
|---|---|---|---|
| set_created_by_on_activity_executions | BEFORE INSERT | set_created_by_default | Preenche `created_by` com `auth.uid()` se null |
| trigger_set_completed_date | BEFORE UPDATE | set_completed_date | Preenche `completed_date` quando `status` muda para 'completed' |
| task_insert_notification_v2 | AFTER INSERT | handle_task_insert_notification_v2 | Cria notificação para o responsável |
| task_update_notification_v2 | AFTER UPDATE | handle_task_update_notifications_v2 | Notifica mudanças de status/responsável |
| prevent_quarantine_writes_activity_executions | BEFORE INSERT/UPDATE/DELETE | prevent_writes_if_quarantined | Bloqueia escritas se organização em quarentena |

#### projects
| Trigger | Timing | Função | Efeito |
|---|---|---|---|
| auto_add_project_creator | AFTER INSERT | auto_add_project_creator | Adiciona criador como `project_members` com `role='owner'` |
| prevent_quarantine_writes_projects | BEFORE INSERT/UPDATE/DELETE | prevent_writes_if_quarantined | Bloqueia se org em quarentena |

#### crm_leads
| Trigger | Timing | Função | Efeito |
|---|---|---|---|
| log_crm_stage_change_trigger | BEFORE UPDATE | log_crm_stage_change | Loga mudança de estágio em `crm_stage_history` |
| trg_crm_lead_webhook | AFTER INSERT/UPDATE | crm_lead_webhook_trigger | Dispara webhooks configurados |
| update_crm_leads_updated_at | BEFORE UPDATE | update_crm_updated_at | Atualiza `updated_at` |

#### organization_members
| Trigger | Timing | Função | Efeito |
|---|---|---|---|
| ensure_employee_details | AFTER INSERT | auto_create_employee_details | Cria registro em `employee_details` automaticamente |
| prevent_quarantine_writes | BEFORE INSERT/UPDATE/DELETE | prevent_writes_if_quarantined | Bloqueia se org em quarentena |

### 11.2 Policies RLS Resumidas

#### projects
| Operação | Policy | Condição |
|---|---|---|
| SELECT | Creators can view own projects | `created_by = auth.uid()` |
| SELECT | Users can view projects they are members of | `id IN (get_user_project_ids_as_member(auth.uid()))` |
| INSERT | Users can insert projects in their organization | `organization_id` pertence a uma org do usuário |
| UPDATE | Users can update projects they are members of | `id IN (get_user_project_ids_as_member(auth.uid()))` |
| DELETE | Users can delete projects they are members of | `id IN (get_user_project_ids_as_member(auth.uid()))` |

#### project_stages / project_members
| Operação | Condição |
|---|---|
| ALL (SELECT/INSERT/UPDATE/DELETE) | `project_id` pertence a um projeto cuja `organization_id` está nas orgs do usuário |

#### activity_executions
| Operação | Policy | Condição |
|---|---|---|
| SELECT | Users can view tasks based on privileges | Multinível: (1) `tasks_view_all` na org, (2) `tasks_view_own` + é responsável/seguidor/assignee, (3) `is_project_member` se `project_id` presente |
| SELECT | Users can view tasks they created | `created_by = auth.uid()` |
| INSERT | Members can create executions in their organization | `user_is_member_of_org(organization_id)` E `is_valid_org_member(responsible_id, organization_id)` |
| UPDATE | Users can update tasks they have permission for | Admin da org OU `created_by = auth.uid()` OU é o responsável |
| DELETE | Users can delete tasks they have permission for | Mesma lógica do UPDATE |

#### activity_execution_items
| Operação | Condição |
|---|---|
| ALL | Verifica se a `execution_id` pertence a uma execução da organização do usuário |

#### crm_leads / crm_pipelines / crm_stages
| Operação | Condição |
|---|---|
| ALL | `organization_id IN (orgs do usuário)` — para leads e pipelines |
| crm_stages | `pipeline_id` pertence a um pipeline da org do usuário |

#### problems / risks / opportunities
| Operação | Condição |
|---|---|
| SELECT | `organization_id IN (orgs do usuário)` |
| INSERT | Membro da org E `created_by = auth.uid()` |
| UPDATE | Criador OU admin da org OU responsável (para problems) |
| DELETE | Criador OU admin da org |

#### documents
| Operação | Condição |
|---|---|
| SELECT | Membro da org E (doc público OU dono OU tem permissão OU é approver) |
| INSERT | Membro da org E `uploaded_by = auth.uid()` |
| UPDATE/DELETE | Dono do doc OU admin da org |

#### meetings
| Operação | Condição |
|---|---|
| SELECT | `can_view_meeting(id)` OU `is_meeting_participant(id)` |
| INSERT | `is_organization_member(organization_id)` E `created_by = auth.uid()` |
| UPDATE/DELETE | `can_manage_meeting(id)` OU (criador OU admin da org) |

### 11.3 Funções SQL Security-Definer

| Função | Retorno | Descrição |
|---|---|---|
| `has_org_privilege(org_id, permission_key)` | boolean | Cadeia: Owner → Custom Role → Base Role → Default Matrix |
| `is_project_member(project_id, user_id)` | boolean | Verifica `project_members` com `is_suspended=false` e `access_expires_at` válido |
| `get_user_project_ids_as_member(user_id)` | SETOF uuid | Retorna IDs dos projetos onde o usuário é membro ativo |
| `user_is_member_of_org(org_id)` | boolean | Verifica se `auth.uid()` é membro da org |
| `is_valid_org_member(member_id, org_id)` | boolean | Valida que member_id pertence à organização |
| `get_process_organization(process_id)` | uuid | Retorna org_id via `processes → companies → organizations` |
| `user_has_org_access(org_id)` | boolean | Alias para verificar acesso à org |
| `current_member_id(org_id)` | uuid | Retorna o `organization_members.id` do `auth.uid()` naquela org |

---

## 12. Fluxos Operacionais Passo a Passo

> Cada fluxo é um roteiro que um agente pode seguir para executar a operação via Supabase SDK. Todos exigem autenticação prévia.

### 12.1 Criar Projeto com Kanban e Tarefas

```typescript
import { supabase } from "@/integrations/supabase/client";

// Passo 1: Criar o projeto
const { data: project, error } = await supabase
  .from("projects")
  .insert({
    organization_id: orgId,          // OBRIGATÓRIO
    name: "Nome do Projeto",         // OBRIGATÓRIO
    description: "Descrição",        // opcional
    status: "planning",              // opcional, default 'planning'
    priority: "medium",              // opcional, default 'medium'
    color: "#6366f1",                // opcional
    start_date: "2026-04-01",        // opcional
    due_date: "2026-06-30",          // opcional
    created_by: userId               // opcional, trigger preenche
  })
  .select("id")
  .single();
// → TRIGGER auto_add_project_creator cria project_members {role:'owner'} automaticamente
// → TRIGGER prevent_writes_if_quarantined bloqueia se org em quarentena

// Passo 2: Criar estágios do Kanban
const stages = [
  { project_id: project.id, name: "Backlog", color: "#6B7280", position: 0 },
  { project_id: project.id, name: "A Fazer", color: "#3B82F6", position: 1 },
  { project_id: project.id, name: "Em Progresso", color: "#F59E0B", position: 2 },
  { project_id: project.id, name: "Revisão", color: "#8B5CF6", position: 3 },
  { project_id: project.id, name: "Concluído", color: "#10B981", position: 4 },
];
const { data: createdStages } = await supabase
  .from("project_stages")
  .insert(stages)
  .select("id, name, position");

// Passo 3: Criar tarefas no projeto
const { data: task } = await supabase
  .from("activity_executions")
  .insert({
    activity_id: "manual-activity",     // OBRIGATÓRIO — identificador de tarefa manual
    organization_id: orgId,             // OBRIGATÓRIO para tarefas manuais
    process_id: null,                   // null = tarefa manual
    name: "Título da Tarefa",           // recomendado
    project_id: project.id,             // vincula ao projeto
    project_stage_id: createdStages[1].id, // estágio "A Fazer"
    status: "pending",                  // default
    priority: "medium",                 // default
    responsible_id: memberId,           // member_id como TEXT — opcional
    deadline: "2026-05-15T00:00:00Z",   // opcional
    created_by: userId                  // trigger preenche se omitido
  })
  .select("id")
  .single();

// Passo 4: Criar subtarefas (checklist)
await supabase
  .from("activity_execution_items")
  .insert([
    { execution_id: task.id, description: "Subtarefa 1", position: 0 },
    { execution_id: task.id, description: "Subtarefa 2", position: 1 },
    { execution_id: task.id, description: "Subtarefa 3", position: 2, assignee_id: memberId },
  ]);

// Passo 5 (opcional): Adicionar seguidores
await supabase
  .from("execution_followers")
  .insert([
    { execution_id: task.id, member_id: followerMemberId }
  ]);
```

### 12.2 Criar Tarefa Manual (sem projeto, sem processo)

```typescript
const { data: task } = await supabase
  .from("activity_executions")
  .insert({
    activity_id: "manual-activity",   // OBRIGATÓRIO
    organization_id: orgId,           // OBRIGATÓRIO
    process_id: null,                 // null = manual
    name: "Tarefa avulsa",            // recomendado
    status: "pending",
    priority: "high",
    responsible_id: memberId,         // member_id como TEXT
    deadline: "2026-04-01T00:00:00Z",
  })
  .select("id")
  .single();
```

### 12.3 Criar Tarefa de Problema/Risco/Oportunidade

```typescript
// Tarefa originada de um problema
await supabase.from("activity_executions").insert({
  activity_id: "manual-activity",
  organization_id: orgId,
  process_id: null,
  name: "Ação corretiva para problema X",
  problem_origin_id: problemId,          // vincula ao problema
  hypothesis_id: hypothesisId,           // opcional — hipótese específica
  status: "pending",
  priority: "high",
});

// Tarefa originada de um risco
await supabase.from("activity_executions").insert({
  activity_id: "manual-activity",
  organization_id: orgId,
  process_id: null,
  name: "Plano de mitigação do risco Y",
  risk_origin_id: riskId,                // vincula ao risco
  status: "pending",
  priority: "critical",
});

// Tarefa originada de uma oportunidade
await supabase.from("activity_executions").insert({
  activity_id: "manual-activity",
  organization_id: orgId,
  process_id: null,
  name: "Aproveitar oportunidade Z",
  opportunity_origin_id: opportunityId,  // vincula à oportunidade
  status: "pending",
  priority: "medium",
});
```

### 12.4 Criar Lead no CRM

```typescript
// Passo 1: Verificar/obter pipeline existente
const { data: pipelines } = await supabase
  .from("crm_pipelines")
  .select("id, name")
  .eq("organization_id", orgId)
  .eq("is_active", true)
  .order("is_default", { ascending: false })
  .limit(1);

let pipelineId = pipelines?.[0]?.id;

// Se não existe pipeline, criar um
if (!pipelineId) {
  const { data: newPipeline } = await supabase
    .from("crm_pipelines")
    .insert({
      organization_id: orgId,
      name: "Pipeline Comercial",
      objective: "sales",
      is_default: true,
      created_by: userId,
    })
    .select("id")
    .single();
  pipelineId = newPipeline.id;

  // Criar estágios padrão
  await supabase.from("crm_stages").insert([
    { pipeline_id: pipelineId, name: "Novo", order_index: 0, stage_type: "normal", win_probability: 10 },
    { pipeline_id: pipelineId, name: "Qualificado", order_index: 1, stage_type: "normal", win_probability: 30 },
    { pipeline_id: pipelineId, name: "Proposta", order_index: 2, stage_type: "normal", win_probability: 60 },
    { pipeline_id: pipelineId, name: "Negociação", order_index: 3, stage_type: "normal", win_probability: 80 },
    { pipeline_id: pipelineId, name: "Ganho", order_index: 4, stage_type: "won", win_probability: 100 },
    { pipeline_id: pipelineId, name: "Perdido", order_index: 5, stage_type: "lost", win_probability: 0 },
  ]);
}

// Passo 2: Obter primeiro estágio
const { data: stages } = await supabase
  .from("crm_stages")
  .select("id")
  .eq("pipeline_id", pipelineId)
  .eq("stage_type", "normal")
  .order("order_index")
  .limit(1);

// Passo 3: Criar o lead
const { data: lead } = await supabase
  .from("crm_leads")
  .insert({
    organization_id: orgId,        // OBRIGATÓRIO
    pipeline_id: pipelineId,       // OBRIGATÓRIO
    stage_id: stages[0].id,        // OBRIGATÓRIO
    title: "Lead de Exemplo",      // OBRIGATÓRIO
    contact_name: "João Silva",    // opcional
    contact_email: "joao@ex.com",  // opcional
    company_name: "Empresa X",     // opcional
    value: 50000,                  // opcional
    source: "website",             // opcional
    created_by: userId,            // opcional
  })
  .select("id")
  .single();
```

### 12.5 Criar Problema com Hipóteses e Tarefas

```typescript
// Passo 1: Criar o problema
const { data: problem } = await supabase
  .from("problems")
  .insert({
    organization_id: orgId,    // OBRIGATÓRIO
    title: "Defeito no produto", // OBRIGATÓRIO
    description: "Descrição detalhada",
    status: "open",            // default 'open'
    created_by: userId,        // OBRIGATÓRIO (RLS exige = auth.uid())
    process_id: processId,     // opcional — vincula a processo
    project_id: projectId,     // opcional — vincula a projeto
  })
  .select("id")
  .single();

// Passo 2: Criar hipóteses
const { data: hypothesis } = await supabase
  .from("problem_hypotheses")
  .insert({
    problem_id: problem.id,
    description: "Possível causa: material inadequado",
    status: "pending",
    created_by: userId,
  })
  .select("id")
  .single();

// Passo 3: Criar tarefa vinculada à hipótese
await supabase.from("activity_executions").insert({
  activity_id: "manual-activity",
  organization_id: orgId,
  process_id: null,
  name: "Investigar material inadequado",
  problem_origin_id: problem.id,
  hypothesis_id: hypothesis.id,
  status: "pending",
  priority: "high",
  created_by: userId,
});
```

### 12.6 Mover Tarefa entre Estágios do Kanban

```typescript
// Apenas atualizar o project_stage_id
await supabase
  .from("activity_executions")
  .update({
    project_stage_id: newStageId,
    kanban_position: newPosition  // opcional — reordenar
  })
  .eq("id", taskId);
```

### 12.7 Criar Reunião com Participantes

```typescript
// Passo 1: Criar reunião
const { data: meeting } = await supabase
  .from("meetings")
  .insert({
    title: "Reunião de Alinhamento",       // OBRIGATÓRIO
    meeting_date: "2026-04-01T14:00:00Z",  // OBRIGATÓRIO
    organization_id: orgId,                // OBRIGATÓRIO
    created_by: userId,                    // auto via default auth.uid()
    description: "Pauta da reunião",       // opcional
    duration_minutes: 60,                  // default 60
    meeting_type: "internal",              // default 'internal'
    status: "scheduled",                   // default 'scheduled'
  })
  .select("id")
  .single();

// Passo 2: Adicionar participantes
await supabase.from("meeting_participants").insert([
  { meeting_id: meeting.id, user_id: userId, role: "host" },
  { meeting_id: meeting.id, user_id: participant2UserId, role: "participant" },
]);
```

### 12.8 Adicionar Membros ao Projeto

```typescript
// member_id é organization_members.id, NÃO auth.users.id
await supabase.from("project_members").insert([
  { project_id: projectId, member_id: memberId1, role: "manager" },
  { project_id: projectId, member_id: memberId2, role: "member" },
  { project_id: projectId, member_id: memberId3, role: "viewer" },
]);
```

---

## 13. Sistema de Permissões Completo

### 13.1 Cadeia de Resolução

A resolução de permissões segue esta hierarquia estrita, tanto no frontend (`PrivilegeContext.tsx` + `checkPermission.ts`) quanto no banco (`has_org_privilege()`):

```
1. Dono da Organização (organizations.owner_id = auth.uid())
   → SEMPRE retorna TRUE para qualquer permissão

2. Perfil Customizado (employee_details.custom_role_id)
   → Consulta: organization_privileges.privileges[permissionId][customRoleUUID]
   → Se TRUE → permite
   → Se FALSE → nega
   → Se NULL → vai para o passo 3

3. Role Base (organization_members.role = 'admin' | 'member')
   → Consulta: organization_privileges.privileges[permissionId]['admin' | 'member']
   → Se TRUE → permite
   → Se FALSE → nega
   → Se NULL → vai para o passo 4

4. Matriz de Defaults (get_default_privileges_matrix / getDefaultPermission)
   → Regras hardcoded — ver lista abaixo
```

### 13.2 Tabelas Envolvidas

| Tabela | Papel |
|---|---|
| `organizations` | `owner_id` = super permissão |
| `organization_members` | `role` (admin/member) + `user_id` |
| `employee_details` | `custom_role_id` → UUID do perfil customizado |
| `organization_custom_roles` | Definição dos perfis (nome, cor, descrição) |
| `organization_privileges` | JSONB `privileges` com as configurações por org |

### 13.3 Formato do JSONB `privileges`

```json
{
  "users_read": { "admin": true, "member": true, "uuid-do-perfil-custom": false },
  "users_manage": { "admin": true, "member": false },
  "tasks_view_all": { "admin": true, "member": false, "uuid-perfil-gerente": true },
  "tasks_view_own": { "admin": true, "member": true }
}
```

### 13.4 Lista Completa de Permission IDs (Defaults)

> Extraído de `getDefaultPermission()` em `checkPermission.ts` — estes são os defaults quando NÃO há configuração customizada:

| Permission ID | Admin | Member | Descrição |
|---|---|---|---|
| `tasks_view_all` | true | false | Ver todas as tarefas |
| `tasks_view_own` | true | true | Ver próprias tarefas |
| `tasks_edit` | true | false | Editar qualquer tarefa |
| `tasks_delete` | true | false | Deletar qualquer tarefa |
| `tasks_edit_own` | true | true | Editar próprias tarefas |
| `tasks_delete_own` | true | true | Deletar próprias tarefas |
| `risks_edit_own` | true | true | Editar próprios riscos |
| `risks_delete_own` | true | true | Deletar próprios riscos |
| `problems_edit_own` | true | true | Editar próprios problemas |
| `problems_delete_own` | true | true | Deletar próprios problemas |
| `opportunities_edit_own` | true | true | Editar próprias oportunidades |
| `opportunities_delete_own` | true | true | Deletar próprias oportunidades |
| `purchasing_*` | true | false | Todas as permissões de compras |
| `*_read` / `*_view` | true | true | Leitura geral |
| `*_create` | true | false | Criação geral |
| `*_delete` | true | false | Deleção geral |
| `*_edit_all` / `*_delete_all` | true | false | Edição/deleção global |
| `*_edit_own` / `*_delete_own` | true | true | Edição/deleção própria |
| `processes_create_ai` | true | false | Criar processos via IA |
| `users_manage` | true | false | Gerenciar usuários |
| `strategic_planning_edit` | true | false | Editar planejamento estratégico |
| `pdi_view_all` | true | false | Ver todos os PDIs |
| `pdi_view_own` | true | true | Ver próprio PDI |
| `pdi_edit` / `pdi_delete` | true | false | Editar/deletar PDIs |
| `pdi_edit_own` / `pdi_delete_own` | true | true | Editar/deletar próprio PDI |
| `surveys_view` | true | true | Ver pesquisas |
| `surveys_results_view` | true | false | Ver resultados de pesquisas |
| `surveys_*` (outras) | true | false | Gerenciar pesquisas |
| `crm_pipelines_manage` | true | false | Gerenciar pipelines CRM |
| `crm_leads_import_export` | true | false | Import/export de leads |
| `crm_webforms_manage` | true | false | Gerenciar webforms |
| `crm_read` | true | false | Leitura CRM |
| `commercial_read` | true | false | Leitura comercial |
| `commercial_strategic_info_read` | true | false | Info estratégica comercial |
| `commercial_portfolio_read` | true | false | Portfolio comercial |
| `commercial_clients_read` | true | false | Clientes comercial |
| `commercial_calendar_read` | true | false | Calendário comercial |
| `commercial_programs_read` | true | false | Programas comercial |
| `apis_read` | true | false | Leitura APIs |

### 13.5 Verificação no Frontend

```typescript
// Hook síncrono — lê do cache em memória
import { useCheckPrivilege } from "@/hooks/useCheckPrivilege";

const { hasPermission, isLoading, userRole } = useCheckPrivilege("tasks_view_all");

// Uso no componente
if (isLoading) return <Skeleton />;
if (!hasPermission) return <AccessDenied />;
```

### 13.6 Verificação Assíncrona (para Services)

```typescript
import { checkPermission } from "@/utils/checkPermission";

const allowed = await checkPermission(
  organizationId,   // uuid da org
  userId,           // auth.uid()
  userEmail,        // email do usuário
  "tasks_edit"      // permissionId
);
```

### 13.7 Verificação no Banco (RLS)

```sql
-- Usado em policies RLS
has_org_privilege(organization_id, 'tasks_view_all'::text)
```

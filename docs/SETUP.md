# Guia de Setup Local

## Pré-requisitos

- Node.js 18+
- npm ou pnpm
- Git
- Conta no Supabase (https://supabase.com)
- Conta no MailerSend (https://mailersend.com)
- Conta no Vercel (https://vercel.com) — para deploy
- Instância n8n rodando (para automações, Fase 3+)

## 1. Clonar o Repositório

```bash
git clone <repo-url>
cd plataforma-email
```

## 2. Instalar Dependências

```bash
npm install
# ou
pnpm install
```

## 3. Configurar Variáveis de Ambiente

```bash
cp .env.example .env.local
```

Preencher as variáveis em `.env.local`. As obrigatórias para Fase 1 são:

| Variável | Onde conseguir |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `MAILERSEND_API_KEY` | MailerSend → Settings → API tokens |
| `MAILERSEND_WEBHOOK_SECRET` | MailerSend → Settings → Webhooks |

## 4. Configurar Supabase

### Criar projeto
1. Acessar https://supabase.com/dashboard
2. Criar novo projeto na região `sa-east-1` (São Paulo)
3. Anotar URL e keys

### Rodar migrations
```bash
npx supabase db push
# ou via CLI:
npx supabase migration up
```

### Configurar Auth
1. Supabase Dashboard → Authentication → Providers
2. Habilitar Email/Password
3. Configurar Email Templates (opcional)

### Configurar RLS
As migrations já criam as políticas de RLS. Verificar no Dashboard → Database → Policies.

## 5. Configurar MailerSend

### Domínio de envio
1. MailerSend → Settings → Domains → Add domain
2. Configurar DNS (SPF, DKIM, DMARC)
3. Aguardar verificação (pode levar 24-48h)

### Webhooks
1. MailerSend → Settings → Webhooks → Add webhook
2. URL: `https://seu-projeto.supabase.co/functions/v1/handle-mailersend-webhook`
3. Eventos: sent, delivered, opened, clicked, hard_bounced, spam_complaint, unsubscribed

### Aquecimento de domínio
Domínios novos precisam ser aquecidos gradualmente:
- Semana 1: max 50 emails/dia
- Semana 2: max 200 emails/dia
- Semana 3: max 500 emails/dia
- Semana 4+: aumentar conforme reputação

## 6. Rodar em Desenvolvimento

```bash
npm run dev
```

Acessar http://localhost:3000

## 7. Deploy (Vercel)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar env vars no Vercel Dashboard
```

Ou conectar o repo GitHub direto no Vercel para CI/CD automático.

## Troubleshooting

### "Permission denied" no Supabase
Verificar se RLS está habilitado e se o usuário tem `organization_id` configurado.

### Emails não chegam
1. Verificar se o domínio está verificado no MailerSend
2. Checar SPF/DKIM/DMARC
3. Verificar se o domínio foi aquecido
4. Checar logs no MailerSend → Activity

### Webhooks não funcionam
1. Verificar URL da Edge Function
2. Checar se a Edge Function está deployada
3. Verificar logs: `supabase functions logs handle-mailersend-webhook`

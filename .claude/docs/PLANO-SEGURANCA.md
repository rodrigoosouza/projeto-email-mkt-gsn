# Plano de Seguranca — Plataforma Email

Auditoria realizada em 27/03/2026.

## Vulnerabilidades Encontradas

### ALTA PRIORIDADE

| # | Vulnerabilidade | Onde | Risco | Status |
|---|----------------|------|-------|--------|
| 1 | **Internal API key fraca** — usa primeiros 20 chars do service role key | forms/submit, leads/enrich, leads/parse-notes, pipedrive/sync | Brute-force possivel | CORRIGIR |
| 2 | **XSS em notas Pipedrive** — dangerouslySetInnerHTML sem sanitizacao | pipedrive/[id]/page.tsx:390 | Execucao de JS malicioso | CORRIGIR |
| 3 | **Token Instagram em texto puro** — access_token armazenado sem criptografia | org_instagram_accounts, instagram/account API | Token exposto se banco vazado | CORRIGIR |

### MEDIA PRIORIDADE

| # | Vulnerabilidade | Onde | Risco | Status |
|---|----------------|------|-------|--------|
| 4 | **Webhook MailerSend sem HMAC** — verifica apenas existencia do header, nao a assinatura | webhooks/mailersend:29-37 | Webhook spoofing | CORRIGIR |
| 5 | **WhatsApp org fallback** — se nao achar org, usa primeira do banco | webhooks/whatsapp:63-90 | Mensagem na org errada | CORRIGIR |

### JA SEGURO

| Item | Status |
|------|--------|
| RLS em todas as tabelas (001-033) | OK |
| File upload validation (tipo + tamanho) | OK |
| CORS (so em forms publicos) | OK |
| Auth em rotas protegidas | OK |
| Sem SQL injection | OK |
| Sem secrets no codigo-fonte | OK |
| .gitignore cobre .env, credentials, etc | OK |
| XSS no Growth chat (sanitizado) | OK |

## Plano de Correcao

### Fix 1: Internal API Key (Alta)
**Problema:** `SUPABASE_SERVICE_ROLE_KEY.slice(0, 20)` como token interno.
**Solucao:** Criar env var `INTERNAL_API_SECRET` com valor aleatorio forte (UUID ou 64 chars hex).
Substituir em: forms/submit, leads/enrich, leads/parse-notes, pipedrive/sync.

### Fix 2: XSS Pipedrive (Alta)
**Problema:** `dangerouslySetInnerHTML={{ __html: note.content }}` sem sanitizar.
**Solucao:** Instalar `isomorphic-dompurify` e sanitizar antes de renderizar.

### Fix 3: Token Instagram (Alta)
**Problema:** Access token armazenado em texto puro na tabela.
**Solucao:** Criptografia de campo (AES-256-GCM) com chave em env var.
Alternativa: usar Supabase Vault (se disponivel no plano).

### Fix 4: Webhook MailerSend (Media)
**Problema:** Verifica apenas se header `signature` existe, nao valida HMAC.
**Solucao:** Implementar HMAC-SHA256 conforme documentacao MailerSend.

### Fix 5: WhatsApp Org Fallback (Media)
**Problema:** Fallback para primeira org do banco se nao achar match.
**Solucao:** Retornar null e rejeitar webhook se org nao determinada com certeza.

## Limpeza de Codigo

- [ ] Remover `.env.local.save` do repositorio
- [ ] Substituir console.log por logging estruturado (futuro — Sentry/LogRocket)
- [ ] Nenhum import nao utilizado encontrado
- [ ] Nenhum codigo morto significativo encontrado

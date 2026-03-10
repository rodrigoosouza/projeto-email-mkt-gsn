# Modulo de Videos — Boas Praticas e Documentacao

## Resumo

Pipeline automatizado de producao de videos para anuncios:
```
Roteiro → IA gera cenas → Nano Banana gera imagens → (futuro) Veo 3 gera videos → Aprovacao
```

## Status Atual

| Funcionalidade | Status | Provider |
|---------------|--------|----------|
| Gerar cenas com IA | Funcionando | OpenRouter (claude-sonnet-4) |
| Gerar imagens | Funcionando | OpenRouter (Nano Banana / gemini-2.5-flash-image) |
| Gerar videos | Requer billing | Google Gemini API (Veo 3) |
| Aprovacao/reprovacao | Funcionando | Supabase |
| Storage de assets | Funcionando | Supabase Storage (bucket: video-assets) |

## Arquitetura

### APIs

| Rota | Metodo | Descricao | Provider |
|------|--------|-----------|----------|
| `/api/videos/generate-scenes` | POST | Gera 8-12 cenas a partir do roteiro | OpenRouter |
| `/api/videos/generate-image` | POST | Gera 1 imagem para 1 cena | OpenRouter |
| `/api/videos/generate-video` | POST | Gera 1 video para 1 cena | Google Gemini API |
| `/api/videos/generate-assets` | POST | Gera imagens para todas as cenas | OpenRouter |

### Paginas

| Rota | Descricao |
|------|-----------|
| `/videos` | Listagem de projetos |
| `/videos/new` | Criar novo projeto (formulario + roteiro) |
| `/videos/[id]` | Detalhe do projeto + review de cenas |

### Banco de Dados

- `video_projects` — Projetos de video (org_id, status, script, metadata)
- `video_scenes` — Cenas (prompts, status, image_urls, video_urls)
- RLS via `get_user_org_ids()` — mesma pattern do resto da plataforma

### Storage

- Bucket: `video-assets` (publico)
- Estrutura: `videos/{sceneId}/image_{timestamp}.png`
- Policies: authenticated upload, public read, authenticated delete

## Variaveis de Ambiente

| Variavel | Onde | Para que |
|----------|------|---------|
| `OPENROUTER_API_KEY` | .env.local + Vercel | Gerar cenas e imagens |
| `GOOGLE_GEMINI_API_KEY` | .env.local + Vercel | Gerar videos (Veo 3) |

**IMPORTANTE:** A Google Gemini API key GRATUITA funciona para imagens mas NAO para videos.
Para videos (Veo 3), e necessario ativar billing no Google Cloud (https://console.cloud.google.com/billing).
Contas novas ganham $300 de credito gratis.

## Bugs Corrigidos (Revisao)

### Criticos
1. **Stale state na aprovacao** — `updateSceneStatus` usava `scenes` stale para verificar se todos aprovados. Fix: functional update com `setScenes(prev => ...)`
2. **Error handling ausente** — Delete, approve, update nao verificavam erros. Fix: checar `{ error }` em todas operacoes Supabase
3. **Type mismatch JSONB** — `image_urls`/`video_urls` vem como `null` do Supabase (JSONB default `[]`). Fix: `Array.isArray()` guard em todos os acessos
4. **Regenerar individual vs tudo** — Botao "Regenerar" por cena chamava API que regenera TODAS as cenas. Fix: separado em `regenerateAllScenes()`
5. **generate-assets usava fetch interno** — Chamava suas proprias rotas via HTTP (problematico em serverless). Fix: logica de geracao inline

### Altos
6. **Polling agressivo** — 5s era muito frequente. Fix: 10s
7. **Modelo errado de imagem** — `gemini-2.0-flash-exp` nao existe. Fix: `gemini-2.5-flash-image` via OpenRouter
8. **Quota Google API** — API key gratuita tem limite baixo. Fix: migrado imagens para OpenRouter
9. **Acessibilidade** — `<div>` clicavel sem keyboard support. Fix: `<button>` semantico

### Medios
10. **Mensagem vaga no Veo 3** — Nao explicava que precisa billing. Fix: mensagem clara com link
11. **Partial failures no batch** — Nao reportava quais cenas falharam. Fix: retorna resultados individuais
12. **Clipboard sem verificacao** — `navigator.clipboard` pode nao existir. Fix: check antes de usar

## Padroes e Boas Praticas

### 1. Sempre verificar erros do Supabase
```typescript
// ERRADO
await supabase.from('tabela').update({ status }).eq('id', id)
setLocalState(newState) // UI desincronizada se falhou

// CERTO
const { error } = await supabase.from('tabela').update({ status }).eq('id', id)
if (error) {
  toast({ title: 'Erro ao atualizar', variant: 'destructive' })
  return
}
setLocalState(newState)
```

### 2. JSONB nullable — sempre usar Array.isArray()
```typescript
// ERRADO — crash se image_urls for null
const count = scene.image_urls.length

// CERTO
const urls = Array.isArray(scene.image_urls) ? scene.image_urls : []
const count = urls.length
```

### 3. Functional state updates para evitar stale state
```typescript
// ERRADO — scenes pode estar desatualizado
const updated = scenes.map(s => ...)
if (updated.every(s => s.status === 'approved')) { ... }

// CERTO — usa o estado mais recente
setScenes(prev => {
  const updated = prev.map(s => ...)
  if (updated.every(s => s.status === 'approved')) { ... }
  return updated
})
```

### 4. OpenRouter para imagens (sem problemas de quota)
```typescript
// Usar OpenRouter em vez de Google API diretamente
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash-image',
    messages: [{ role: 'user', content: imagePrompt }],
    modalities: ['image', 'text'],
    image_config: { aspect_ratio: '9:16' },
  }),
})
// Imagens retornam como base64 em message.images[]
```

### 5. Veo 3 e assincrono — precisa polling
```typescript
// Veo retorna uma operacao de longa duracao
const operation = await ai.models.generateVideos({ ... })

// Precisa polling ate completar (~2-5 min)
let done = false
while (!done) {
  await new Promise(r => setTimeout(r, 15000))
  const poll = await fetch(`.../${operationName}?key=${apiKey}`)
  const data = await poll.json()
  done = data.done === true
}
```

### 6. Nao fazer fetch para suas proprias rotas em serverless
```typescript
// ERRADO — pode falhar em serverless (cold start, timeout)
const res = await fetch(`${baseUrl}/api/videos/generate-image`, { ... })

// CERTO — chamar a logica diretamente
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', { ... })
```

## Custos

| Operacao | Provider | Custo |
|----------|----------|-------|
| Gerar cenas (IA) | OpenRouter | ~$0.05/projeto |
| Gerar imagem | OpenRouter (Nano Banana) | ~$0.03-0.08/imagem |
| Gerar video 8s | Google Veo 3 | ~$6/video |
| **Projeto completo (10 cenas, so imagens)** | | **~$0.85** |
| **Projeto completo (10 cenas, imagens + videos)** | | **~$61** |

## Proximos Passos

1. [ ] Ativar Google Cloud Billing para Veo 3
2. [ ] Adicionar status `generating_image`/`generating_video` na migration (CHECK constraint)
3. [ ] Implementar Supabase Realtime para atualizar UI sem polling
4. [ ] Adicionar variantes (2+ imagens por cena para o usuario escolher)
5. [ ] Download de todos os assets aprovados como ZIP

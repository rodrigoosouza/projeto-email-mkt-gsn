# Módulo de Vídeos (Ad Director)

## Visão Geral

Pipeline automatizado de produção de vídeos para anúncios. O usuário cola o roteiro e a plataforma faz tudo automaticamente:

```
Roteiro → IA gera cenas → Nano Banana gera imagens → Veo 3 gera vídeos → Aprovação
```

## Arquitetura do Pipeline

### Etapa 1: Roteiro → Cenas (IMPLEMENTADO)
- **Input:** Roteiro/script, ideia do anúncio, público-alvo, referências
- **Processamento:** OpenRouter (claude-sonnet-4) analisa o roteiro
- **Output:** 8-12 cenas com:
  - Título, fase (hook/development/turning_point/cta), tipo de cena
  - Objetivo, narração, descrição visual
  - `image_prompt` (otimizado para Nano Banana 2)
  - `video_prompt` (otimizado para Veo 3.1)
- **API:** `POST /api/videos/generate-scenes`
- **Status:** ✅ Completo

### Etapa 2: Imagem por Cena (A IMPLEMENTAR)
- **Input:** `image_prompt` de cada cena aprovada
- **Processamento:** Google Gemini API (Nano Banana 2)
- **Output:** Imagem gerada salva no Supabase Storage
- **API:** `POST /api/videos/generate-image`
- **Modelo:** `gemini-3.1-flash-image` (Nano Banana 2) ou `gemini-3-pro-image-preview` (Nano Banana Pro)
- **Variantes:** 2 imagens por cena (configurável em `image_variants_per_scene`)

### Etapa 3: Vídeo por Cena (A IMPLEMENTAR)
- **Input:** `video_prompt` + imagem gerada como referência
- **Processamento:** Google Gemini API (Veo 3.1)
- **Output:** Vídeo de 8s salvo no Supabase Storage
- **API:** `POST /api/videos/generate-video`
- **Modelo:** `veo-3.1-generate-001` (GA) ou `veo-3.1-generate-preview`
- **Variantes:** 2 vídeos por cena (configurável em `video_variants_per_scene`)

### Etapa 4: Aprovação (IMPLEMENTADO parcialmente)
- **Tela de review:** Cards expansíveis por cena
- **Ações:** Aprovar, reprovar, regenerar (individual ou em massa)
- **A adicionar:** Preview de imagens e vídeos gerados na tela de review

---

## APIs Externas

### Google Gemini API (Nano Banana 2 — Imagens)

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
**Auth:** `GOOGLE_GEMINI_API_KEY` (obter em Google AI Studio)
**Modelos disponíveis:**

| Modelo | ID | Qualidade | Velocidade | Custo |
|--------|-----|-----------|------------|-------|
| Nano Banana 2 | `gemini-3.1-flash-image` | Boa | Rápido | Menor |
| Nano Banana Pro | `gemini-3-pro-image-preview` | Melhor | Médio | Maior |

**Exemplo de chamada (Node.js):**
```typescript
import { GoogleGenAI } from "@google/genai"

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY })

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image",
  contents: imagePrompt,
  config: {
    responseModalities: ["image", "text"],
    imageMimeType: "image/png",
  },
})

// response.candidates[0].content.parts[0].inlineData contém a imagem em base64
```

**Alternativa: fal.ai (API mais simples)**
```typescript
import { fal } from "@fal-ai/client"

const result = await fal.subscribe("fal-ai/nano-banana-2", {
  input: { prompt: imagePrompt }
})
// result.data.images[0].url contém URL da imagem
```

### Google Gemini API (Veo 3.1 — Vídeos)

**Endpoint:** Gemini API (assíncrono — operação de longa duração)
**Auth:** Mesmo `GOOGLE_GEMINI_API_KEY`
**Modelo:** `veo-3.1-generate-001`

**Exemplo de chamada (Node.js):**
```typescript
import { GoogleGenAI } from "@google/genai"

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY })

// Iniciar geração (assíncrono)
const operation = await ai.models.generateVideos({
  model: "veo-3.1-generate-001",
  prompt: videoPrompt,
  config: {
    aspectRatio: "9:16", // vertical para ads
    referenceImages: [{
      image: {
        imageBytes: referenceImageBase64,
        mimeType: "image/png",
      },
      referenceType: "asset",
    }],
  },
})

// Polling até completar (demora ~2-5 min)
let result = operation
while (!result.done) {
  await new Promise(r => setTimeout(r, 15000))
  result = await ai.operations.get(result)
}

// result.result.generatedVideos[0].video contém o vídeo
```

**Preço:** ~$0.75/segundo de vídeo gerado (8s = ~$6/vídeo)

---

## Banco de Dados

### Tabelas (Migration 021)

**video_projects:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | ID do projeto |
| org_id | uuid (FK) | Organização |
| name | text | Nome do projeto |
| status | text | draft, generating, ready, approved, archived |
| script_input | text | Roteiro original |
| ad_idea | text | Ideia do anúncio |
| target_audience | text | Público-alvo |
| references_notes | text | Referências e tom |
| hook | text | Hook extraído pela IA |
| cta_text | text | CTA extraído pela IA |
| angle | text | Ângulo identificado |
| characters | jsonb | Array de personagens |
| scene_count | integer | Quantidade de cenas |
| image_variants_per_scene | integer (default 2) | Variantes de imagem por cena |
| video_variants_per_scene | integer (default 2) | Variantes de vídeo por cena |
| created_by | uuid | Usuário criador |

**video_scenes:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | ID da cena |
| project_id | uuid (FK) | Projeto |
| scene_index | integer | Posição |
| title | text | Título |
| scene_phase | text | hook, development, turning_point, cta |
| scene_type | text | reaction_phone, office_working, etc. |
| objective | text | Objetivo da cena |
| narration | text | Narração (português) |
| visual_description | text | Descrição visual |
| duration_seconds | integer | Duração |
| image_prompt | text | Prompt para Nano Banana |
| video_prompt | text | Prompt para Veo 3 |
| status | text | pending, approved, rejected, regenerating |
| image_urls | jsonb | URLs das imagens geradas |
| video_urls | jsonb | URLs dos vídeos gerados |

### RLS
- `video_projects`: `org_id IN (SELECT get_user_org_ids())`
- `video_scenes`: via JOIN com `video_projects.org_id`

---

## Tipos de Cena

| Tipo | Descrição | Uso |
|------|-----------|-----|
| reaction_phone | Pessoa reagindo a resultados no celular | Hook, prova social |
| office_working | Ambiente de escritório/produtividade | Desenvolvimento |
| thinking_desk | Pessoa analisando campanha no laptop | Problema/contexto |
| walking_talking | Pessoa andando e falando | Energia, CTA |
| close_up_face | Close-up mostrando emoção | Hook, virada |
| product_demo | Produto/serviço em ação | Demonstração |
| testimonial | Enquadramento de depoimento | Prova social |
| custom | Setup criativo livre | Qualquer |

## Fases da Cena

| Fase | Quantidade | Objetivo |
|------|-----------|----------|
| hook | 2-3 cenas | Prender atenção nos primeiros 3s |
| development | 3-5 cenas | Explicar problema e contexto |
| turning_point | 2-3 cenas | Apresentar solução, mecanismo, prova |
| cta | 1-2 cenas | Levar à ação final |

---

## Fluxo Completo Automatizado (Target)

```
1. Usuário cola roteiro
2. IA gera 8-12 cenas com prompts          → /api/videos/generate-scenes
3. Para cada cena (paralelo):
   a. Nano Banana gera 2 imagens            → /api/videos/generate-image
   b. Veo 3 gera 2 vídeos (usando imagem)   → /api/videos/generate-video
4. Usuário vê todas imagens/vídeos na tela de review
5. Aprova ou reprova cada variante
6. Assets aprovados ficam no Supabase Storage
```

### Fluxo Assíncrono (Importante)
- Geração de imagens: ~5-15s por imagem
- Geração de vídeos: ~2-5 min por vídeo
- Implementar com **polling** ou **Supabase Realtime** para atualizar UI
- Status da cena: `pending` → `generating_image` → `generating_video` → `ready` → `approved`

---

## Variáveis de Ambiente Necessárias

```env
# Já configuradas
OPENROUTER_API_KEY=sk-or-v1-...          # Para gerar cenas (claude-sonnet-4)

# A configurar
GOOGLE_GEMINI_API_KEY=...                 # Para Nano Banana + Veo 3
# OU alternativa para imagens:
FAL_KEY=...                               # Para Nano Banana via fal.ai
```

---

## Arquivos do Módulo

```
src/
  app/
    (dashboard)/videos/
      page.tsx                # Listagem de projetos
      new/page.tsx            # Criar novo projeto
      [id]/page.tsx           # Detalhe + review de cenas
    api/videos/
      generate-scenes/route.ts   # Gerar cenas com IA (OpenRouter)
      generate-image/route.ts    # Gerar imagem (Nano Banana) — A CRIAR
      generate-video/route.ts    # Gerar vídeo (Veo 3) — A CRIAR
  components/
    videos/                      # Componentes específicos — A CRIAR
supabase/
  migrations/
    021_video_projects.sql       # Tabelas + RLS
```

---

## Custos Estimados (por projeto de 10 cenas)

| Etapa | Custo unitário | Variantes | Total |
|-------|---------------|-----------|-------|
| Gerar cenas (OpenRouter) | ~$0.05 | 1x | $0.05 |
| Imagens (Nano Banana 2) | ~$0.08/img | 20 (10×2) | $1.60 |
| Vídeos (Veo 3.1, 8s) | ~$6/vídeo | 20 (10×2) | $120.00 |
| **Total por projeto** | | | **~$121.65** |

> Nota: Veo 3 é o maior custo. Considerar gerar apenas 1 variante de vídeo inicialmente, ou usar Veo 3 Fast quando disponível.

---

## Próximos Passos (Implementação)

1. **Obter GOOGLE_GEMINI_API_KEY** — Criar em https://aistudio.google.com/apikey
2. **Criar `/api/videos/generate-image`** — Chamar Nano Banana 2, salvar no Storage
3. **Criar `/api/videos/generate-video`** — Chamar Veo 3.1, polling, salvar no Storage
4. **Atualizar tela de review** — Mostrar imagens/vídeos gerados com player
5. **Adicionar status intermediários** — generating_image, generating_video
6. **Implementar Supabase Realtime** — Atualizar UI quando assets ficarem prontos
7. **Trigger automático** — Após gerar cenas, disparar geração de imagens automaticamente

# Metodo Hyesser — Estrategia de Conteudo Organico

> Fonte: PDF "Domine o Metodo Hyesser" por Rodrigo Souza
> Base para o modulo de Calendario de Conteudo + Criacao com IA

---

## Resumo

O Metodo Hyesser e uma estrategia de conteudo organico para redes sociais baseada em
4 pilares que se complementam. O objetivo e construir presenca online forte, atrair
publico fiel e converter seguidores em clientes.

---

## Os 4 Pilares

### Pilar 1: CRESCIMENTO (Aumentar Audiencia)
**Objetivo:** Atrair novos seguidores com conteudo de alto valor
**Proporcao no calendario:** 4 posts/semana (~44%)

**Tipos de conteudo:**
1. **Conteudo de Valor** — Dicas, insights, tutoriais que ajudam o publico a crescer. Inspirar, educar, gerar reflexoes.
2. **Reels Envolventes** — Videos curtos, dinamicos, informativos e divertidos. Musica, transicoes, efeitos para prender atencao.
3. **Carrosseis Informativos** — Series de slides com dicas, guias, informacoes detalhadas. Organizacao clara e facil de entender.
4. **Frases Motivacionais** — Frases que inspiram acao e positividade. Imagens com citacoes inspiradoras.

**Formatos:** Reels, Carrosseis, Posts estaticos, Stories

---

### Pilar 2: CONEXAO (Construir Relacionamento)
**Objetivo:** Humanizar a marca, criar vinculo emocional
**Proporcao no calendario:** 2 posts/semana (~22%)

**Tipos de conteudo:**
1. **Compartilhe sua Historia** — Jornada pessoal, desafios, aprendizados. Transparencia e conexao em nivel pessoal.
2. **Mostre seus Valores** — O que voce acredita, sua visao de mundo. Construir comunidade em torno dos ideais.

**Formatos:** Fotos pessoais, Stories do dia-a-dia, Bastidores, Videos pessoais

---

### Pilar 3: QUEBRA DE OBJECOES (Converter Seguidores em Clientes)
**Objetivo:** Demonstrar resultados, construir confianca, eliminar duvidas
**Proporcao no calendario:** 2 posts/semana (~22%)

**Tipos de conteudo:**
1. **Demonstre Resultados** — Historias de sucesso dos clientes. Como o produto/servico resolve problemas e entrega resultados.
2. **Construa Confianca** — Provas sociais: avaliacoes, depoimentos de clientes satisfeitos. Aumentar credibilidade da marca.
3. **Seja Transparente** — Responder perguntas honestamente. Mostrar compromisso com o sucesso dos clientes.

**Formatos:** Prints de resultados, Depoimentos em video, Cases, Comparativos antes/depois

---

### Pilar 4: AUTORIDADE (Tornar-se Referencia)
**Objetivo:** Posicionar como especialista no nicho
**Proporcao no calendario:** 1 post/semana (~12%)

**Tipos de conteudo:**
1. **Educacao Continua** — Compartilhar estudos, cursos, aprendizados relevantes para o nicho.
2. **Networking Estrategico** — Colaboracoes e parcerias com influentes do setor.
3. **Compartilhe sua Experiencia** — Eventos, palestras, entrevistas. Conhecimentos que inspirem o publico.

**Formatos:** Fotos em eventos, Certificados, Collabs, Entrevistas, Artigos

---

## Calendario Semanal (9 posts/semana)

| Dia | Pilar | Tipo de Conteudo | Formato Sugerido |
|-----|-------|-----------------|-----------------|
| Segunda | Crescimento | Dica/Tutorial | Carrossel |
| Terca | Conexao | Historia pessoal | Foto + legenda |
| Quarta | Crescimento | Conteudo educativo | Reels |
| Quinta | Quebra de Objecoes | Depoimento/Resultado | Post estatico |
| Sexta | Crescimento | Frase motivacional | Imagem + citacao |
| Sabado | Conexao | Valores/Bastidores | Stories/Foto |
| Domingo | Crescimento | Reels envolvente | Reels |
| Bonus 1 | Quebra de Objecoes | Case de sucesso | Carrossel |
| Bonus 2 | Autoridade | Expertise/Evento | Post estatico |

**Distribuicao: 4 Crescimento + 2 Conexao + 2 Quebra Objecoes + 1 Autoridade = 9/semana**

---

## Mix Estrategico de Conteudo

| Tipo | Descricao | % do Total |
|------|-----------|-----------|
| Conteudo de Valor | Ensina, inspira, gera reflexoes | ~44% |
| Conteudo Pessoal | Historia, valores, personalidade | ~22% |
| Conteudo de Resultados | Beneficios, provas, cases | ~22% |
| Conteudo de Autoridade | Expertise, credibilidade | ~12% |

---

## Implementacao na Plataforma

### Como a IA deve gerar o calendario:

1. **Input:** Briefing da org (ICP, persona, tom de voz, nicho, diferenciais)
2. **Output:** Calendario de 30 dias seguindo Metodo Hyesser

### Para cada post, a IA gera:
- **Pilar:** Qual dos 4 pilares
- **Tipo:** Categoria especifica (dica, historia, depoimento, etc.)
- **Formato:** Reels, Carrossel, Post estatico, Stories
- **Legenda:** Copy completa com hashtags e CTA
- **Prompt de imagem:** Para gerar o criativo com IA (Nano Banana)
- **Prompt de video:** Para gerar Reels com IA (quando disponivel)
- **Horario sugerido:** Baseado no publico-alvo
- **Rede social:** Instagram, LinkedIn, Facebook, TikTok

### Fluxo na plataforma:
```
Marketing > Estrategia (briefing)
    ↓
Redes Sociais > Calendario de Conteudo
    ↓ IA gera 30 dias seguindo Metodo Hyesser
Cada post tem:
    ├─ Legenda (copy)
    ├─ Criativo (imagem gerada por IA)
    ├─ Video (quando aplicavel)
    └─ Agendamento
    ↓
Aprovacao → Agendamento → Postagem automatica (n8n)
```

### Tabela do banco de dados (proposta):
```sql
CREATE TABLE content_calendar (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  title text NOT NULL,
  pillar text NOT NULL CHECK (pillar IN ('growth', 'connection', 'objection_breaking', 'authority')),
  content_type text NOT NULL, -- 'tip', 'tutorial', 'story', 'testimonial', 'quote', 'event', etc.
  format text NOT NULL CHECK (format IN ('reels', 'carousel', 'static_post', 'stories', 'article')),
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'tiktok', 'twitter')),
  caption text, -- legenda/copy completa
  hashtags text[], -- array de hashtags
  image_prompt text, -- prompt para gerar imagem
  video_prompt text, -- prompt para gerar video
  image_urls text[], -- URLs das imagens geradas
  video_urls text[], -- URLs dos videos gerados
  scheduled_for timestamp with time zone,
  published_at timestamp with time zone,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'approved', 'scheduled', 'published', 'failed')),
  engagement_data jsonb DEFAULT '{}', -- likes, comments, shares, saves
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Categorias de conteudo para o sistema:
```typescript
const HYESSER_PILLARS = {
  growth: {
    label: 'Crescimento',
    color: '#ec4899', // rosa
    percentage: 44,
    postsPerWeek: 4,
    types: ['tip', 'tutorial', 'reels', 'carousel', 'motivational_quote'],
  },
  connection: {
    label: 'Conexao',
    color: '#8b5cf6', // roxo
    percentage: 22,
    postsPerWeek: 2,
    types: ['personal_story', 'behind_scenes', 'values', 'daily_life'],
  },
  objection_breaking: {
    label: 'Quebra de Objecoes',
    color: '#f59e0b', // amarelo
    percentage: 22,
    postsPerWeek: 2,
    types: ['testimonial', 'case_study', 'results', 'before_after', 'faq'],
  },
  authority: {
    label: 'Autoridade',
    color: '#3b82f6', // azul
    percentage: 12,
    postsPerWeek: 1,
    types: ['event', 'certification', 'collaboration', 'interview', 'article'],
  },
}
```

---

*Baseado no Metodo Hyesser por Rodrigo Souza. Documentado para uso como base do modulo de Calendario de Conteudo da plataforma.*

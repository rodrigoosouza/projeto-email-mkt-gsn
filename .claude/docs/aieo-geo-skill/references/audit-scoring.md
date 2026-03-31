# Sistema de Pontuação — Auditoria AIEO/GEO

## Escala por Item: 0-3

| Score | Significado | Critério |
|-------|-------------|----------|
| 0 | Inexistente | Não implementado, sem evidência |
| 1 | Básico | Existe mas incompleto ou com problemas |
| 2 | Bom | Implementado corretamente, funcional |
| 3 | Excelente | Implementado com boas práticas, diferenciado |

---

## Categorias e Pesos

### A. Citabilidade do Conteúdo (Peso: 35%)

8 itens × 3 pontos = 24 pontos máximos

| Item | 0 | 1 | 2 | 3 |
|------|---|---|---|---|
| Estatísticas/dados | Nenhum dado | 1-2 por artigo, sem fonte | 3+ por artigo, com fonte | Dados próprios + fontes externas confiáveis |
| Citações externas | Sem links de fonte | Links genéricos | Fontes .edu/.gov/reports | Mix diversificado de fontes autoritativas |
| Quotes de especialistas | Nenhum | Citações genéricas | Quotes de profissionais do setor | Quotes com nome, cargo e credencial |
| Tom autoritativo | Hesitante/inseguro | Mistura de estilos | Confiante na maioria | Autoridade natural com nuance |
| Fluência | Difícil de ler | Legível com esforço | Fluente | Fluente e engajante |
| Termos técnicos | Ausentes ou incorretos | Presentes sem definição | Presentes e definidos | Bem integrados com definição natural |
| Blocos citáveis (130-170 palavras) | Nenhum | Parágrafos longos sem foco | Alguns trechos autocontidos | Blocos intencionalmente formatados para citação |
| Respostas diretas pós-heading | Ausentes | Introduções longas | Resposta em 3-5 linhas | Resposta direta em 2-3 linhas |

### B. Estrutura Técnica para IA (Peso: 25%)

7 itens × 3 pontos = 21 pontos máximos

| Item | 0 | 1 | 2 | 3 |
|------|---|---|---|---|
| Schema markup | Nenhum | Apenas básico (Organization) | 3+ tipos implementados | Cobertura completa validada |
| Hierarquia de headings | Sem estrutura | H1 presente, H2 aleatórios | H1>H2>H3 lógico | Headings em formato de pergunta, semânticos |
| Meta descriptions | Ausentes/genéricas | Presentes mas genéricas | Resposta à intenção de busca | Resposta direta + CTA natural |
| Robots.txt para IA | Bloqueia crawlers IA | Não mencionado | Permite parcialmente | Permite todos os crawlers IA + configurado |
| llms.txt | Inexistente | Existe mas incompleto | Existe e funcional | Completo com descrições ricas |
| Sitemap.xml | Ausente/com erros | Presente com erros | Funcional | Atualizado automaticamente, sem erros |
| Core Web Vitals | Reprovados | 1-2 métricas ok | Maioria aprovada | Todos aprovados |

### C. Autoridade de Entidade (Peso: 25%)

6 itens × 3 pontos = 18 pontos máximos

| Item | 0 | 1 | 2 | 3 |
|------|---|---|---|---|
| Google Business Profile | Inexistente | Criado mas incompleto | Completo | Completo + fotos + posts + avaliações respondidas |
| NAP consistência | Inconsistente | Maioria consistente | Consistente | Consistente + verificável em 5+ plataformas |
| Presença Wikidata | Ausente | — | Existe mas básico | Completo com relações |
| Perfis em plataformas-chave | Ausentes | 1-2 plataformas | 3-4 plataformas ativas | 5+ plataformas com conteúdo regular |
| Menções da marca (Reddit/Quora/Fóruns) | Nenhuma | Poucas menções próprias | Menções orgânicas | Menções frequentes + positivas |
| Backlinks autoritativos | Nenhum | Poucos de baixa autoridade | Alguns de média autoridade | Backlinks de sites reconhecidos do nicho |

### D. Formato AI-Friendly (Peso: 15%)

6 itens × 3 pontos = 18 pontos máximos

| Item | 0 | 1 | 2 | 3 |
|------|---|---|---|---|
| TL;DR / Resumo | Ausente | Presente em alguns | Presente na maioria | Em todos + bem formatado |
| FAQ com schema | Ausente | FAQ sem schema | FAQ com schema parcial | FAQ schema em todas as páginas-chave |
| Tabelas comparativas | Ausentes | Presentes sem estrutura | Estruturadas | Com dados, fontes e formatação HTML |
| Listas estruturadas | Apenas texto corrido | Bullets básicos | Listas com contexto | Listas numeradas com explicações |
| Glossário/definições inline | Ausentes | Esporádicos | Na maioria dos termos técnicos | Formato padrão consistente |
| CTAs estruturados | Ausentes ou genéricos | Presentes mas vagos | Claros com 1 opção | Claros com múltiplas opções |

---

## Cálculo do Score Final

```
Score A = (soma itens A / 24) × 35
Score B = (soma itens B / 21) × 25
Score C = (soma itens C / 18) × 25
Score D = (soma itens D / 18) × 15

SCORE TOTAL = Score A + Score B + Score C + Score D (máx 100)
```

## Classificação

| Score | Classificação | Ação |
|-------|--------------|------|
| 0-25 | Crítico | Começar do zero, foco em fundações |
| 26-50 | Em desenvolvimento | Gaps significativos, priorizar quick wins |
| 51-70 | Bom | Base sólida, otimizar e expandir |
| 71-85 | Avançado | Foco em iteração e monitoramento |
| 86-100 | Excelente | Manutenção e inovação contínua |

## Priorização de Quick Wins

Após o score, ordenar ações por:
1. **Impacto alto + Esforço baixo** → FAZER PRIMEIRO (ex: adicionar meta descriptions, FAQ schema, llms.txt)
2. **Impacto alto + Esforço médio** → PLANEJAR (ex: reescrever conteúdos-chave, schema completo)
3. **Impacto alto + Esforço alto** → AGENDAR (ex: criar cluster de conteúdo completo)
4. **Impacto baixo** → BACKLOG

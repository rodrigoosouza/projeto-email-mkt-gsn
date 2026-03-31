# Templates de Schema Markup JSON-LD para AIEO/GEO

Templates prontos para copiar e adaptar. Substituir todos os campos entre [colchetes].

---

## 1. Organization / LocalBusiness

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "[Nome da Empresa]",
  "description": "[Descrição de 1-2 frases do que a empresa faz]",
  "url": "[https://www.seusite.com.br]",
  "logo": "[https://www.seusite.com.br/logo.png]",
  "image": "[https://www.seusite.com.br/imagem-principal.jpg]",
  "telephone": "[+55-XX-XXXXX-XXXX]",
  "email": "[contato@seusite.com.br]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Rua, Número]",
    "addressLocality": "[Cidade]",
    "addressRegion": "[Estado - sigla]",
    "postalCode": "[CEP]",
    "addressCountry": "BR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "[latitude]",
    "longitude": "[longitude]"
  },
  "areaServed": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": "[latitude]",
      "longitude": "[longitude]"
    },
    "geoRadius": "[raio em km]"
  },
  "sameAs": [
    "[https://www.instagram.com/empresa]",
    "[https://www.linkedin.com/company/empresa]",
    "[https://www.facebook.com/empresa]",
    "[https://www.youtube.com/@empresa]"
  ],
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "08:00",
    "closes": "18:00"
  },
  "priceRange": "[$$]",
  "foundingDate": "[YYYY]",
  "numberOfEmployees": {
    "@type": "QuantitativeValue",
    "value": "[número]"
  }
}
```

---

## 2. Person (Fundador/Especialista)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "[Nome Completo]",
  "jobTitle": "[Cargo]",
  "worksFor": {
    "@type": "Organization",
    "name": "[Nome da Empresa]"
  },
  "url": "[https://www.seusite.com.br/sobre/nome]",
  "image": "[URL da foto]",
  "sameAs": [
    "[LinkedIn URL]",
    "[Twitter/X URL]"
  ],
  "alumniOf": {
    "@type": "CollegeOrUniversity",
    "name": "[Universidade]"
  },
  "knowsAbout": ["[Especialidade 1]", "[Especialidade 2]", "[Especialidade 3]"],
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "[Tipo de certificação]",
    "name": "[Nome da certificação]"
  }
}
```

---

## 3. FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Pergunta 1?]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Resposta completa mas concisa à pergunta 1]"
      }
    },
    {
      "@type": "Question",
      "name": "[Pergunta 2?]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Resposta completa mas concisa à pergunta 2]"
      }
    },
    {
      "@type": "Question",
      "name": "[Pergunta 3?]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Resposta completa mas concisa à pergunta 3]"
      }
    }
  ]
}
```

---

## 4. Article / BlogPosting

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[Título do Artigo]",
  "description": "[Meta description - 150-160 caracteres]",
  "image": "[URL da imagem principal]",
  "author": {
    "@type": "Person",
    "name": "[Nome do Autor]",
    "url": "[URL do perfil do autor no site]"
  },
  "publisher": {
    "@type": "Organization",
    "name": "[Nome da Empresa]",
    "logo": {
      "@type": "ImageObject",
      "url": "[URL do logo]"
    }
  },
  "datePublished": "[YYYY-MM-DD]",
  "dateModified": "[YYYY-MM-DD]",
  "mainEntityOfPage": "[URL canônica do artigo]",
  "wordCount": "[número de palavras]",
  "keywords": ["[keyword1]", "[keyword2]", "[keyword3]"],
  "about": {
    "@type": "Thing",
    "name": "[Tópico principal]"
  },
  "citation": [
    {
      "@type": "CreativeWork",
      "name": "[Título da fonte citada]",
      "url": "[URL da fonte]"
    }
  ]
}
```

---

## 5. HowTo Schema

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "[Como fazer X]",
  "description": "[Descrição breve do processo]",
  "totalTime": "PT[X]M",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "BRL",
    "value": "[valor]"
  },
  "step": [
    {
      "@type": "HowToStep",
      "name": "[Nome do Passo 1]",
      "text": "[Descrição detalhada do passo 1]",
      "url": "[URL#passo1]"
    },
    {
      "@type": "HowToStep",
      "name": "[Nome do Passo 2]",
      "text": "[Descrição detalhada do passo 2]",
      "url": "[URL#passo2]"
    }
  ]
}
```

---

## 6. Service Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "[Nome do Serviço]",
  "description": "[Descrição do serviço em 2-3 frases]",
  "provider": {
    "@type": "LocalBusiness",
    "name": "[Nome da Empresa]"
  },
  "serviceType": "[Tipo de serviço]",
  "areaServed": {
    "@type": "City",
    "name": "[Cidade]"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "[Nome do catálogo]",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "[Subserviço 1]"
        }
      }
    ]
  }
}
```

---

## 7. BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "[https://www.seusite.com.br]"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[Categoria]",
      "item": "[https://www.seusite.com.br/categoria]"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "[Página Atual]",
      "item": "[URL atual]"
    }
  ]
}
```

---

## Notas de Implementação

1. **Onde colocar**: No `<head>` da página, dentro de `<script type="application/ld+json">`
2. **Validação**: Usar Google Rich Results Test (https://search.google.com/test/rich-results) e Schema.org Validator
3. **Múltiplos schemas**: Uma página pode ter vários blocos JSON-LD (Article + FAQ + BreadcrumbList)
4. **dateModified**: SEMPRE atualizar quando o conteúdo mudar — IAs valorizam frescor
5. **sameAs**: Incluir TODOS os perfis oficiais — ajuda IAs a conectar entidades

/**
 * JSON-LD Schema markup generators for SEO
 */

interface SchemaOrg {
  name: string
  slug: string
  website?: string | null
  logo_url?: string | null
}

interface SchemaPost {
  title: string
  slug: string
  excerpt?: string | null
  content_html?: string | null
  featured_image?: string | null
  og_image?: string | null
  author_name?: string | null
  published_at?: string | null
  updated_at?: string | null
  seo_description?: string | null
  reading_time_min?: number
  tags?: string[]
}

/**
 * Generate Article JSON-LD schema
 */
export function generateArticleSchema(
  post: SchemaPost,
  org: SchemaOrg,
  baseUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seo_description || post.excerpt || '',
    image: post.og_image || post.featured_image || undefined,
    author: {
      '@type': 'Person',
      name: post.author_name || org.name,
    },
    publisher: {
      '@type': 'Organization',
      name: org.name,
      logo: org.logo_url
        ? { '@type': 'ImageObject', url: org.logo_url }
        : undefined,
    },
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/b/${org.slug}/${post.slug}`,
    },
    keywords: post.tags?.join(', ') || undefined,
    wordCount: post.content_html
      ? post.content_html.replace(/<[^>]*>/g, '').split(/\s+/).length
      : undefined,
    timeRequired: post.reading_time_min
      ? `PT${post.reading_time_min}M`
      : undefined,
  }
}

/**
 * Generate BreadcrumbList JSON-LD schema
 */
export function generateBreadcrumbSchema(
  orgSlug: string,
  postSlug: string,
  postTitle: string,
  blogTitle: string,
  baseUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: blogTitle || 'Blog',
        item: `${baseUrl}/b/${orgSlug}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: postTitle,
        item: `${baseUrl}/b/${orgSlug}/${postSlug}`,
      },
    ],
  }
}

/**
 * Generate Organization JSON-LD schema
 */
export function generateOrganizationSchema(org: SchemaOrg, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: org.website || `${baseUrl}/b/${org.slug}`,
    logo: org.logo_url || undefined,
  }
}

/**
 * Generate FAQPage JSON-LD schema
 */
export function generateFAQSchema(
  questions: { question: string; answer: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  }
}

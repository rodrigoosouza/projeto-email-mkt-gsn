import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateOrganizationSchema,
} from '@/lib/seo/schema-generator'

interface Props {
  params: Promise<{ slug: string; postSlug: string }>
}

async function getPostData(orgSlug: string, postSlug: string) {
  const supabase = createAdminClient()

  // Fetch org
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, website')
    .eq('slug', orgSlug)
    .single()

  if (orgError || !org) return null

  // Fetch published post by slug
  const { data: post, error: postError } = await supabase
    .from('blog_posts')
    .select('*, blog_categories(id, name, slug, color)')
    .eq('org_id', org.id)
    .eq('slug', postSlug)
    .eq('status', 'published')
    .single()

  if (postError || !post) return null

  // Fetch blog settings
  const { data: settings } = await supabase
    .from('blog_settings')
    .select('*')
    .eq('org_id', org.id)
    .single()

  // Fetch related posts (same category, excluding current)
  let relatedPosts: any[] = []
  if (post.category_id) {
    const { data: related } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, featured_image, published_at, reading_time_min, blog_categories(id, name, slug, color)')
      .eq('org_id', org.id)
      .eq('status', 'published')
      .eq('category_id', post.category_id)
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(3)

    relatedPosts = related || []
  }

  // Fill with recent posts if not enough related
  if (relatedPosts.length < 3) {
    const excludeIds = [post.id, ...relatedPosts.map((p: any) => p.id)]
    const { data: recent } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, featured_image, published_at, reading_time_min, blog_categories(id, name, slug, color)')
      .eq('org_id', org.id)
      .eq('status', 'published')
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .order('published_at', { ascending: false })
      .limit(3 - relatedPosts.length)

    relatedPosts = [...relatedPosts, ...(recent || [])]
  }

  // Fetch tracking config
  const { data: trackingConfig } = await supabase
    .from('org_tracking_config')
    .select('gtm_container_id, ga4_measurement_id, tracking_script')
    .eq('org_id', org.id)
    .single()

  // Increment views (fire and forget)
  supabase
    .from('blog_posts')
    .update({ views_count: (post.views_count || 0) + 1 })
    .eq('id', post.id)
    .then(() => {})

  return { org, post, settings, relatedPosts, trackingConfig }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: orgSlug, postSlug } = await params
  const data = await getPostData(orgSlug, postSlug)
  if (!data) return { title: 'Artigo nao encontrado' }

  const { org, post, settings } = data
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.plataformaemail.com'
  const title = post.seo_title || post.title
  const description = post.seo_description || post.excerpt || ''
  const image = post.og_image || post.featured_image

  return {
    title: `${title} | ${settings?.blog_title || org.name}`,
    description,
    keywords: post.seo_keywords?.join(', ') || undefined,
    authors: post.author_name ? [{ name: post.author_name }] : undefined,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/b/${org.slug}/${post.slug}`,
      siteName: settings?.blog_title || org.name,
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      authors: post.author_name ? [post.author_name] : undefined,
      images: image ? [{ url: image, width: 1200, height: 630, alt: post.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
    alternates: {
      canonical: post.canonical_url || `${baseUrl}/b/${org.slug}/${post.slug}`,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug: orgSlug, postSlug } = await params
  const data = await getPostData(orgSlug, postSlug)

  if (!data) {
    notFound()
  }

  const { org, post, settings, relatedPosts, trackingConfig } = data
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.plataformaemail.com'

  const colors = settings?.colors as Record<string, string> | null
  const primaryColor = colors?.primary || '#6366f1'
  const secondaryColor = colors?.secondary || '#0f172a'

  const blogTitle = settings?.blog_title || `Blog ${org.name}`
  const category = post.blog_categories as any

  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  const articleSchema = generateArticleSchema(post, org, baseUrl)
  const breadcrumbSchema = generateBreadcrumbSchema(org.slug, post.slug, post.title, blogTitle, baseUrl)
  const orgSchema = generateOrganizationSchema(org, baseUrl)

  const ctaConfig = settings?.cta_config as Record<string, any> | null

  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        {trackingConfig?.gtm_container_id && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${trackingConfig.gtm_container_id}');`,
            }}
          />
        )}
        {trackingConfig?.ga4_measurement_id && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${trackingConfig.ga4_measurement_id}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${trackingConfig.ga4_measurement_id}');`,
              }}
            />
          </>
        )}
        {trackingConfig?.tracking_script && (
          <script
            dangerouslySetInnerHTML={{ __html: trackingConfig.tracking_script }}
          />
        )}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .blog-content h1 { font-size: 32px; font-weight: 800; margin: 32px 0 16px; color: ${secondaryColor}; }
              .blog-content h2 { font-size: 26px; font-weight: 700; margin: 28px 0 14px; color: ${secondaryColor}; }
              .blog-content h3 { font-size: 22px; font-weight: 600; margin: 24px 0 12px; color: ${secondaryColor}; }
              .blog-content p { margin: 0 0 16px; }
              .blog-content ul, .blog-content ol { margin: 0 0 16px; padding-left: 24px; }
              .blog-content li { margin-bottom: 8px; }
              .blog-content a { color: ${primaryColor}; text-decoration: underline; }
              .blog-content blockquote { margin: 24px 0; padding: 16px 24px; border-left: 4px solid ${primaryColor}; background: #f9fafb; font-style: italic; color: #4b5563; }
              .blog-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
              .blog-content pre { background: #1f2937; color: #e5e7eb; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 14px; }
              .blog-content code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 15px; }
              .blog-content pre code { background: transparent; padding: 0; }
              .blog-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
              .blog-content th, .blog-content td { padding: 10px 14px; border: 1px solid #e5e7eb; text-align: left; }
              .blog-content th { background: #f9fafb; font-weight: 600; }
              .blog-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
            `,
          }}
        />
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#f9fafb', color: '#1f2937' }}>
        {/* Header */}
        <header
          style={{
            backgroundColor: secondaryColor,
            color: '#ffffff',
            padding: '16px 0',
            borderBottom: `3px solid ${primaryColor}`,
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {(settings?.logo_url || org.logo_url) && (
              <img
                src={settings?.logo_url || org.logo_url || ''}
                alt={org.name}
                style={{ height: '32px', width: 'auto', borderRadius: '6px' }}
              />
            )}
            <a
              href={`/b/${org.slug}`}
              style={{ color: '#ffffff', textDecoration: 'none', fontSize: '18px', fontWeight: 700 }}
            >
              {blogTitle}
            </a>
          </div>
        </header>

        {/* Breadcrumb */}
        <nav style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 24px 0', fontSize: '14px', color: '#9ca3af' }}>
          <a href={`/b/${org.slug}`} style={{ color: primaryColor, textDecoration: 'none' }}>
            {blogTitle}
          </a>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: '#6b7280' }}>{post.title}</span>
        </nav>

        {/* Article */}
        <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <article>
            {/* Article header */}
            <header style={{ marginBottom: '32px' }}>
              {category && (
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: category.color || primaryColor,
                    color: '#ffffff',
                    padding: '4px 14px',
                    borderRadius: '9999px',
                    fontWeight: 500,
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  {category.name}
                </span>
              )}

              <h1 style={{ margin: '0 0 16px', fontSize: '36px', fontWeight: 800, color: secondaryColor, lineHeight: 1.2 }}>
                {post.title}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '15px', color: '#6b7280', flexWrap: 'wrap' }}>
                {post.author_name && (
                  <span style={{ fontWeight: 500 }}>{post.author_name}</span>
                )}
                {publishedDate && (
                  <time dateTime={post.published_at || undefined}>{publishedDate}</time>
                )}
                {post.reading_time_min > 0 && (
                  <span>{post.reading_time_min} min de leitura</span>
                )}
              </div>
            </header>

            {/* Featured image */}
            {post.featured_image && (
              <figure style={{ margin: '0 0 32px' }}>
                <img
                  src={post.featured_image}
                  alt={post.title}
                  style={{ width: '100%', height: 'auto', borderRadius: '12px', display: 'block' }}
                />
              </figure>
            )}

            {/* Article body */}
            <div
              className="blog-content"
              style={{ fontSize: '17px', lineHeight: 1.8, color: '#374151' }}
              dangerouslySetInnerHTML={{
                __html: post.content_html || post.content || '',
              }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {post.tags.map((tag: string) => (
                  <span
                    key={tag}
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '13px',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>

          {/* Author bio */}
          {post.author_name && (
            <section
              style={{
                marginTop: '48px',
                padding: '24px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '9999px',
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {post.author_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '16px', color: secondaryColor }}>
                  {post.author_name}
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  Autor em {blogTitle}
                </p>
              </div>
            </section>
          )}

          {/* CTA from blog settings */}
          {ctaConfig && ctaConfig.enabled && ctaConfig.text && (
            <section
              style={{
                marginTop: '48px',
                padding: '40px 32px',
                backgroundColor: primaryColor,
                borderRadius: '12px',
                textAlign: 'center',
                color: '#ffffff',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: 700 }}>
                {ctaConfig.title || 'Gostou do conteudo?'}
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: '16px', opacity: 0.9 }}>
                {ctaConfig.text}
              </p>
              {ctaConfig.button_text && ctaConfig.button_url && (
                <a
                  href={ctaConfig.button_url}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#ffffff',
                    color: primaryColor,
                    padding: '12px 32px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '16px',
                    textDecoration: 'none',
                  }}
                >
                  {ctaConfig.button_text}
                </a>
              )}
            </section>
          )}

          {/* Related posts */}
          {relatedPosts.length > 0 && (
            <section style={{ marginTop: '56px' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: 700, color: secondaryColor }}>
                Artigos relacionados
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '24px',
                }}
              >
                {relatedPosts.map((related: any) => {
                  const relCategory = related.blog_categories as any
                  const relDate = related.published_at
                    ? new Date(related.published_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : null

                  return (
                    <a
                      key={related.id}
                      href={`/b/${org.slug}/${related.slug}`}
                      style={{
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit',
                        backgroundColor: '#ffffff',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      {related.featured_image && (
                        <img
                          src={related.featured_image}
                          alt={related.title}
                          style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                        />
                      )}
                      <div style={{ padding: '16px' }}>
                        {relCategory && (
                          <span style={{ fontSize: '12px', color: relCategory.color || primaryColor, fontWeight: 500 }}>
                            {relCategory.name}
                          </span>
                        )}
                        <h3 style={{ margin: '6px 0 8px', fontSize: '16px', fontWeight: 600, color: secondaryColor, lineHeight: 1.3 }}>
                          {related.title}
                        </h3>
                        <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', gap: '8px' }}>
                          {relDate && <span>{relDate}</span>}
                          {related.reading_time_min > 0 && <span>&middot; {related.reading_time_min} min</span>}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </section>
          )}
        </main>

        {/* Footer */}
        <footer
          style={{
            backgroundColor: secondaryColor,
            color: 'rgba(255,255,255,0.6)',
            padding: '32px 24px',
            textAlign: 'center',
            fontSize: '14px',
            marginTop: '56px',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {settings?.footer_text ? (
              <p style={{ margin: 0 }}>{settings.footer_text}</p>
            ) : (
              <p style={{ margin: 0 }}>
                &copy; {new Date().getFullYear()} {org.name}. Todos os direitos reservados.
              </p>
            )}
          </div>
        </footer>
      </body>
    </html>
  )
}

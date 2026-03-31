import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBioPageBySlug, trackBioPageView } from '@/lib/supabase/bio-links'
import { BioPageClient } from './bio-page-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOrganizationSchema } from '@/lib/seo/schema-generator'

interface Props {
  params: Promise<{ slug: string }>
}

async function getBlogData(orgSlug: string) {
  const supabase = createAdminClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, website')
    .eq('slug', orgSlug)
    .single()

  if (orgError || !org) return null

  const { data: settings } = await supabase
    .from('blog_settings')
    .select('*')
    .eq('org_id', org.id)
    .single()

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, published_at, reading_time_min, category_id, author_name, tags, blog_categories(id, name, slug, color)')
    .eq('org_id', org.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const { data: trackingConfig } = await supabase
    .from('org_tracking_config')
    .select('gtm_container_id, ga4_measurement_id, tracking_script')
    .eq('org_id', org.id)
    .single()

  return { org, settings, posts: posts || [], trackingConfig }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  // Try bio page first
  try {
    const bioPage = await getBioPageBySlug(slug)
    if (bioPage && bioPage.is_active) {
      return { title: bioPage.title || 'Bio' }
    }
  } catch { /* not a bio page */ }

  // Try blog index
  const blogData = await getBlogData(slug)
  if (!blogData) return { title: 'Pagina nao encontrada' }

  const { org, settings } = blogData
  const title = settings?.blog_title || `Blog - ${org.name}`
  const description = settings?.blog_description || `Artigos e conteudos de ${org.name}`
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.plataformaemail.com'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/b/${org.slug}`,
      siteName: org.name,
      type: 'website',
      images: settings?.logo_url || org.logo_url
        ? [{ url: settings?.logo_url || org.logo_url }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/b/${org.slug}`,
    },
  }
}

export default async function PublicBioOrBlogPage({ params }: Props) {
  const { slug } = await params

  // Try bio page first
  try {
    const page = await getBioPageBySlug(slug)
    if (page && page.is_active) {
      await trackBioPageView(page.id)
      const activeLinks = (page.links || []).filter(
        (link: any) => link.is_active
      )
      return <BioPageClient page={page} links={activeLinks} />
    }
  } catch { /* not a bio page, try blog */ }

  // Try blog index
  const data = await getBlogData(slug)

  if (!data) {
    notFound()
  }

  const { org, settings, posts, trackingConfig } = data
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.plataformaemail.com'

  const colors = settings?.colors as Record<string, string> | null
  const primaryColor = colors?.primary || '#6366f1'
  const secondaryColor = colors?.secondary || '#0f172a'

  const blogTitle = settings?.blog_title || `Blog ${org.name}`
  const blogDescription = settings?.blog_description || ''

  const orgSchema = generateOrganizationSchema(org, baseUrl)

  return (
    <html lang="pt-BR">
      <head>
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
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#f9fafb', color: '#1f2937' }}>
        {/* Header */}
        <header
          style={{
            backgroundColor: secondaryColor,
            color: '#ffffff',
            padding: '24px 0',
            borderBottom: `3px solid ${primaryColor}`,
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {(settings?.logo_url || org.logo_url) && (
              <img
                src={settings?.logo_url || org.logo_url || ''}
                alt={org.name}
                style={{ height: '40px', width: 'auto', borderRadius: '6px' }}
              />
            )}
            <div>
              <a
                href={`/b/${org.slug}`}
                style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px', fontWeight: 700 }}
              >
                {blogTitle}
              </a>
              {blogDescription && (
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  {blogDescription}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
              <p style={{ fontSize: '18px', color: '#6b7280' }}>
                Nenhum artigo publicado ainda.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '32px',
              }}
            >
              {posts.map((post: any) => {
                const category = post.blog_categories as any
                const publishedDate = post.published_at
                  ? new Date(post.published_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : null

                return (
                  <article
                    key={post.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
                    }}
                  >
                    <a
                      href={`/b/${org.slug}/${post.slug}`}
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                      {post.featured_image && (
                        <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', fontSize: '13px' }}>
                          {category && (
                            <span
                              style={{
                                backgroundColor: category.color || primaryColor,
                                color: '#ffffff',
                                padding: '2px 10px',
                                borderRadius: '9999px',
                                fontWeight: 500,
                                fontSize: '12px',
                              }}
                            >
                              {category.name}
                            </span>
                          )}
                          {post.reading_time_min > 0 && (
                            <span style={{ color: '#9ca3af' }}>
                              {post.reading_time_min} min de leitura
                            </span>
                          )}
                        </div>

                        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: secondaryColor, lineHeight: 1.3 }}>
                          {post.title}
                        </h2>

                        {post.excerpt && (
                          <p style={{ margin: '0 0 14px', fontSize: '15px', color: '#6b7280', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                            {post.excerpt}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af' }}>
                          {post.author_name && (
                            <span>{post.author_name}</span>
                          )}
                          {post.author_name && publishedDate && (
                            <span>&middot;</span>
                          )}
                          {publishedDate && (
                            <time dateTime={post.published_at}>{publishedDate}</time>
                          )}
                        </div>
                      </div>
                    </a>
                  </article>
                )
              })}
            </div>
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
            marginTop: '40px',
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

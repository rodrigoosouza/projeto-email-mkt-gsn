'use client'

import type { BioPage, BioLink } from '@/lib/types'

interface Props {
  page: BioPage
  links: BioLink[]
}

function buildLinkUrl(link: BioLink): string {
  let url = link.url
  const params = new URLSearchParams()
  if (link.utm_source) params.set('utm_source', link.utm_source)
  if (link.utm_medium) params.set('utm_medium', link.utm_medium)
  if (link.utm_campaign) params.set('utm_campaign', link.utm_campaign)
  const qs = params.toString()
  if (qs) {
    url += (url.includes('?') ? '&' : '?') + qs
  }
  return url
}

export function BioPageClient({ page, links }: Props) {
  const buttonClass =
    page.button_style === 'pill'
      ? 'rounded-full'
      : page.button_style === 'square'
        ? 'rounded-none'
        : 'rounded-lg'

  const handleLinkClick = async (linkId: string) => {
    try {
      await fetch('/api/bio/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: linkId }),
      })
    } catch {
      // Silent fail
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center py-12 px-4"
      style={{
        backgroundColor: page.background_color,
        color: page.text_color,
      }}
    >
      {page.custom_css && <style>{page.custom_css}</style>}

      <div className="w-full max-w-md bio-page">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          {page.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={page.avatar_url}
              alt={page.title}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
              style={{
                backgroundColor: page.text_color,
                color: page.background_color,
              }}
            >
              {page.title?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-2">{page.title}</h1>

        {/* Description */}
        {page.description && (
          <p className="text-center opacity-80 mb-8">{page.description}</p>
        )}

        {/* Links */}
        <div className="space-y-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={buildLinkUrl(link)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleLinkClick(link.id)}
              className={`block w-full p-4 text-center font-medium border-2 transition-all hover:scale-[1.02] hover:shadow-lg ${buttonClass}`}
              style={{
                borderColor: page.text_color,
                color: page.text_color,
              }}
            >
              {link.title}
            </a>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs opacity-50 mt-12">
          Powered by Plataforma Email
        </p>
      </div>
    </div>
  )
}

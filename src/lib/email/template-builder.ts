/**
 * Email Template Builder — generates HTML emails using org branding.
 * Layout is fixed and professional. User only provides content.
 */

export interface OrgBranding {
  name: string
  logo_url: string | null
  website: string | null
  sender_email: string | null
  sender_name: string | null
  email_settings: {
    primary_color?: string    // header bg, links
    secondary_color?: string  // text headings
    accent_color?: string     // CTA button
    header_bg?: string        // header background
    phone?: string
    address?: string
    footer_text?: string
    social_links?: {
      instagram?: string
      facebook?: string
      linkedin?: string
      youtube?: string
      whatsapp?: string
    }
  }
}

export interface EmailContent {
  // Required
  subject: string
  greeting: string           // "Rodrigo, sua inscrição está confirmada!"
  body_text: string          // Main body paragraphs (supports \n for line breaks)

  // Optional blocks
  highlight_box?: {
    label?: string           // "LIVE"
    title: string            // "Como Descobrir seu Lucro Real em 30 Minutos"
    details?: { label: string; value: string }[]  // [{label:"QUANDO", value:"7 de abril"}]
  }

  steps?: {
    title?: string           // "Complete os próximos passos:"
    items: {
      label: string          // "Inscrição confirmada"
      description?: string   // "Sua vaga está garantida."
      done?: boolean         // true = checkmark, false = number
    }[]
  }

  cta?: {
    text: string             // "Entrar no grupo do WhatsApp"
    url: string              // "https://..."
  }

  footer_note?: string       // "Evento 100% gratuito e online. Nos vemos lá!"

  // Image (optional)
  banner_image_url?: string
}

export type TemplateType = 'padrao' | 'webinar' | 'newsletter' | 'promocional' | 'boas_vindas'

/**
 * Build a complete HTML email from org branding + content.
 */
export function buildEmailHtml(org: OrgBranding, content: EmailContent): string {
  const s = org.email_settings || {}
  const primary = s.primary_color || '#1a2332'
  const secondary = s.secondary_color || '#333333'
  const accent = s.accent_color || '#e74c3c'
  const headerBg = s.header_bg || primary
  const logoUrl = org.logo_url || ''
  const orgName = org.name || ''
  const website = org.website || ''
  const phone = s.phone || ''
  const address = s.address || ''
  const footerText = s.footer_text || `${orgName}${address ? ' — ' + address : ''}`
  const social = s.social_links || {}

  // Convert body text line breaks to HTML
  const bodyHtml = content.body_text
    .split('\n\n')
    .map(p => `<p style="color:#555;line-height:1.7;font-size:16px;margin:0 0 16px 0;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')

  // Highlight box
  let highlightHtml = ''
  if (content.highlight_box) {
    const hb = content.highlight_box
    const detailsHtml = hb.details?.map(d =>
      `<td style="padding-right:24px;"><span style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;font-weight:600;">${d.label}</span><br><span style="font-size:16px;color:#fff;font-weight:700;">${d.value}</span></td>`
    ).join('') || ''

    highlightHtml = `
      <div style="background:${primary};border-radius:12px;padding:28px;margin:24px 0;">
        ${hb.label ? `<span style="background:rgba(255,255,255,0.15);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:4px;text-transform:uppercase;letter-spacing:1px;">${hb.label}</span>` : ''}
        <h2 style="color:#fff;font-size:22px;font-weight:700;margin:12px 0 16px 0;line-height:1.3;">${hb.title}</h2>
        ${detailsHtml ? `<table cellpadding="0" cellspacing="0" border="0"><tr>${detailsHtml}</tr></table>` : ''}
      </div>`
  }

  // Steps
  let stepsHtml = ''
  if (content.steps && content.steps.items.length > 0) {
    const stepsTitle = content.steps.title || ''
    const itemsHtml = content.steps.items.map((step, i) => {
      const icon = step.done
        ? `<div style="width:32px;height:32px;border-radius:50%;background:${accent};color:#fff;text-align:center;line-height:32px;font-size:14px;">✓</div>`
        : `<div style="width:32px;height:32px;border-radius:50%;background:#f0f0f0;color:${secondary};text-align:center;line-height:32px;font-size:14px;font-weight:600;">${i + 1}</div>`
      return `
        <tr>
          <td style="padding:12px 16px 12px 0;vertical-align:top;width:32px;">${icon}</td>
          <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
            <strong style="color:${secondary};font-size:15px;">${step.label}</strong>
            ${step.description ? `<br><span style="color:#888;font-size:13px;">${step.description}</span>` : ''}
          </td>
        </tr>`
    }).join('')

    stepsHtml = `
      <div style="margin:28px 0;">
        ${stepsTitle ? `<h3 style="color:${secondary};font-size:18px;font-weight:700;margin:0 0 16px 0;">${stepsTitle}</h3>` : ''}
        <table cellpadding="0" cellspacing="0" border="0" width="100%">${itemsHtml}</table>
      </div>`
  }

  // CTA Button
  let ctaHtml = ''
  if (content.cta) {
    ctaHtml = `
      <div style="text-align:center;margin:28px 0;">
        <a href="${content.cta.url}" style="display:inline-block;background:${accent};color:#fff;font-size:16px;font-weight:700;padding:14px 32px;border-radius:28px;text-decoration:none;letter-spacing:0.3px;">${content.cta.text}</a>
      </div>`
  }

  // Footer note
  const footerNoteHtml = content.footer_note
    ? `<p style="text-align:center;color:#888;font-size:14px;margin:8px 0 28px 0;">${content.footer_note}</p>`
    : ''

  // Banner image
  const bannerHtml = content.banner_image_url
    ? `<img src="${content.banner_image_url}" alt="" style="width:100%;border-radius:8px;margin:16px 0;" />`
    : ''

  // Social links
  const socialLinks = Object.entries(social).filter(([, url]) => url).map(([platform, url]) =>
    `<a href="${url}" style="color:#999;text-decoration:none;margin:0 8px;font-size:13px;">${platform.charAt(0).toUpperCase() + platform.slice(1)}</a>`
  ).join(' · ')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${content.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:${headerBg};padding:28px 40px;text-align:center;border-radius:12px 12px 0 0;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height:48px;max-width:200px;" />` : `<span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:0.5px;">${orgName}</span>`}
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:40px;">
              <!-- Greeting -->
              <h1 style="color:${secondary};font-size:24px;font-weight:700;margin:0 0 20px 0;line-height:1.3;">${content.greeting}</h1>

              <!-- Body text -->
              ${bodyHtml}

              <!-- Banner image -->
              ${bannerHtml}

              <!-- Highlight box -->
              ${highlightHtml}

              <!-- Steps -->
              ${stepsHtml}

              <!-- CTA -->
              ${ctaHtml}

              <!-- Footer note -->
              ${footerNoteHtml}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#fafafa;padding:28px 40px;text-align:center;border-radius:0 0 12px 12px;border-top:1px solid #eee;">
              <p style="color:#999;font-size:13px;margin:0 0 4px 0;font-weight:600;">${footerText}</p>
              ${phone ? `<p style="color:#999;font-size:13px;margin:0 0 4px 0;">${phone}</p>` : ''}
              ${website ? `<p style="margin:0 0 8px 0;"><a href="${website.startsWith('http') ? website : 'https://' + website}" style="color:${accent};font-size:13px;text-decoration:none;font-weight:600;">${website.replace(/^https?:\/\//, '')}</a></p>` : ''}
              ${socialLinks ? `<p style="margin:8px 0;">${socialLinks}</p>` : ''}
              <p style="color:#bbb;font-size:11px;margin:12px 0 0 0;">
                <a href="{{unsubscribe_url}}" style="color:#bbb;text-decoration:underline;">Descadastrar</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Get default content structure for a template type.
 */
export function getDefaultContent(type: TemplateType): Partial<EmailContent> {
  switch (type) {
    case 'webinar':
      return {
        greeting: 'Olá, {{first_name}}! Sua inscrição está confirmada!',
        body_text: 'Você está inscrito no evento abaixo. O convite já está anexo — aceite para travar na sua agenda.',
        highlight_box: {
          label: 'LIVE',
          title: 'Titulo do Webinar',
          details: [
            { label: 'QUANDO', value: '7 de abril' },
            { label: 'HORÁRIO', value: '19h' },
            { label: 'DURAÇÃO', value: '60 min' },
          ],
        },
        steps: {
          title: 'Complete os próximos passos:',
          items: [
            { label: 'Inscrição confirmada', description: 'Sua vaga está garantida.', done: true },
            { label: 'Aceite o convite anexo', description: 'Abra o arquivo .ics anexo para travar o evento na sua agenda.' },
            { label: 'Entre no grupo do WhatsApp', description: 'Avisos, materiais e link de acesso serão enviados no grupo.' },
          ],
        },
        cta: { text: 'Entrar no grupo do WhatsApp', url: 'https://' },
        footer_note: 'Evento 100% gratuito e online. Nos vemos lá!',
      }
    case 'boas_vindas':
      return {
        greeting: 'Bem-vindo(a), {{first_name}}!',
        body_text: 'É um prazer ter você conosco. Preparamos tudo para que sua experiência seja a melhor possível.\n\nNos próximos dias, você vai receber conteúdos exclusivos para te ajudar a aproveitar ao máximo.',
        cta: { text: 'Acessar a plataforma', url: 'https://' },
      }
    case 'newsletter':
      return {
        greeting: '{{first_name}}, confira as novidades da semana',
        body_text: 'Selecionamos os conteúdos mais relevantes para você.\n\nContinue lendo para descobrir insights que podem transformar seus resultados.',
      }
    case 'promocional':
      return {
        greeting: '{{first_name}}, temos uma oferta especial para você!',
        body_text: 'Por tempo limitado, estamos com uma condição exclusiva que não queríamos que você perdesse.',
        cta: { text: 'Aproveitar agora', url: 'https://' },
        footer_note: 'Oferta válida por tempo limitado.',
      }
    default: // padrao
      return {
        greeting: 'Olá, {{first_name}}!',
        body_text: 'Escreva seu conteúdo aqui.',
      }
  }
}

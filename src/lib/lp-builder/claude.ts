import { Brand, UploadedImage, ApiMessage } from './types';
import {
  getBrandConfig,
  loadBrandContext,
  loadBrandICP,
  loadDesignSystem,
  loadTrackingIntegration,
  loadGenerationRules,
  loadSystemPromptTemplate,
  loadAnimations,
} from './brands';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export async function buildSystemPrompt(brand: Brand, imageCount: number = 0): Promise<string> {
  const [templateRaw, brandContext, brandICP, designSystem, tracking, generationRules, animations] =
    await Promise.all([
      loadSystemPromptTemplate(),
      loadBrandContext(brand),
      loadBrandICP(brand),
      loadDesignSystem(),
      loadTrackingIntegration(),
      loadGenerationRules(),
      loadAnimations(),
    ]);

  const config = getBrandConfig(brand);

  // Extract the prompt content between the ``` markers
  const promptMatch = templateRaw.match(/```\n([\s\S]*?)```/);
  const template = promptMatch ? promptMatch[1] : templateRaw;

  let systemPrompt = template
    .replace(/\{\{BRAND_CONTEXT\}\}/g, brandContext)
    .replace(/\{\{BRAND_ICP\}\}/g, brandICP || 'ICP nao disponivel para esta marca.')
    .replace(/\{\{NOME_EMPRESA\}\}/g, config.name)
    .replace(/\{\{COOKIE_DOMAIN\}\}/g, config.cookieDomain)
    .replace(/\{\{WEBHOOK_URL\}\}/g, config.webhookUrl || 'https://SEU-DOMINIO.com/webhook/CONFIGURAR');

  // Append reference files
  systemPrompt += `\n\n═══════════════════════════════════════════\nDESIGN SYSTEM REFERENCE\n═══════════════════════════════════════════\n\n${designSystem}`;
  systemPrompt += `\n\n═══════════════════════════════════════════\nTRACKING INTEGRATION (incluir na LP gerada)\n═══════════════════════════════════════════\n\n${tracking}`;
  systemPrompt += `\n\n═══════════════════════════════════════════\nGENERATION RULES (seguir ao gerar HTML)\n═══════════════════════════════════════════\n\n${generationRules}`;
  systemPrompt += `\n\n═══════════════════════════════════════════\nANIMATIONS CATALOG\n═══════════════════════════════════════════\n\n${animations}`;

  // Add GTM container info
  systemPrompt += `\n\n═══════════════════════════════════════════\nGTM WEB CONTAINER\n═══════════════════════════════════════════\n\nO GTM Web Container ID desta empresa e: ${config.gtmId}\nInserir o snippet padrao do GTM no <head> e o <noscript> logo apos <body>.`;

  // Add image handling instructions if images are available
  if (imageCount > 0) {
    const imageIds = Array.from({ length: imageCount }, (_, i) => `IMAGE_${i + 1}`);
    systemPrompt += `\n\n═══════════════════════════════════════════\nIMAGENS DO CLIENTE\n═══════════════════════════════════════════\n\n`;
    systemPrompt += `O cliente enviou ${imageCount} imagen(s). Voce pode VER as imagens na mensagem.\n`;
    systemPrompt += `Para usar no HTML, coloque o placeholder como src da tag <img>:\n`;
    systemPrompt += imageIds.map(id => `- {{${id}}}`).join('\n');
    systemPrompt += `\n\nO sistema substituira automaticamente pelos dados reais.\n\n`;
    systemPrompt += `REGRAS PARA IMAGENS:\n`;
    systemPrompt += `- Use as imagens em contexto apropriado (hero, beneficios, cards, etc.)\n`;
    systemPrompt += `- Estilize com: border-radius: 16px; object-fit: cover; width: 100%\n`;
    systemPrompt += `- Layouts recomendados:\n`;
    systemPrompt += `  - Hero: texto a esquerda + imagem a direita (grid 2 colunas)\n`;
    systemPrompt += `  - Cards: imagem no topo + texto embaixo (grid 2-3 colunas)\n`;
    systemPrompt += `  - Secoes alternadas: imagem-texto / texto-imagem\n`;
    systemPrompt += `- Adicione box-shadow sutil e hover effect nas imagens\n`;
    systemPrompt += `- Se o cliente nao especificar onde colocar, distribua harmonicamente\n`;
    systemPrompt += `- Cada {{IMAGE_N}} deve aparecer EXATAMENTE UMA VEZ no HTML\n`;
  }

  return systemPrompt;
}

async function callOpenRouter(
  systemPrompt: string,
  messages: { role: string; content: string | object }[],
  maxTokens: number = 16000
): Promise<{ text: string; finishReason: string }> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error(`[OpenRouter] Error ${response.status}:`, errBody);
    throw new Error(`OpenRouter API error: ${response.status} - ${errBody.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content || '';
  const finishReason = data.choices[0].finish_reason || 'stop';

  return { text, finishReason };
}

export async function sendMessage(
  systemPrompt: string,
  messages: ApiMessage[]
): Promise<string> {
  const apiMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content as string | object,
  }));

  // First call with higher token limit
  const first = await callOpenRouter(systemPrompt, apiMessages, 16000);
  let fullText = first.text;

  // If truncated, automatically continue to get the rest of the HTML
  if (first.finishReason === 'length' && (fullText.includes('<html') || fullText.includes('<!DOCTYPE'))) {
    console.log('[OpenRouter] Response truncated, requesting continuation...');

    const MAX_CONTINUATIONS = 3;
    for (let i = 0; i < MAX_CONTINUATIONS; i++) {
      const continuationMessages = [
        ...apiMessages,
        { role: 'assistant' as const, content: fullText },
        { role: 'user' as const, content: 'Continue EXATAMENTE de onde parou. Retorne APENAS o HTML restante, sem repetir o que ja foi gerado. Nao adicione ```html nem explicacoes.' },
      ];

      const cont = await callOpenRouter(systemPrompt, continuationMessages, 16000);
      fullText += cont.text;
      console.log(`[OpenRouter] Continuation ${i + 1}: +${cont.text.length} chars, finish: ${cont.finishReason}`);

      if (cont.finishReason !== 'length' || fullText.includes('</html>')) {
        break;
      }
    }

    // Ensure HTML is properly closed
    if (!fullText.includes('</html>')) {
      if (!fullText.includes('</body>')) fullText += '\n</body>';
      fullText += '\n</html>';
    }

    console.log(`[OpenRouter] Final HTML length after continuations: ${fullText.length}`);
  }

  return fullText;
}

export function extractHtmlFromResponse(response: string): string | null {
  // Strategy 1: Find ```html ... ``` block
  const htmlStartMatch = response.match(/```html\s*\n/);
  if (htmlStartMatch && htmlStartMatch.index !== undefined) {
    const contentStart = htmlStartMatch.index + htmlStartMatch[0].length;
    const content = response.substring(contentStart);

    // Find the closing ```
    const closingMatch = content.match(/\n```\s*$/m);
    if (closingMatch && closingMatch.index !== undefined) {
      return content.substring(0, closingMatch.index).trim();
    }

    // Fallback: find last ``` in the content
    const lastBackticks = content.lastIndexOf('\n```');
    if (lastBackticks > 0) {
      return content.substring(0, lastBackticks).trim();
    }

    // Last resort: take everything after ```html (truncated response)
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      console.warn('[Extract] HTML block not closed (truncated), extracting available content');
      return content.trim();
    }
  }

  // Strategy 2: Look for complete raw HTML (<!DOCTYPE...  </html>)
  const doctypeMatch = response.match(/(<!DOCTYPE html[\s\S]*<\/html>)/i);
  if (doctypeMatch) {
    return doctypeMatch[1].trim();
  }

  // Strategy 3: Look for partial raw HTML starting with <!DOCTYPE (truncated)
  const partialMatch = response.match(/(<!DOCTYPE html[\s\S]*)/i);
  if (partialMatch && partialMatch[1].length > 500) {
    console.warn('[Extract] Found truncated HTML without </html>, length:', partialMatch[1].length);
    // Try to close it gracefully
    let html = partialMatch[1].trim();
    if (!html.includes('</html>')) {
      // Add closing tags if missing
      if (!html.includes('</body>')) html += '\n</body>';
      html += '\n</html>';
    }
    return html;
  }

  // Strategy 4: Look for <html> tag (some models omit DOCTYPE)
  const htmlTagMatch = response.match(/(<html[\s\S]*<\/html>)/i);
  if (htmlTagMatch) {
    return '<!DOCTYPE html>\n' + htmlTagMatch[1].trim();
  }

  return null;
}

export function injectLogoIntoHtml(html: string, logoDataUri: string, brand: Brand): string {
  if (!logoDataUri || !html) return html;

  let result = html;

  // 1. Replace {{LOGO_DATA_URI}} placeholder (what we instruct Claude to use)
  result = result.replace(
    /\{\{LOGO_DATA_URI\}\}/g,
    logoDataUri
  );

  // 2. Replace relative logo paths: /logos/..., ./logos/..., logos/...
  result = result.replace(
    /src=["'](?:\.?\/)?logos\/[^"']+["']/gi,
    `src="${logoDataUri}"`
  );

  // 3. Replace brand-specific placeholder URLs Claude might invent
  const brandName = brand.toLowerCase();
  const brandLogoPattern = new RegExp(
    `src=["'][^"']*${brandName}[^"']*(?:logo|marca)[^"']*\\.(?:png|jpg|jpeg|svg|webp)["']`,
    'gi'
  );
  result = result.replace(brandLogoPattern, `src="${logoDataUri}"`);

  // Also match reverse order: logo-brandname
  const logoFirstPattern = new RegExp(
    `src=["'][^"']*(?:logo|marca)[^"']*${brandName}[^"']*\\.(?:png|jpg|jpeg|svg|webp)["']`,
    'gi'
  );
  result = result.replace(logoFirstPattern, `src="${logoDataUri}"`);

  return result;
}

export function injectImagesIntoHtml(html: string, images: UploadedImage[]): string {
  let result = html;
  for (const img of images) {
    const placeholder = new RegExp(`\\{\\{${img.id}\\}\\}`, 'g');
    result = result.replace(placeholder, img.data);
  }
  return result;
}

export function extractMessageWithoutHtml(response: string): string {
  // Remove ```html ... ``` block
  const htmlStartMatch = response.match(/```html\s*\n/);
  if (htmlStartMatch && htmlStartMatch.index !== undefined) {
    const before = response.substring(0, htmlStartMatch.index);
    const afterContent = response.substring(htmlStartMatch.index + htmlStartMatch[0].length);

    // Find the closing ```
    const lastBackticks = afterContent.lastIndexOf('\n```');
    const after = lastBackticks > 0 ? afterContent.substring(lastBackticks + 4) : '';

    return (before + after).trim();
  }

  // Remove raw HTML block
  const cleaned = response.replace(/<!DOCTYPE html[\s\S]*<\/html>/i, '').trim();
  if (cleaned !== response.trim()) {
    return cleaned;
  }

  // If response has HTML but we're extracting message, return just first line
  if (response.includes('<!DOCTYPE') || response.includes('<html')) {
    const firstLine = response.split('\n')[0];
    if (firstLine && !firstLine.includes('<')) {
      return firstLine.trim();
    }
    return 'LP gerada com sucesso!';
  }

  return response.trim();
}

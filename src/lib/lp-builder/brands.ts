import { promises as fs } from 'fs';
import path from 'path';
import { Brand, BrandConfig } from './types';

const brandConfigs: Record<Brand, BrandConfig> = {
  templum: {
    name: 'Templum',
    slug: 'templum',
    logo: '/logos/templum-logo.jpeg',
    gtmId: 'GTM-WLFN684J',
    cookieDomain: '.templum.com.br',
    webhookUrl: '',
    description: 'Consultoria e Tecnologia em Governanca Corporativa',
  },
  evolutto: {
    name: 'Evolutto',
    slug: 'evolutto',
    logo: '/logos/evolutto-logo.jpeg',
    gtmId: 'GTM-PCS96CR',
    cookieDomain: '.evolutto.com.br',
    webhookUrl: '',
    description: 'Plataforma para Escalar Consultorias',
  },
  orbit: {
    name: 'Orbit Gestao',
    slug: 'orbit',
    logo: '/logos/orbit-logo.jpeg',
    gtmId: 'GTM-W6H3729J',
    cookieDomain: '.orbitgestao.com.br',
    webhookUrl: '',
    description: 'Plataforma de IA para Gestao Empresarial',
  },
};

export function getBrandConfig(brand: Brand): BrandConfig {
  return brandConfigs[brand];
}

export function getAllBrands(): BrandConfig[] {
  return Object.values(brandConfigs);
}

async function readContextFile(relativePath: string): Promise<string> {
  const filePath = path.join(process.cwd(), 'context', relativePath);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    console.error(`Failed to read context file: ${filePath}`);
    return '';
  }
}

export async function loadBrandContext(brand: Brand): Promise<string> {
  return readContextFile(`brands/${brand}.md`);
}

export async function loadBrandICP(brand: Brand): Promise<string> {
  return readContextFile(`brands/${brand}-icp.md`);
}

export async function loadDesignSystem(): Promise<string> {
  return readContextFile('references/design-system.md');
}

export async function loadTrackingIntegration(): Promise<string> {
  return readContextFile('references/tracking-integration.md');
}

export async function loadGenerationRules(): Promise<string> {
  return readContextFile('references/generation-rules.md');
}

export async function loadSystemPromptTemplate(): Promise<string> {
  return readContextFile('prompts/system-prompt.md');
}

export async function loadAnimations(): Promise<string> {
  return readContextFile('references/animations.md');
}

export async function loadBrandLogoBase64(brand: Brand): Promise<string> {
  const logoPath = path.join(process.cwd(), 'public', 'logos', `${brand}-logo.jpeg`);
  try {
    const buffer = await fs.readFile(logoPath);
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch {
    console.error(`Failed to read logo file: ${logoPath}`);
    return '';
  }
}

import { Brand } from './types';
import { getBrandConfig } from './brands';

interface DeployConfig {
  namePrefix: string;
}

const deployConfigs: Record<Brand, DeployConfig> = {
  templum: { namePrefix: 'lp-templum' },
  evolutto: { namePrefix: 'lp-evolutto' },
  orbit: { namePrefix: 'lp-orbit' },
};

export async function deployToVercelGeneric(
  orgSlug: string,
  html: string,
  titulo: string,
  options?: { customDomain?: string }
): Promise<{ success: boolean; url: string; vercelUrl: string; deploymentId: string }> {
  const slug = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const namePrefix = `lp-${orgSlug.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`;
  const deployName = `${namePrefix}-${slug}`;
  const htmlBase64 = Buffer.from(html).toString('base64');

  const teamId = process.env.VERCEL_TEAM_ID;
  const apiEndpoint = teamId
    ? `https://api.vercel.com/v13/deployments?teamId=${teamId}`
    : 'https://api.vercel.com/v13/deployments';

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: deployName,
      files: [
        {
          file: 'index.html',
          data: htmlBase64,
          encoding: 'base64',
        },
      ],
      projectSettings: {
        framework: null,
        buildCommand: '',
        outputDirectory: '.',
      },
      target: 'production',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Deploy failed: ${JSON.stringify(error)}`);
  }

  const deployment = await response.json();
  const deployUrl = `https://${deployment.url}`;

  // Add custom domain alias if provided
  if (options?.customDomain) {
    try {
      const aliasEndpoint = teamId
        ? `https://api.vercel.com/v2/deployments/${deployment.id}/aliases?teamId=${teamId}`
        : `https://api.vercel.com/v2/deployments/${deployment.id}/aliases`;
      await fetch(aliasEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alias: options.customDomain }),
      });
    } catch (e) {
      console.error('Failed to set custom domain alias:', e);
    }
  }

  return {
    success: true,
    url: options?.customDomain ? `https://${options.customDomain}` : deployUrl,
    vercelUrl: deployUrl,
    deploymentId: deployment.id,
  };
}

export async function deployToVercel(
  empresa: Brand,
  html: string,
  titulo: string,
  sessionId: string
): Promise<{ success: boolean; url: string; vercelUrl: string; deploymentId: string }> {
  const config = deployConfigs[empresa];
  const brandConfig = getBrandConfig(empresa);

  const slug = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const deployName = `${config.namePrefix}-${slug}`;
  const htmlBase64 = Buffer.from(html).toString('base64');

  const teamId = process.env.VERCEL_TEAM_ID;
  const apiEndpoint = teamId
    ? `https://api.vercel.com/v13/deployments?teamId=${teamId}`
    : 'https://api.vercel.com/v13/deployments';

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: deployName,
      files: [
        {
          file: 'index.html',
          data: htmlBase64,
          encoding: 'base64',
        },
      ],
      projectSettings: {
        framework: null,
        buildCommand: '',
        outputDirectory: '.',
      },
      target: 'production',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Deploy failed: ${JSON.stringify(error)}`);
  }

  const deployment = await response.json();
  const deployUrl = `https://${deployment.url}`;

  // Notify admin via webhook if configured
  if (process.env.ADMIN_WEBHOOK_URL) {
    try {
      await fetch(process.env.ADMIN_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'lp_deployed',
          empresa,
          empresa_name: brandConfig.name,
          titulo,
          url: deployUrl,
          session_id: sessionId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error('Failed to notify admin:', e);
    }
  }

  return {
    success: true,
    url: deployUrl,
    vercelUrl: deployUrl,
    deploymentId: deployment.id,
  };
}

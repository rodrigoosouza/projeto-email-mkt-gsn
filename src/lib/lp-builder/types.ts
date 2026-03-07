export type Brand = 'templum' | 'evolutto' | 'orbit';

export type ChatPhase =
  | 'select_brand'
  | 'briefing'
  | 'generating'
  | 'reviewing'
  | 'approved'
  | 'deploying'
  | 'deployed';

export interface UploadedImage {
  id: string;        // IMAGE_1, IMAGE_2, etc.
  data: string;      // full data URI (data:image/jpeg;base64,...)
  mediaType: string;  // image/jpeg, image/png, etc.
  name: string;      // original file name
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: UploadedImage[];
}

export interface AppState {
  brand: Brand | null;
  messages: Message[];
  isLoading: boolean;
  currentHtml: string | null;
  lpVersion: number;
  phase: ChatPhase;
  deployUrl: string | null;
  deploymentId: string | null;
  sessionId: string;
}

export type AppAction =
  | { type: 'SELECT_BRAND'; brand: Brand }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_HTML'; html: string }
  | { type: 'SET_PHASE'; phase: ChatPhase }
  | { type: 'SET_DEPLOY'; url: string; deploymentId: string }
  | { type: 'RESET' };

// API content block types (for Claude multimodal messages)
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

export type ApiMessage = {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
};

export interface ChatRequest {
  brand: Brand;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  session_id: string;
}

export interface ChatResponse {
  message: string;
  html?: string;
  status: 'briefing' | 'generated' | 'reviewing';
}

export interface DeployRequest {
  empresa: Brand;
  html: string;
  titulo: string;
  session_id: string;
}

export interface DeployResponse {
  success: boolean;
  url: string;
  vercel_url: string;
  deployment_id: string;
}

export interface BrandConfig {
  name: string;
  slug: Brand;
  logo: string;
  gtmId: string;
  cookieDomain: string;
  webhookUrl: string;
  description: string;
}

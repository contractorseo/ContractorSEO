export interface EngineResult {
  engine: string;
  mentioned: boolean;
  snippet: string | null;
  error?: string;
}

export function getConfiguredEngines(): { openai: boolean; perplexity: boolean } {
  return {
    openai:     !!process.env.OPENAI_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
  };
}

function extractSnippet(text: string, name: string): string | null {
  const idx = text.toLowerCase().indexOf(name.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 120);
  const end   = Math.min(text.length, idx + name.length + 120);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

function detectMention(text: string, name: string): { mentioned: boolean; snippet: string | null } {
  const mentioned = text.toLowerCase().includes(name.toLowerCase());
  return { mentioned, snippet: mentioned ? extractSnippet(text, name) : null };
}

async function queryOpenAI(prompt: string, businessName: string): Promise<EngineResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { engine: 'openai', mentioned: false, snippet: null, error: 'not_configured' };
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return { engine: 'openai', mentioned: false, snippet: null, error: `http_${res.status}` };
    const data: any = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';
    return { engine: 'openai', ...detectMention(text, businessName) };
  } catch {
    return { engine: 'openai', mentioned: false, snippet: null, error: 'timeout' };
  }
}

async function queryPerplexity(prompt: string, businessName: string): Promise<EngineResult> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return { engine: 'perplexity', mentioned: false, snippet: null, error: 'not_configured' };
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return { engine: 'perplexity', mentioned: false, snippet: null, error: `http_${res.status}` };
    const data: any = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';
    return { engine: 'perplexity', ...detectMention(text, businessName) };
  } catch {
    return { engine: 'perplexity', mentioned: false, snippet: null, error: 'timeout' };
  }
}

export async function runEngineChecks(
  prompt: string,
  businessName: string,
): Promise<EngineResult[]> {
  const results: Promise<EngineResult>[] = [];
  if (process.env.OPENAI_API_KEY)     results.push(queryOpenAI(prompt, businessName));
  if (process.env.PERPLEXITY_API_KEY) results.push(queryPerplexity(prompt, businessName));
  if (results.length === 0) return [];
  return Promise.all(results);
}

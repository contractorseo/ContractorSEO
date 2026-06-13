import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GeneratePostOptions {
  businessName: string;
  category: string;
  city: string;
  postType: 'update' | 'offer' | 'event' | 'tip';
  jobType?: string;
  tone?: 'professional' | 'friendly' | 'urgent';
}

export async function generateGBPPost(opts: GeneratePostOptions): Promise<{ title: string; content: string }> {
  const prompt = `You are an expert local SEO copywriter for contractor businesses.

Generate a Google Business Profile ${opts.postType} post for:
- Business: ${opts.businessName}
- Category: ${opts.category}
- City: ${opts.city}
${opts.jobType ? `- Job type: ${opts.jobType}` : ''}
- Tone: ${opts.tone ?? 'professional'}

Requirements:
- Title: 60 chars max, compelling, includes city + service
- Content: 150-300 words, includes 2-3 local keywords naturally, ends with a call to action
- Do NOT use hashtags or emojis
- Sound like a real local contractor, not a corporate brand

Respond in JSON: { "title": "...", "content": "..." }`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned invalid response');

  return JSON.parse(jsonMatch[0]);
}

export interface ReviewResponseOptions {
  businessName: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  category: string;
}

export async function generateReviewResponse(opts: ReviewResponseOptions): Promise<string> {
  const prompt = `You are managing online reputation for ${opts.businessName}, a ${opts.category} business.

Write a ${opts.rating >= 4 ? 'grateful, warm' : 'professional, empathetic'} response to this Google review:

Reviewer: ${opts.reviewerName}
Rating: ${opts.rating}/5
Review: "${opts.reviewText}"

Requirements:
- 50-100 words max
- Thank them by first name
- ${opts.rating >= 4 ? 'Reinforce the positive, invite them back' : 'Acknowledge the concern, offer to resolve offline'}
- Do NOT be defensive or generic
- Sound human, not scripted
- End with your first name or "The ${opts.businessName} Team"

Return only the response text, no extra commentary.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}

export interface CompetitorAnalysisOptions {
  businessName: string;
  category: string;
  city: string;
  competitors: Array<{
    name: string;
    monthly_posts: number;
    review_count: number;
    rating: number;
    threat_level: string;
  }>;
}

export interface CompetitorInsight {
  headline: string;
  detail: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export async function analyzeCompetitors(opts: CompetitorAnalysisOptions): Promise<CompetitorInsight[]> {
  const competitorSummary = opts.competitors
    .map((c) => `- ${c.name}: ${c.review_count} reviews (${c.rating}★), ${c.monthly_posts} posts/mo, threat: ${c.threat_level}`)
    .join('\n');

  const prompt = `You are a local SEO strategist analyzing the competitive landscape for a contractor.

Business: ${opts.businessName} (${opts.category} in ${opts.city})

Competitors:
${competitorSummary}

Analyze this competitive landscape and return 4 specific, actionable insights. Each insight should identify a gap or opportunity based on the data.

Respond in JSON array:
[
  {
    "headline": "short title (5-8 words)",
    "detail": "1-2 sentence explanation of what you see in the data",
    "action": "specific thing the business should do this week",
    "priority": "high" | "medium" | "low"
  }
]`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}

export interface SEOAuditOptions {
  businessName: string;
  category: string;
  city: string;
  currentKeywords: string[];
  competitors: string[];
}

export async function generateKeywordSuggestions(opts: SEOAuditOptions): Promise<string[]> {
  const prompt = `Generate 20 high-intent local SEO keywords for a ${opts.category} in ${opts.city}.

Business: ${opts.businessName}
Existing keywords: ${opts.currentKeywords.join(', ')}
Competitors ranking: ${opts.competitors.join(', ')}

Focus on:
- "[service] + [city/neighborhood]" patterns
- Emergency and near-me terms
- Long-tail buyer intent phrases
- Seasonal and permit-related terms

Return JSON array of 20 keyword strings only.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}

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
    model: 'claude-sonnet-4-5',
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
    model: 'claude-sonnet-4-5',
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
    model: 'claude-sonnet-4-5',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}

export interface ArticleTopicOptions {
  businessName: string;
  category: string;
  city: string;
}

export interface ArticleTopic {
  topic: string;
  type: 'cost_guide' | 'how_to' | 'local_guide' | 'faq';
}

export async function generateArticleTopics(opts: ArticleTopicOptions): Promise<ArticleTopic[]> {
  const prompt = `You are a local SEO content strategist for contractor businesses.

Generate 12 blog article topic ideas for:
- Business: ${opts.businessName}
- Trade: ${opts.category}
- City: ${opts.city}

Requirements:
- Mix: 4 cost guides, 3 how-to guides, 3 local guides, 2 FAQ/informational
- Every topic must have clear local intent (reference ${opts.city} or surrounding area)
- Titles must be specific and search-intent-driven, not generic
- Focus on homeowner questions and pre-purchase research

Return a JSON array only, no extra text:
[
  { "topic": "How Much Does It Cost to Install an EV Charger in ${opts.city}?", "type": "cost_guide" },
  ...
]`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}

export interface GenerateArticleOptions {
  topic: string;
  businessName: string;
  category: string;
  city: string;
  website?: string | null;
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  meta_description: string;
  body_html: string;
  faq_json: Array<{ question: string; answer: string }>;
  schema_jsonld: object;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 100);
}

export async function generateArticle(opts: GenerateArticleOptions): Promise<GeneratedArticle> {
  const prompt = `You are an expert local SEO content writer for contractor businesses.

Write a complete, SEO-optimized blog article for:
- Business: ${opts.businessName} (${opts.category} in ${opts.city})
- Topic: ${opts.topic}

Requirements:
- 900–1200 words total
- Structure: intro (100–150 words) → 4–5 H2 sections with H3 subsections where needed → FAQ section
- Reference ${opts.city} naturally throughout (neighborhoods, permit offices, climate, local codes where relevant)
- Include specific realistic cost ranges, timeframes, or stats where helpful
- Professional but approachable tone — sound like a real local expert, not a marketing brochure
- End with a 4–5 item FAQ section
- Do NOT use hashtags, emojis, or sales pressure language
- HTML body: only use <h2>, <h3>, <p>, <ul>, <li>, <strong> tags — no <html>/<body>/<head> wrapper

Return valid JSON only, no markdown fences:
{
  "title": "SEO title (55–65 chars, includes primary keyword + city)",
  "meta_description": "Meta description (145–160 chars, primary keyword + location + value prop)",
  "body_html": "<h2>First Section</h2><p>...</p>...",
  "faq": [
    { "question": "...", "answer": "..." }
  ]
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned invalid response');

  const parsed = JSON.parse(jsonMatch[0]);
  const faq: Array<{ question: string; answer: string }> = Array.isArray(parsed.faq) ? parsed.faq : [];

  const schema_jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: parsed.title,
        description: parsed.meta_description,
        author: { '@type': 'Organization', name: opts.businessName },
        publisher: { '@type': 'Organization', name: opts.businessName },
        ...(opts.website ? { url: opts.website } : {}),
      },
      ...(faq.length > 0 ? [{
        '@type': 'FAQPage',
        mainEntity: faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      }] : []),
    ],
  };

  return {
    title: parsed.title,
    slug: slugify(parsed.title),
    meta_description: parsed.meta_description,
    body_html: parsed.body_html,
    faq_json: faq,
    schema_jsonld,
  };
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
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}

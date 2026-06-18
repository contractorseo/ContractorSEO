export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'trial' | 'growth' | 'agency';
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string | null;
  license_number: string | null;
  google_place_id: string | null;
  gbp_connected: boolean;
  gbp_location_name: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  business_id: string;
  type: 'update' | 'offer' | 'event' | 'tip';
  title: string;
  content: string;
  photo_url: string | null;
  scheduled_for: string | null;
  status: 'draft' | 'scheduled' | 'published';
  published_at: string | null;
  gbp_post_name: string | null;
  created_at: string;
}

export interface ReviewRequest {
  id: string;
  business_id: string;
  customer_name: string;
  phone: string;
  job_type: string;
  sent_at: string;
  clicked_at: string | null;
}

export interface Review {
  id: string;
  business_id: string;
  reviewer_name: string;
  rating: number;
  text: string;
  date: string;
  responded: boolean;
  response_text: string | null;
  source: string;
}

export interface Keyword {
  id: string;
  business_id: string;
  keyword: string;
  current_rank: number | null;
  previous_rank: number | null;
  monthly_volume: number | null;
  updated_at: string;
}

export interface Competitor {
  id: string;
  business_id: string;
  name: string;
  monthly_posts: number;
  review_count: number;
  rating: number;
  last_post_date: string | null;
  threat_level: 'low' | 'medium' | 'high';
}

export interface NapListing {
  id: string;
  business_id: string;
  directory_name: string;
  status: 'consistent' | 'inconsistent' | 'missing' | 'unchecked';
  issue: string | null;
  updated_at: string;
}

export interface ReportData {
  business: { name: string; city: string; state: string; category: string } | null;
  napScore: number;
  napListings: number;
  napConsistent: number;
  keywordCount: number;
  top10Keywords: { keyword: string; current_rank: number | null; monthly_volume: number | null }[];
  postsLast30Days: number;
  reviewCount: number;
  avgRating: number;
  generatedAt: string;
}

export interface Article {
  id: string;
  business_id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  body_html: string;
  faq_json: Array<{ question: string; answer: string }> | null;
  schema_jsonld: object | null;
  status: 'draft' | 'scheduled' | 'published';
  scheduled_for: string | null;
  published_at: string | null;
  published_url: string | null;
  cms_target: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleTopic {
  topic: string;
  type: 'cost_guide' | 'how_to' | 'local_guide' | 'faq';
}

export interface ArticleUsage {
  used: number;
  limit: number;
  period: 'monthly' | 'total';
  plan: string;
}

export interface CmsConnection {
  id: string;
  business_id: string;
  type: 'wordpress';
  site_url: string;
  username: string;
  status: 'active' | 'error';
  created_at: string;
}

export type Plan = 'trial' | 'growth' | 'agency';

export interface PlanFeatures {
  postsPerMonth: number;
  locations: number;
  keywords: number;
  reviewRequests: number;
  competitorTracking: boolean;
  agencyReporting: boolean;
}

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  trial: { postsPerMonth: 4, locations: 1, keywords: 10, reviewRequests: 20, competitorTracking: true, agencyReporting: false },
  growth: { postsPerMonth: 16, locations: 1, keywords: 50, reviewRequests: 200, competitorTracking: true, agencyReporting: false },
  agency: { postsPerMonth: 999, locations: 10, keywords: 200, reviewRequests: 2000, competitorTracking: true, agencyReporting: true },
};

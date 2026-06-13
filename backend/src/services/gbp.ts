const OAUTH_URL    = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL    = 'https://oauth2.googleapis.com/token';
const ACCOUNTS_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
const LOCATIONS_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const POSTS_BASE   = 'https://mybusiness.googleapis.com/v4';
const SCOPE        = 'https://www.googleapis.com/auth/business.manage';

// Extract numeric ID from a resource name like "accounts/12345" → "12345"
function resourceId(name: string): string {
  return name.split('/').pop()!;
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope:         SCOPE,
    access_type:   'offline',
    prompt:        'consent', // always return refresh_token
    state,
  });
  return `${OAUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
      grant_type:    'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string }>;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      refresh_token:  refreshToken,
      client_id:      process.env.GOOGLE_CLIENT_ID!,
      client_secret:  process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:     'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export interface GBPAccount {
  name: string;        // "accounts/12345"
  accountName: string; // display name
  type: string;
}

export async function getAccounts(accessToken: string): Promise<GBPAccount[]> {
  const res = await fetch(ACCOUNTS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch GBP accounts');
  const data = await res.json() as { accounts?: GBPAccount[] };
  return data.accounts ?? [];
}

export interface GBPLocation {
  name:  string;  // "accounts/12345/locations/67890"
  title: string;  // business display name
  storefrontAddress?: { addressLines?: string[]; locality?: string };
}

export async function getLocations(accessToken: string, accountName: string): Promise<GBPLocation[]> {
  const res = await fetch(
    `${LOCATIONS_BASE}/${accountName}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error('Failed to fetch GBP locations');
  const data = await res.json() as { locations?: GBPLocation[] };
  return data.locations ?? [];
}

export async function publishLocalPost(opts: {
  refreshToken: string;
  accountName: string;  // "accounts/12345"
  locationName: string; // "accounts/12345/locations/67890"
  title: string;
  content: string;
}): Promise<string> {
  const accessToken = await refreshAccessToken(opts.refreshToken);

  const accountId  = resourceId(opts.accountName);
  const locationId = resourceId(opts.locationName);

  const res = await fetch(
    `${POSTS_BASE}/accounts/${accountId}/locations/${locationId}/localPosts`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        languageCode: 'en-US',
        summary:      `${opts.title}\n\n${opts.content}`,
        topicType:    'STANDARD',
      }),
    }
  );

  if (!res.ok) throw new Error(`GBP publish failed: ${await res.text()}`);
  const data = await res.json() as { name: string };
  return data.name; // e.g. "accounts/12345/locations/67890/localPosts/abcde"
}

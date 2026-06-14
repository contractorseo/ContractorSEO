const PLACES_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

export interface PlaceResult {
  name: string;
  rating: number;
  review_count: number;
  vicinity: string;
  place_id: string;
  threat_level: 'low' | 'medium' | 'high';
}

function threatLevel(rating: number, reviews: number): 'low' | 'medium' | 'high' {
  if (rating >= 4.5 && reviews >= 100) return 'high';
  if (rating < 4.0 || reviews < 20) return 'low';
  return 'medium';
}

export async function searchNearbyCompetitors(
  category: string,
  city: string,
  state: string,
  ownName: string,
): Promise<PlaceResult[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY not configured');

  const query = `${category} in ${city}, ${state}`;
  const url = `${PLACES_URL}?query=${encodeURIComponent(query)}&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places API error: ${res.status} ${await res.text()}`);

  const data = await res.json() as {
    status: string;
    results: {
      name: string;
      rating?: number;
      user_ratings_total?: number;
      vicinity?: string;
      place_id: string;
      business_status?: string;
    }[];
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API status: ${data.status}`);
  }

  const ownLower = ownName.toLowerCase();

  return (data.results ?? [])
    .filter((p) =>
      p.business_status !== 'CLOSED_PERMANENTLY' &&
      !p.name.toLowerCase().includes(ownLower) &&
      !ownLower.includes(p.name.toLowerCase()),
    )
    .slice(0, 10)
    .map((p) => ({
      name: p.name,
      rating: p.rating ?? 0,
      review_count: p.user_ratings_total ?? 0,
      vicinity: p.vicinity ?? '',
      place_id: p.place_id,
      threat_level: threatLevel(p.rating ?? 0, p.user_ratings_total ?? 0),
    }));
}

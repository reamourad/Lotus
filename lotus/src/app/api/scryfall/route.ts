import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache to reduce API calls
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // Scryfall recommends 50-100ms between requests

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cardName = searchParams.get('cardName');
  const set = searchParams.get('set');

  if (!cardName || !set) {
    return NextResponse.json(
      { error: 'Missing cardName or set parameter' },
      { status: 400 }
    );
  }

  // Check cache first
  const cacheKey = `${cardName}-${set}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  // Rate limiting: ensure minimum interval between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  try {
    // Retry logic for rate limiting
    let retries = 3;
    let scryfallResponse;

    while (retries > 0) {
      scryfallResponse = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      // If rate limited, wait and retry
      if (scryfallResponse.status === 429) {
        retries--;
        if (retries > 0) {
          const retryAfter = scryfallResponse.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
          await delay(waitTime);
          continue;
        }
      }

      break;
    }

    if (!scryfallResponse || !scryfallResponse.ok) {
      return NextResponse.json(
        { error: `Scryfall API error: ${scryfallResponse?.status}` },
        { status: scryfallResponse?.status || 500 }
      );
    }

    const data = await scryfallResponse.json();

    // Cache the result
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Scryfall:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card data' },
      { status: 500 }
    );
  }
}

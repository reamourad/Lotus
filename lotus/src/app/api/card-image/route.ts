import { NextRequest, NextResponse } from 'next/server';

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // Scryfall recommends 50-100ms between requests

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cardName = searchParams.get('cardName');
  const version = searchParams.get('version') || 'png';

  if (!cardName) {
    return NextResponse.json(
      { error: 'Missing cardName parameter' },
      { status: 400 }
    );
  }

  // Rate limiting: ensure minimum interval between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  try {
    // Fetch from Scryfall's image redirect endpoint
    const scryfallUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=${version}`;

    // Retry logic for rate limiting
    let retries = 3;
    let response;

    while (retries > 0) {
      response = await fetch(scryfallUrl);

      // If rate limited, wait and retry
      if (response.status === 429) {
        retries--;
        if (retries > 0) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
          await delay(waitTime);
          continue;
        }
      }

      break;
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        { error: `Scryfall API error: ${response?.status}` },
        { status: response?.status || 500 }
      );
    }

    // Get the image data
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Error fetching card image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card image' },
      { status: 500 }
    );
  }
}

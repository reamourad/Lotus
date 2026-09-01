import { NextResponse } from 'next/server';

// This handler takes no request-derived input, so Next.js's App Router
// treats it as statically cacheable by default and Vercel's CDN will keep
// serving one snapshot indefinitely — exactly the set list going stale
// (missing newly-added sets) that broke this earlier. Force it dynamic so
// every request actually re-fetches the backend.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('https://mourad-rea--mtg-draft-serving-fastapi-app.modal.run/sets', { cache: 'no-store' });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch sets: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sets' },
      { status: 500 }
    );
  }
}

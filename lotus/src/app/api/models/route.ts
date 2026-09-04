import { NextResponse } from 'next/server';

// Same reasoning as the /api/sets proxy: this takes no request-derived input,
// so Next.js would treat it as statically cacheable and the CDN would keep
// serving one snapshot after a new model is trained. Force it dynamic.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('https://mourad-rea--mtg-draft-serving-fastapi-app.modal.run/models', { cache: 'no-store' });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch models: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

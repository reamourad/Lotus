import { NextRequest, NextResponse } from 'next/server';

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

  try {
    const scryfallResponse = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!scryfallResponse.ok) {
      return NextResponse.json(
        { error: `Scryfall API error: ${scryfallResponse.status}` },
        { status: scryfallResponse.status }
      );
    }

    const data = await scryfallResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Scryfall:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card data' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '../../play/utils/constants';

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
    const response = await fetch(
      `${API_BASE_URL}/scryfall?cardName=${encodeURIComponent(cardName)}&set=${encodeURIComponent(set)}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Scryfall API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Scryfall:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card data' },
      { status: 500 }
    );
  }
}

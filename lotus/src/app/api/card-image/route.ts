import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '../../play/utils/constants';

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

  try {
    const response = await fetch(
      `${API_BASE_URL}/card-image?cardName=${encodeURIComponent(cardName)}&version=${version}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Scryfall API error: ${response.status}` },
        { status: response.status }
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

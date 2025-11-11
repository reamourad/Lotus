import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const response = await fetch(
      `https://mtgdraftassistant.onrender.com/sets/${code}/icon`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch icon: ${response.status}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/svg+xml';

    // Return the image with proper headers
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Error fetching set icon:', error);
    return NextResponse.json(
      { error: 'Failed to fetch set icon' },
      { status: 500 }
    );
  }
}

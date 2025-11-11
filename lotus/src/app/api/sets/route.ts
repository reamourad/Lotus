import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://mtgdraftassistant.onrender.com/sets');

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

import { NextRequest, NextResponse } from 'next/server';
import { getPlaceDetails } from '@/lib/location/google-maps';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');

  if (!placeId) {
    return NextResponse.json(
      { error: 'placeId parameter required' },
      { status: 400 }
    );
  }

  try {
    const coordinates = await getPlaceDetails(placeId);

    if (!coordinates) {
      return NextResponse.json(
        { error: 'Unable to fetch place details' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      lat: coordinates.lat,
      lng: coordinates.lng
    });
  } catch (error) {
    console.error('Place details API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch place details' },
      { status: 500 }
    );
  }
}

// Temporarily paused until authenticated access and spending controls are in place.
// Do not initialize a provider client or read image data on this public endpoint.
export async function POST() {
  return Response.json(
    { error: 'Photo analysis is temporarily unavailable. Use barcode lookup, food search or manual entry.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

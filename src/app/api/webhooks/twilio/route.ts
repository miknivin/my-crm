import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Get the raw body as text
    const rawBody = await req.text();
    // Parse URL-encoded form data
    const body = Object.fromEntries(new URLSearchParams(rawBody));

    // Log request details
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      body: body,
    });

    return NextResponse.json({ message: 'Request logged successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Log request details
  console.log({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  return NextResponse.json({ message: 'Request logged successfully' }, { status: 200 });
}
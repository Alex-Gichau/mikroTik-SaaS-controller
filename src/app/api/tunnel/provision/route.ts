import { NextResponse } from 'next/server';
import { provisionRouter } from '@/lib/tunnel';

export async function POST(request: Request) {
  try {
    const { orgId, routerName } = await request.json();

    if (!orgId || !routerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const script = await provisionRouter(orgId, routerName);

    return NextResponse.json({ script });
  } catch (error: any) {
    console.error('Provisioning error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

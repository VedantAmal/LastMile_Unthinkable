import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const configs = await prisma.globalConfig.findMany();
  return NextResponse.json({ configs });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { key, value } = await req.json();
    if (!key || !value) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const config = await prisma.globalConfig.upsert({
      where: { key },
      update: { value: value.toString() },
      create: { key, value: value.toString() },
    });

    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

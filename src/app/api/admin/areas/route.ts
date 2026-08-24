import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, zoneId } = await req.json();
    if (!name || !zoneId) return NextResponse.json({ error: 'Name and zoneId are required' }, { status: 400 });

    const area = await prisma.area.create({ data: { name, zoneId } });
    return NextResponse.json({ area });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

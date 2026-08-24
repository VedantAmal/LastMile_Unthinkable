import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rates = await prisma.rateCard.findMany();
  return NextResponse.json({ rates });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orderType, zoneType, baseRate, perKgRate } = await req.json();
    if (!orderType || !zoneType || baseRate === undefined || perKgRate === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const rateCard = await prisma.rateCard.upsert({
      where: { orderType_zoneType: { orderType, zoneType } },
      update: { baseRate: parseFloat(baseRate), perKgRate: parseFloat(perKgRate) },
      create: { orderType, zoneType, baseRate: parseFloat(baseRate), perKgRate: parseFloat(perKgRate) },
    });

    return NextResponse.json({ rateCard });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

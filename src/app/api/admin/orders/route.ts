import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await prisma.order.findMany({
    include: {
      customer: { select: { name: true, email: true } },
      agent: { select: { name: true } },
      pickupZone: true,
      dropZone: true,
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return NextResponse.json({ orders });
}

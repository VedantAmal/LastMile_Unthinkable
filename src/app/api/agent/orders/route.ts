import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'AGENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { assignedAgentId: session.id },
    include: { pickupZone: true, dropZone: true },
    orderBy: { createdAt: 'desc' },
  });
  
  return NextResponse.json({ orders });
}

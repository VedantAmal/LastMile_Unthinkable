import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      pickupZone: true, dropZone: true,
      agent: { select: { name: true, email: true } },
      customer: { select: { name: true, email: true } },
      history: {
        include: { actor: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only allow if admin, agent assigned to it, or customer who owns it
  if (session.role === 'CUSTOMER' && order.customerId !== session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'AGENT' && order.assignedAgentId !== session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ order });
}

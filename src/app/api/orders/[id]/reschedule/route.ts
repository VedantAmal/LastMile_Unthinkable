import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CUSTOMER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.customerId !== session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  if (order.status !== 'FAILED') return NextResponse.json({ error: 'Only failed orders can be rescheduled' }, { status: 400 });

  try {
    const { newDate } = await req.json();
    if (!newDate) return NextResponse.json({ error: 'newDate is required' }, { status: 400 });

    const rescheduledOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: 'PENDING', assignedAgentId: null } // reset agent assignment
      });

      await tx.reschedule.create({
        data: { orderId: id, newDate: new Date(newDate) }
      });

      await tx.trackingHistory.create({
        data: { orderId: id, status: 'RESCHEDULED', actorId: session.id }
      });
      
      return updated;
    });

    return NextResponse.json({ order: rescheduledOrder });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

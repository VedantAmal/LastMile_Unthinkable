import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  
  try {
    const { agentId } = await req.json();
    
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { assignedAgentId: agentId, status: 'ASSIGNED' }
      });

      await tx.trackingHistory.create({
        data: { orderId: id, status: 'ASSIGNED', actorId: session.id }
      });

      return updated;
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'CUSTOMER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { customerId: session.id },
    include: { pickupZone: true, dropZone: true },
    orderBy: { createdAt: 'desc' },
  });
  
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== 'CUSTOMER' && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { 
      pickupAddress, dropAddress, pickupZoneId, dropZoneId, 
      length, breadth, height, actualWeight, 
      orderType, paymentType 
    } = data;

    // Validate
    if (!pickupAddress || !dropAddress || !pickupZoneId || !dropZoneId || !length || !breadth || !height || !actualWeight || !orderType || !paymentType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Calculations
    const volumetricWeight = (length * breadth * height) / 5000;
    const billableWeight = Math.max(actualWeight, volumetricWeight);
    const zoneType = pickupZoneId === dropZoneId ? 'INTRA' : 'INTER';

    // Get Rate Card
    const rateCard = await prisma.rateCard.findUnique({
      where: { orderType_zoneType: { orderType, zoneType } }
    });

    if (!rateCard) {
      return NextResponse.json({ error: `No rate card found for ${orderType} - ${zoneType}` }, { status: 400 });
    }

    let zoneCharge = rateCard.baseRate;
    if (billableWeight > 1) {
      zoneCharge += rateCard.perKgRate * Math.ceil(billableWeight - 1);
    }

    let codSurcharge = 0;
    if (paymentType === 'COD') {
      const config = await prisma.globalConfig.findUnique({ where: { key: `COD_SURCHARGE_${orderType}` } });
      codSurcharge = config ? parseFloat(config.value) : 50; // default 50
    }

    const totalCharge = zoneCharge + codSurcharge;

    // Auto-assignment logic (Dummy: assign to first available agent, or leave pending)
    const agent = await prisma.user.findFirst({ where: { role: 'AGENT' } });

    const order = await prisma.order.create({
      data: {
        customerId: session.id, // Admin creating for customer needs a customerId dropdown, but simplified here
        pickupAddress,
        dropAddress,
        pickupZoneId,
        dropZoneId,
        length, breadth, height, actualWeight, volumetricWeight, billableWeight,
        orderType, paymentType,
        zoneCharge, codSurcharge, totalCharge,
        status: agent ? 'ASSIGNED' : 'PENDING',
        assignedAgentId: agent ? agent.id : null,
        history: {
          create: { status: agent ? 'ASSIGNED' : 'PENDING', actorId: session.id }
        }
      }
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

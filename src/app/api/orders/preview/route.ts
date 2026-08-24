import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { pickupZoneId, dropZoneId, length, breadth, height, actualWeight, orderType, paymentType } = await req.json();

    if (!pickupZoneId || !dropZoneId || !length || !breadth || !height || !actualWeight || !orderType || !paymentType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const volumetricWeight = (length * breadth * height) / 5000;
    const billableWeight = Math.max(actualWeight, volumetricWeight);
    const zoneType = pickupZoneId === dropZoneId ? 'INTRA' : 'INTER';

    const rateCard = await prisma.rateCard.findUnique({
      where: { orderType_zoneType: { orderType, zoneType } },
    });

    if (!rateCard) {
      return NextResponse.json({ error: `No rate card for ${orderType} - ${zoneType}` }, { status: 400 });
    }

    let zone = rateCard.baseRate;
    if (billableWeight > 1) {
      zone += rateCard.perKgRate * Math.ceil(billableWeight - 1);
    }

    let cod = 0;
    if (paymentType === 'COD') {
      const config = await prisma.globalConfig.findUnique({ where: { key: `COD_SURCHARGE_${orderType}` } });
      cod = config ? parseFloat(config.value) : 50;
    }

    return NextResponse.json({ zone, cod, total: zone + cod, volumetricWeight, billableWeight });
  } catch {
    return NextResponse.json({ error: 'Calculation error' }, { status: 500 });
  }
}

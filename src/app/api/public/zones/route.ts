import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const zones = await prisma.zone.findMany({ select: { id: true, name: true } });
  return NextResponse.json({ zones });
}

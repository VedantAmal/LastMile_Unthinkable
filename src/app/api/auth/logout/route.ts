import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const response = NextResponse.json({ message: 'Logout successful' });
  
  // Await the cookies object before calling set
  const cookieStore = await cookies();
  cookieStore.set('auth-token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}

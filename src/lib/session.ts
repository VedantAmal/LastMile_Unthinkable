import { cookies } from 'next/headers';
import { verifyJwt } from './auth';

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    return null;
  }

  const payload = verifyJwt(token);
  return payload as { id: string; email: string; role: string; name: string } | null;
}

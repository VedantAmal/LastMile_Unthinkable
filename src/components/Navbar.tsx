'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar({ role }: { role: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link href="/" className="navbar-brand">
          <span className="brand-icon">📦</span>
          <span className="brand-text">DeliverX</span>
        </Link>
        <div className="nav-links">
          {role === 'CUSTOMER' && <Link href="/dashboard" className="nav-link">My Orders</Link>}
          {role === 'AGENT' && <Link href="/agent" className="nav-link">Deliveries</Link>}
          {role === 'ADMIN' && <Link href="/admin" className="nav-link">Dashboard</Link>}
          <button onClick={handleLogout} className="btn btn-ghost btn-sm">Logout</button>
        </div>
      </div>
    </nav>
  );
}

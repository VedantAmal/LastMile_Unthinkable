import Link from 'next/link';

export default function Home() {
  return (
    <div className="auth-wrapper" style={{ flexDirection: 'column', gap: '32px' }}>
      <div style={{ textAlign: 'center' }} className="animate-slide-up">
        <div style={{
          fontSize: '3rem',
          marginBottom: '16px',
        }}>📦</div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '12px' }}>DeliverX</h1>
        <p style={{ fontSize: '1.125rem', maxWidth: '480px', margin: '0 auto', color: 'var(--text-secondary)' }}>
          Premium last-mile delivery management. Track, manage, and optimize your shipments.
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/login" className="btn btn-primary">Sign In</Link>
          <Link href="/register" className="btn btn-outline">Create Account</Link>
        </div>
      </div>
    </div>
  );
}

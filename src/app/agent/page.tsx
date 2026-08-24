'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';

interface Order {
  id: string; status: string; orderType: string; paymentType: string;
  pickupAddress: string; dropAddress: string; totalCharge: number;
  createdAt: string;
  pickupZone?: { name: string }; dropZone?: { name: string };
  customer?: { name: string };
}

const STATUS_FLOW: Record<string, { next: string; label: string; style?: string }[]> = {
  ASSIGNED: [{ next: 'PICKED_UP', label: 'Mark Picked Up' }],
  PICKED_UP: [{ next: 'IN_TRANSIT', label: 'Start Transit' }],
  IN_TRANSIT: [{ next: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' }],
  OUT_FOR_DELIVERY: [
    { next: 'DELIVERED', label: 'Delivered ✓' },
    { next: 'FAILED', label: 'Failed ✗', style: 'danger' },
  ],
};

export default function AgentDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/agent/orders');
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (id: string, newStatus: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchOrders();
    else alert('Failed to update status');
  };

  const activeOrders = orders.filter((o) => !['DELIVERED', 'FAILED'].includes(o.status));
  const completedOrders = orders.filter((o) => ['DELIVERED', 'FAILED'].includes(o.status));

  return (
    <div className="page-wrapper">
      <Navbar role="AGENT" />
      <div className="container mt-8 animate-fade-in">
        <h1 className="mb-6">My Deliveries</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card">
            <span className="stat-value">{orders.length}</span>
            <span className="stat-label">Total Assigned</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: 'var(--accent-blue)' }}>{activeOrders.length}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{completedOrders.length}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>

        {loading ? (
          <p>Loading deliveries...</p>
        ) : (
          <>
            {/* Active Deliveries */}
            {activeOrders.length > 0 && (
              <div className="glass-panel mb-6">
                <h3 className="section-title">Active Deliveries</h3>
                <div className="grid grid-cols-2 gap-4">
                  {activeOrders.map((order) => (
                    <div key={order.id} className="card">
                      <div className="flex justify-between items-center mb-3">
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                          #{order.id.slice(0, 8)}
                        </strong>
                        <span className={`badge badge-${order.status.toLowerCase().replace(/_/g, '-')}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex-col gap-1" style={{ fontSize: '0.8125rem' }}>
                        <div className="flex gap-2">
                          <span style={{ color: 'var(--text-tertiary)', minWidth: '50px' }}>From</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{order.pickupAddress} ({order.pickupZone?.name})</span>
                        </div>
                        <div className="flex gap-2">
                          <span style={{ color: 'var(--text-tertiary)', minWidth: '50px' }}>To</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{order.dropAddress} ({order.dropZone?.name})</span>
                        </div>
                        {order.paymentType === 'COD' && (
                          <div className="flex gap-2 mt-1">
                            <span className="badge badge-pending" style={{ fontSize: '0.6875rem' }}>COD — ₹{order.totalCharge}</span>
                          </div>
                        )}
                      </div>

                      <div className="divider" />

                      <div className="flex gap-2">
                        {STATUS_FLOW[order.status]?.map((action) => (
                          <button
                            key={action.next}
                            onClick={() => updateStatus(order.id, action.next)}
                            className={`btn ${action.style === 'danger' ? 'btn-danger' : action.next === 'DELIVERED' ? 'btn-success' : 'btn-outline'} btn-sm`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedOrders.length > 0 && (
              <div className="glass-panel">
                <h3 className="section-title">Completed</h3>
                <div className="grid grid-cols-2 gap-4">
                  {completedOrders.map((order) => (
                    <div key={order.id} className="card" style={{ opacity: 0.7 }}>
                      <div className="flex justify-between items-center">
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>#{order.id.slice(0, 8)}</strong>
                        <span className={`badge badge-${order.status.toLowerCase().replace(/_/g, '-')}`}>{order.status}</span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', margin: '4px 0 0 0' }}>
                        {order.pickupZone?.name} → {order.dropZone?.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orders.length === 0 && (
              <div className="glass-panel">
                <div className="empty-state">
                  <div className="empty-state-icon">🚚</div>
                  <p>No deliveries assigned to you yet.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

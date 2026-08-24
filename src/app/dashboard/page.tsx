'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';

interface Zone { id: string; name: string; }
interface Order {
  id: string; status: string; orderType: string; paymentType: string;
  pickupAddress: string; dropAddress: string; totalCharge: number;
  zoneCharge: number; codSurcharge: number; volumetricWeight: number;
  billableWeight: number; actualWeight: number; length: number;
  breadth: number; height: number; createdAt: string;
  pickupZone?: Zone; dropZone?: Zone;
  history?: { id: string; status: string; createdAt: string; actor: { name: string; role: string } }[];
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form State
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [pickupZoneId, setPickupZoneId] = useState('');
  const [dropZoneId, setDropZoneId] = useState('');
  const [length, setLength] = useState('');
  const [breadth, setBreadth] = useState('');
  const [height, setHeight] = useState('');
  const [actualWeight, setActualWeight] = useState('');
  const [orderType, setOrderType] = useState('B2C');
  const [paymentType, setPaymentType] = useState('PREPAID');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Charge preview
  const [chargePreview, setChargePreview] = useState<{ zone: number; cod: number; total: number } | null>(null);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
    setLoading(false);
  }, []);

  const fetchZones = useCallback(async () => {
    const res = await fetch('/api/public/zones');
    if (res.ok) {
      const data = await res.json();
      setZones(data.zones);
      if (data.zones.length > 0) {
        setPickupZoneId(data.zones[0].id);
        setDropZoneId(data.zones[0].id);
      }
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchZones();
  }, [fetchOrders, fetchZones]);

  // Charge preview calculation
  useEffect(() => {
    const fetchCharge = async () => {
      if (!length || !breadth || !height || !actualWeight || !pickupZoneId || !dropZoneId) {
        setChargePreview(null);
        return;
      }
      try {
        const res = await fetch('/api/orders/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pickupZoneId, dropZoneId,
            length: parseFloat(length), breadth: parseFloat(breadth),
            height: parseFloat(height), actualWeight: parseFloat(actualWeight),
            orderType, paymentType,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setChargePreview(data);
        } else {
          setChargePreview(null);
        }
      } catch {
        setChargePreview(null);
      }
    };
    const timeout = setTimeout(fetchCharge, 300);
    return () => clearTimeout(timeout);
  }, [length, breadth, height, actualWeight, pickupZoneId, dropZoneId, orderType, paymentType]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickupAddress, dropAddress, pickupZoneId, dropZoneId,
        length: parseFloat(length), breadth: parseFloat(breadth),
        height: parseFloat(height), actualWeight: parseFloat(actualWeight),
        orderType, paymentType,
      }),
    });

    if (res.ok) {
      setSuccess('Order placed successfully!');
      setPickupAddress(''); setDropAddress(''); setLength(''); setBreadth('');
      setHeight(''); setActualWeight(''); setChargePreview(null);
      fetchOrders();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create order');
    }
    setSubmitting(false);
  };

  const handleReschedule = async (id: string) => {
    const date = prompt('Enter new delivery date (YYYY-MM-DD):');
    if (!date) return;

    const res = await fetch(`/api/orders/${id}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newDate: date }),
    });

    if (res.ok) {
      fetchOrders();
    } else {
      alert('Failed to reschedule');
    }
  };

  const viewOrderDetail = async (id: string) => {
    const res = await fetch(`/api/orders/${id}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedOrder(data.order);
    }
  };

  const stats = {
    total: orders.length,
    active: orders.filter((o) => !['DELIVERED', 'FAILED'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
  };

  return (
    <div className="page-wrapper">
      <Navbar role="CUSTOMER" />
      <div className="container mt-8 animate-fade-in">
        <h1 className="mb-6">My Dashboard</h1>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card stagger-1 animate-slide-up">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Orders</span>
          </div>
          <div className="stat-card stagger-2 animate-slide-up">
            <span className="stat-value" style={{ color: 'var(--accent-blue)' }}>{stats.active}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-card stagger-3 animate-slide-up">
            <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{stats.delivered}</span>
            <span className="stat-label">Delivered</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Create Order Form */}
          <div className="glass-panel">
            <h3 className="section-title">New Shipment</h3>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleCreateOrder} className="flex-col gap-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Pickup Address</label>
                  <input type="text" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className="input-field" placeholder="123 Main St" required />
                </div>
                <div className="input-group">
                  <label className="input-label">Drop Address</label>
                  <input type="text" value={dropAddress} onChange={(e) => setDropAddress(e.target.value)} className="input-field" placeholder="456 Oak Ave" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Pickup Zone</label>
                  <select value={pickupZoneId} onChange={(e) => setPickupZoneId(e.target.value)} className="input-field">
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Drop Zone</label>
                  <select value={dropZoneId} onChange={(e) => setDropZoneId(e.target.value)} className="input-field">
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="input-group">
                  <label className="input-label">L (cm)</label>
                  <input type="number" step="0.1" value={length} onChange={(e) => setLength(e.target.value)} className="input-field" required />
                </div>
                <div className="input-group">
                  <label className="input-label">B (cm)</label>
                  <input type="number" step="0.1" value={breadth} onChange={(e) => setBreadth(e.target.value)} className="input-field" required />
                </div>
                <div className="input-group">
                  <label className="input-label">H (cm)</label>
                  <input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} className="input-field" required />
                </div>
                <div className="input-group">
                  <label className="input-label">Wt (kg)</label>
                  <input type="number" step="0.1" value={actualWeight} onChange={(e) => setActualWeight(e.target.value)} className="input-field" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Order Type</label>
                  <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="input-field">
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Payment</label>
                  <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="input-field">
                    <option value="PREPAID">Prepaid</option>
                    <option value="COD">Cash on Delivery</option>
                  </select>
                </div>
              </div>

              {/* Charge preview */}
              {chargePreview && (
                <div className="charge-preview">
                  <div className="charge-row">
                    <span>Zone Charge</span>
                    <span className="charge-value">₹{chargePreview.zone.toFixed(2)}</span>
                  </div>
                  {chargePreview.cod > 0 && (
                    <div className="charge-row">
                      <span>COD Surcharge</span>
                      <span className="charge-value">₹{chargePreview.cod.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="charge-row total">
                    <span>Total</span>
                    <span className="charge-value">₹{chargePreview.total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary mt-2" disabled={submitting}>
                {submitting ? 'Placing Order...' : 'Place Order'}
              </button>
            </form>
          </div>

          {/* Orders List */}
          <div className="glass-panel" style={{ overflowY: 'auto', maxHeight: '85vh' }}>
            <h3 className="section-title">Order History</h3>
            {loading ? (
              <p>Loading...</p>
            ) : orders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p>No orders yet. Create your first shipment!</p>
              </div>
            ) : (
              <div className="flex-col gap-3">
                {orders.map((order) => (
                  <div key={order.id} className="card" onClick={() => viewOrderDetail(order.id)} style={{ cursor: 'pointer' }}>
                    <div className="flex justify-between items-center mb-2">
                      <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        #{order.id.slice(0, 8)}
                      </strong>
                      <span className={`badge badge-${order.status.toLowerCase().replace(/_/g, '-')}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', margin: 0 }}>
                      {order.pickupZone?.name} → {order.dropZone?.name}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '1rem' }}>
                        ₹{order.totalCharge}
                      </span>
                      {order.status === 'FAILED' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReschedule(order.id); }}
                          className="btn btn-outline btn-xs"
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem' }}>Order #{selectedOrder.id.slice(0, 8)}</h2>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className={`badge badge-${selectedOrder.status.toLowerCase().replace(/_/g, '-')}`}>
                {selectedOrder.status.replace(/_/g, ' ')}
              </span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                {new Date(selectedOrder.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="divider" />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Pickup</p>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', margin: 0 }}>{selectedOrder.pickupAddress}</p>
                <p style={{ fontSize: '0.75rem', margin: 0 }}>{selectedOrder.pickupZone?.name}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Drop</p>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', margin: 0 }}>{selectedOrder.dropAddress}</p>
                <p style={{ fontSize: '0.75rem', margin: 0 }}>{selectedOrder.dropZone?.name}</p>
              </div>
            </div>

            <div className="charge-preview mb-4">
              <div className="charge-row">
                <span>Dimensions</span>
                <span style={{ color: 'var(--text-primary)' }}>{selectedOrder.length}×{selectedOrder.breadth}×{selectedOrder.height} cm</span>
              </div>
              <div className="charge-row">
                <span>Actual / Vol. / Billable Weight</span>
                <span style={{ color: 'var(--text-primary)' }}>{selectedOrder.actualWeight} / {selectedOrder.volumetricWeight.toFixed(2)} / {selectedOrder.billableWeight.toFixed(2)} kg</span>
              </div>
              <div className="charge-row">
                <span>Zone Charge</span>
                <span className="charge-value">₹{selectedOrder.zoneCharge}</span>
              </div>
              {selectedOrder.codSurcharge > 0 && (
                <div className="charge-row">
                  <span>COD Surcharge</span>
                  <span className="charge-value">₹{selectedOrder.codSurcharge}</span>
                </div>
              )}
              <div className="charge-row total">
                <span>Total</span>
                <span className="charge-value">₹{selectedOrder.totalCharge}</span>
              </div>
            </div>

            {/* Tracking Timeline */}
            {selectedOrder.history && selectedOrder.history.length > 0 && (
              <>
                <h3 className="section-title">Tracking Timeline</h3>
                <div className="timeline">
                  {selectedOrder.history.map((h) => (
                    <div key={h.id} className="timeline-item">
                      <div className="timeline-status">{h.status.replace(/_/g, ' ')}</div>
                      <div className="timeline-meta">
                        by {h.actor.name} ({h.actor.role}) · {new Date(h.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

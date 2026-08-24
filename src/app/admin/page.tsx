'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';

interface Agent { id: string; name: string; email: string; }
interface Zone { id: string; name: string; areas: { id: string; name: string }[]; }
interface RateCard { id: string; orderType: string; zoneType: string; baseRate: number; perKgRate: number; }
interface Order {
  id: string; status: string; orderType: string; paymentType: string;
  totalCharge: number; billableWeight: number; createdAt: string;
  customer?: { name: string; email: string };
  agent?: { name: string };
  pickupZone?: { id: string; name: string };
  dropZone?: { id: string; name: string };
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [rates, setRates] = useState<RateCard[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'zones' | 'rates' | 'config'>('orders');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Rate config form state
  const [rateOrderType, setRateOrderType] = useState('B2C');
  const [rateZoneType, setRateZoneType] = useState('INTRA');
  const [baseRate, setBaseRate] = useState('');
  const [perKgRate, setPerKgRate] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaZoneId, setNewAreaZoneId] = useState('');

  // COD Surcharge config
  const [codB2C, setCodB2C] = useState('');
  const [codB2B, setCodB2B] = useState('');

  const fetchData = useCallback(async () => {
    const [ordRes, agtRes, znRes, rtRes, cfgRes] = await Promise.all([
      fetch('/api/admin/orders'),
      fetch('/api/admin/agents'),
      fetch('/api/admin/zones'),
      fetch('/api/admin/rates'),
      fetch('/api/admin/config'),
    ]);

    if (ordRes.ok) { const d = await ordRes.json(); setOrders(d.orders); }
    if (agtRes.ok) { const d = await agtRes.json(); setAgents(d.agents); }
    if (znRes.ok) {
      const d = await znRes.json();
      setZones(d.zones);
      if (d.zones.length > 0 && !newAreaZoneId) setNewAreaZoneId(d.zones[0].id);
    }
    if (rtRes.ok) { const d = await rtRes.json(); setRates(d.rates); }
    if (cfgRes.ok) {
      const d = await cfgRes.json();
      const b2c = d.configs.find((c: { key: string }) => c.key === 'COD_SURCHARGE_B2C');
      const b2b = d.configs.find((c: { key: string }) => c.key === 'COD_SURCHARGE_B2B');
      if (b2c) setCodB2C(b2c.value);
      if (b2b) setCodB2B(b2b.value);
    }
  }, [newAreaZoneId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async (orderId: string, agentId: string) => {
    if (!agentId) return;
    await fetch(`/api/admin/orders/${orderId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
    fetchData();
  };

  const handleOverrideStatus = async (orderId: string, status: string) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newZone }),
    });
    setNewZone('');
    fetchData();
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newAreaName, zoneId: newAreaZoneId }),
    });
    setNewAreaName('');
    fetchData();
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderType: rateOrderType, zoneType: rateZoneType, baseRate, perKgRate }),
    });
    setBaseRate('');
    setPerKgRate('');
    fetchData();
  };

  const handleSaveCOD = async (e: React.FormEvent) => {
    e.preventDefault();
    await Promise.all([
      fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'COD_SURCHARGE_B2C', value: codB2C }) }),
      fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'COD_SURCHARGE_B2B', value: codB2B }) }),
    ]);
    fetchData();
  };

  const filteredOrders = statusFilter === 'ALL' ? orders : orders.filter((o) => o.status === statusFilter);
  const statuses = ['ALL', 'PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'PENDING').length,
    active: orders.filter((o) => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
  };

  return (
    <div className="page-wrapper">
      <Navbar role="ADMIN" />
      <div className="container mt-8 animate-fade-in">
        <h1 className="mb-6">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stat-card"><span className="stat-value">{stats.total}</span><span className="stat-label">Total Orders</span></div>
          <div className="stat-card"><span className="stat-value" style={{ color: 'var(--accent-amber)' }}>{stats.pending}</span><span className="stat-label">Pending</span></div>
          <div className="stat-card"><span className="stat-value" style={{ color: 'var(--accent-blue)' }}>{stats.active}</span><span className="stat-label">Active</span></div>
          <div className="stat-card"><span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{stats.delivered}</span><span className="stat-label">Delivered</span></div>
        </div>

        {/* Tabs */}
        <div className="filter-bar mb-6">
          {(['orders', 'zones', 'rates', 'config'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`filter-chip ${activeTab === tab ? 'active' : ''}`}>
              {tab === 'orders' ? '📦 Orders' : tab === 'zones' ? '🗺️ Zones & Areas' : tab === 'rates' ? '💰 Rate Cards' : '⚙️ COD Config'}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="glass-panel">
            <div className="flex justify-between items-center mb-4">
              <h3 className="section-title" style={{ marginBottom: 0 }}>All Orders</h3>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Status Filter */}
            <div className="filter-bar">
              {statuses.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`filter-chip ${statusFilter === s ? 'active' : ''}`}>
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Route</th>
                    <th>Type</th>
                    <th>Charge</th>
                    <th>Status</th>
                    <th>Agent</th>
                    <th>Override</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>#{o.id.slice(0, 8)}</td>
                      <td>{o.customer?.name}</td>
                      <td>{o.pickupZone?.name} → {o.dropZone?.name}</td>
                      <td>{o.orderType} / {o.paymentType}</td>
                      <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>₹{o.totalCharge}</td>
                      <td><span className={`badge badge-${o.status.toLowerCase().replace(/_/g, '-')}`}>{o.status.replace(/_/g, ' ')}</span></td>
                      <td>
                        {o.status === 'PENDING' ? (
                          <select onChange={(e) => handleAssign(o.id, e.target.value)} className="input-field" style={{ padding: '4px 8px', fontSize: '0.75rem' }} defaultValue="">
                            <option value="" disabled>Assign...</option>
                            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.8125rem' }}>{o.agent?.name || '—'}</span>
                        )}
                      </td>
                      <td>
                        <select
                          onChange={(e) => handleOverrideStatus(o.id, e.target.value)}
                          className="input-field"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          defaultValue=""
                        >
                          <option value="" disabled>Override...</option>
                          {['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'].map((s) => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 && (
                <div className="empty-state"><p>No orders match this filter.</p></div>
              )}
            </div>
          </div>
        )}

        {/* Zones Tab */}
        {activeTab === 'zones' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="glass-panel">
              <h3 className="section-title">Add Zone</h3>
              <form onSubmit={handleAddZone} className="flex gap-2">
                <input type="text" value={newZone} onChange={(e) => setNewZone(e.target.value)} className="input-field w-full" placeholder="e.g. North Delhi" required />
                <button type="submit" className="btn btn-primary">Add</button>
              </form>

              <div className="divider" />
              <h3 className="section-title">Add Area to Zone</h3>
              <form onSubmit={handleAddArea} className="flex-col gap-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Zone</label>
                    <select value={newAreaZoneId} onChange={(e) => setNewAreaZoneId(e.target.value)} className="input-field">
                      {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Area Name</label>
                    <input type="text" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} className="input-field" placeholder="e.g. Connaught Place" required />
                  </div>
                </div>
                <button type="submit" className="btn btn-outline">Add Area</button>
              </form>
            </div>

            <div className="glass-panel">
              <h3 className="section-title">Current Zones & Areas</h3>
              {zones.length === 0 ? (
                <div className="empty-state"><p>No zones created yet.</p></div>
              ) : (
                <div className="flex-col gap-3">
                  {zones.map((z) => (
                    <div key={z.id} className="card">
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ fontSize: '1rem' }}>🗺️</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{z.name}</strong>
                      </div>
                      {z.areas.length > 0 ? (
                        <div className="flex gap-2 flex-wrap">
                          {z.areas.map((a) => (
                            <span key={a.id} className="badge badge-assigned">{a.name}</span>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8125rem', margin: 0, color: 'var(--text-tertiary)' }}>No areas assigned</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rates Tab */}
        {activeTab === 'rates' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="glass-panel">
              <h3 className="section-title">Set Rate Card</h3>
              <form onSubmit={handleSaveRate} className="flex-col gap-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Order Type</label>
                    <select value={rateOrderType} onChange={(e) => setRateOrderType(e.target.value)} className="input-field">
                      <option value="B2C">B2C</option><option value="B2B">B2B</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Zone Type</label>
                    <select value={rateZoneType} onChange={(e) => setRateZoneType(e.target.value)} className="input-field">
                      <option value="INTRA">INTRA Zone</option><option value="INTER">INTER Zone</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Base Rate (₹)</label>
                    <input type="number" step="0.1" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} className="input-field" required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Per Kg Rate (₹)</label>
                    <input type="number" step="0.1" value={perKgRate} onChange={(e) => setPerKgRate(e.target.value)} className="input-field" required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">Save Rate Card</button>
              </form>
            </div>

            <div className="glass-panel">
              <h3 className="section-title">Current Rate Cards</h3>
              {rates.length === 0 ? (
                <div className="empty-state"><p>No rate cards configured yet.</p></div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Type</th><th>Zone</th><th>Base (₹)</th><th>Per Kg (₹)</th></tr></thead>
                    <tbody>
                      {rates.map((r) => (
                        <tr key={r.id}>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.orderType}</td>
                          <td>{r.zoneType}</td>
                          <td style={{ color: 'var(--accent-emerald)' }}>{r.baseRate}</td>
                          <td style={{ color: 'var(--accent-emerald)' }}>{r.perKgRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COD Config Tab */}
        {activeTab === 'config' && (
          <div className="glass-panel" style={{ maxWidth: '500px' }}>
            <h3 className="section-title">COD Surcharge Configuration</h3>
            <form onSubmit={handleSaveCOD} className="flex-col gap-3">
              <div className="input-group">
                <label className="input-label">COD Surcharge — B2C (₹)</label>
                <input type="number" step="0.1" value={codB2C} onChange={(e) => setCodB2C(e.target.value)} className="input-field" placeholder="e.g. 50" required />
              </div>
              <div className="input-group">
                <label className="input-label">COD Surcharge — B2B (₹)</label>
                <input type="number" step="0.1" value={codB2B} onChange={(e) => setCodB2B(e.target.value)} className="input-field" placeholder="e.g. 75" required />
              </div>
              <button type="submit" className="btn btn-primary">Save Surcharge Config</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

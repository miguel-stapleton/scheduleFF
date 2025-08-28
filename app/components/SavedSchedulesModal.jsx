"use client";
import { useEffect, useMemo, useState } from 'react';

function formatIsoToYmdHm(iso) {
  if (!iso) return '';
  // Expecting ISO string, split to date and time parts deterministically
  const [datePart, timePart] = iso.split('T');
  if (!datePart) return iso;
  const time = (timePart || '').slice(0, 5); // HH:MM
  return `${datePart}${time ? ` ${time}` : ''}`;
}

export default function SavedSchedulesModal({
  onClose,
  getSavedSchedules,
  onLoadSchedule,
  onDeleteSchedule,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSavedSchedules();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load schedules.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      (it.name || '').toLowerCase().includes(q) ||
      (it?.data?.brideName || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleDelete = async (id, name) => {
    const ok = typeof window === 'undefined' ? true : confirm(`Delete "${name || id}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await onDeleteSchedule(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      alert(e?.message || 'Failed to delete schedule');
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: 640 }}>
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Saved Schedules</h2>
            <span className="close" onClick={onClose} aria-label="Close">&times;</span>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Search by name or bride"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading && <div>Loading…</div>}
          {error && (
            <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: '10px', borderRadius: 8, marginBottom: 10 }}>
              {error}
            </div>
          )}

          <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
            {filtered.length === 0 && !loading ? (
              <div style={{ padding: 16, color: '#666' }}>No saved schedules</div>
            ) : (
              filtered.map((it) => (
                <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.name || `Schedule ${it.id}`}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {it?.data?.brideName ? `Bride: ${it.data.brideName}` : ''}
                      {it.savedAt ? `${it?.data?.brideName ? ' · ' : ''}${formatIsoToYmdHm(it.savedAt)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => onLoadSchedule(it.id)}>Load</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(it.id, it.name)} aria-label={`Delete ${it.name}`}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-outline" onClick={refresh}>Refresh</button>
        </div>
      </div>
    </div>
  );
}

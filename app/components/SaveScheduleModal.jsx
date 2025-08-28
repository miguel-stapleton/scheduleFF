"use client";
import { useEffect, useMemo, useRef, useState } from 'react';

export default function SaveScheduleModal({
  defaultName,
  onClose,
  getSavedSchedules,
  onSaveNew, // (name) => Promise
  onOverwrite, // (id, name) => Promise
}) {
  const [name, setName] = useState(defaultName || 'Untitled Schedule');
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dupCandidate, setDupCandidate] = useState(null); // { id, name }
  const inputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const items = await getSavedSchedules();
        if (mounted) setSaved(items || []);
      } catch (e) {
        if (mounted) setSaved([]);
      } finally {
        if (mounted) setLoading(false);
        // focus input after initial load
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    })();
    return () => { mounted = false; };
  }, [getSavedSchedules]);

  const nameMap = useMemo(() => {
    const map = new Map();
    (saved || []).forEach((s) => {
      const key = (s.name || '').trim().toLowerCase();
      if (!map.has(key)) map.set(key, s);
    });
    return map;
  }, [saved]);

  const handlePrimary = async () => {
    setError('');
    const raw = (name || '').trim();
    if (!raw) {
      setError('Please enter a name.');
      return;
    }
    const match = nameMap.get(raw.toLowerCase());
    if (match) {
      setDupCandidate({ id: match.id, name: match.name });
      return;
    }
    try {
      await onSaveNew(raw);
      onClose();
    } catch (e) {
      setError(e?.message || 'Failed to save.');
    }
  };

  const confirmOverwrite = async () => {
    if (!dupCandidate) return;
    setError('');
    try {
      await onOverwrite(dupCandidate.id, name.trim());
      onClose();
    } catch (e) {
      setError(e?.message || 'Failed to overwrite.');
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Save Schedule</h2>
            <span className="close" onClick={onClose} aria-label="Close">&times;</span>
          </div>
          <div className="form-group">
            <label htmlFor="schedule-name">Schedule name</label>
            <input
              id="schedule-name"
              type="text"
              value={name}
              ref={inputRef}
              onChange={(e) => { setName(e.target.value); setDupCandidate(null); setError(''); }}
              placeholder="Enter a unique name"
            />
          </div>

          {loading && <div>Loading existing schedules…</div>}

          {dupCandidate && (
            <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: '12px', borderRadius: 8, marginTop: 10 }}>
              A schedule named <strong>{dupCandidate.name}</strong> already exists.
              <div style={{ marginTop: 8 }}>Would you like to overwrite it or change the name?</div>
            </div>
          )}

          {error && (
            <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: '10px', borderRadius: 8, marginTop: 10 }}>
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {!dupCandidate ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePrimary} disabled={loading}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setDupCandidate(null)}>Change name</button>
              <button className="btn btn-warning" onClick={confirmOverwrite}>Overwrite</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const TYPE_COLORS = {
  customer_support: '#60a5fa', medical_advice: '#f87171', emotional_support: '#fbbf24',
  coding_help: '#4ade80', crisis: '#fb923c', casual_chat: '#a594f9',
  educational: '#67e8f9', debate: '#f472b6',
};

export default function SamplesPage({ onEvaluate }) {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.listSamples().then(d => { setSamples(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const color = (type) => TYPE_COLORS[type] || '#9090a8';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sample Conversations</h1>
        <p className="page-subtitle">50 annotated conversations covering diverse types and edge cases</p>
      </div>

      <div className="grid-2" style={{ gap: 20, alignItems: 'flex-start' }}>
        {/* List */}
        <div className="card" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {loading ? <div className="empty-state"><span className="spinner" /></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {samples.map(s => (
                <button key={s.conversation_id}
                  onClick={() => setSelected(s)}
                  style={{
                    background: selected?.conversation_id === s.conversation_id ? 'var(--accent-glow)' : 'none',
                    border: `1px solid ${selected?.conversation_id === s.conversation_id ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', padding: '10px 14px', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.15s ease',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {s.conversation_id}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {s.turns?.length} turns
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: color(s.conversation_type), display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{s.conversation_type.replace(/_/g, ' ')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div>
          {!selected ? (
            <div className="empty-state">
              <div className="empty-state-icon">◎</div>
              <div>Select a conversation to preview</div>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                    {selected.conversation_id}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color(selected.conversation_type), display: 'inline-block' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{selected.conversation_type.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>· {selected.turns?.length} turns</span>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 14px' }}
                  onClick={onEvaluate}>
                  ⟳ Evaluate This
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selected.turns?.map(turn => (
                  <div key={turn.turn_id} style={{
                    padding: '12px 14px', borderRadius: 'var(--radius)',
                    background: 'var(--bg-3)',
                    borderLeft: `3px solid ${turn.speaker === 'user' ? '#60a5fa' : '#4ade80'}`,
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {turn.speaker} · Turn {turn.turn_id}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                      {turn.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import { api, DOMAINS, domainBadge } from '../utils/api';

export default function FacetsPage() {
  const [facets, setFacets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    api.listFacets().then(d => { setFacets(d.facets); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let f = facets;
    if (domain !== 'all') f = f.filter(x => x.domain === domain);
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(x => x.facet_name.toLowerCase().includes(q) || x.facet_id.toLowerCase().includes(q) || x.evaluation_question?.toLowerCase().includes(q));
    }
    return f;
  }, [facets, domain, search]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Facet Library</h1>
        <p className="page-subtitle">{facets.length} evaluation facets across 4 domains</p>
      </div>

      {/* Domain pills */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        <button className={`tab-btn ${domain === 'all' ? 'active' : ''}`} onClick={() => { setDomain('all'); setPage(0); }}>
          All ({facets.length})
        </button>
        {DOMAINS.map(d => (
          <button key={d.id} className={`tab-btn ${domain === d.id ? 'active' : ''}`}
            onClick={() => { setDomain(d.id); setPage(0); }}>
            {d.label} ({facets.filter(f => f.domain === d.id).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input className="form-input" placeholder="Search by name, ID, or question…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th>Facet Name</th>
                  <th style={{ width: 120 }}>Domain</th>
                  <th>Evaluation Question</th>
                  <th style={{ width: 90 }}>Complexity</th>
                  <th style={{ width: 80 }}>Conf Prior</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(f => (
                  <tr key={f.facet_id}>
                    <td><code style={{ fontSize: 11, color: 'var(--accent-2)' }}>{f.facet_id}</code></td>
                    <td style={{ color: 'var(--text)', fontSize: 13 }}>{f.facet_name}</td>
                    <td><span className={`badge ${domainBadge(f.domain)}`}>{f.domain.replace('_', ' ')}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 300, color: 'var(--text-2)' }}>{f.evaluation_question}</td>
                    <td>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        background: f.complexity_tier === 'high' ? 'rgba(248,113,113,0.15)'
                          : f.complexity_tier === 'medium' ? 'rgba(251,191,36,0.15)'
                          : 'rgba(74,222,128,0.15)',
                        color: f.complexity_tier === 'high' ? '#f87171'
                          : f.complexity_tier === 'medium' ? '#fbbf24'
                          : '#4ade80',
                      }}>{f.complexity_tier}</span>
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12 }}>
                      {(f.default_confidence_prior * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {filtered.length} results · page {page + 1} of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" style={{ padding: '6px 12px' }}
                  disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="btn btn-outline" style={{ padding: '6px 12px' }}
                  disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

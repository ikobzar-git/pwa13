import { useState, useEffect } from 'react';
import { manager } from '../../api';
import { btn } from '../../theme';

export default function BranchSelector({ value, onChange }) {
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    manager.branches()
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const options = [
    { id: 'all', name: 'Все' },
    ...branches.map(b => ({ id: String(b.company_id), name: b.name })),
  ];

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '0 16px',
      marginBottom: 16,
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{ ...btn.period(value === opt.id), flexShrink: 0, fontSize: 12 }}
        >
          {opt.name}
        </button>
      ))}
    </div>
  );
}

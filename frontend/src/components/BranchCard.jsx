import React from 'react';
import { C } from '../theme';

export default function BranchCard({ company, selected, onSelect }) {
  const typeLabel = company.type === 'beauty' ? 'Бьюти' : 'Барбершоп';
  const typeBg = company.type === 'beauty' ? 'rgba(200,100,255,0.12)' : C.goldDim;
  const typeColor = company.type === 'beauty' ? '#D87BFF' : C.gold;

  return (
    <button
      onClick={() => onSelect(company)}
      style={{
        display: 'block',
        width: '100%',
        padding: 16,
        background: selected ? C.goldDim : C.surface2,
        border: `1px solid ${selected ? C.goldBorder : C.border}`,
        borderRadius: 14,
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: selected ? C.glow : C.cardShadow,
        transition: 'all 0.2s',
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ color: selected ? C.gold : C.text, fontSize: 15, fontWeight: 600 }}>
          {company.name}
        </span>
        <span style={{
          padding: '3px 8px',
          background: typeBg,
          color: typeColor,
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}>
          {typeLabel}
        </span>
      </div>
      {company.address && (
        <div style={{ color: C.textSec, fontSize: 13, lineHeight: 1.4 }}>
          {company.address}
        </div>
      )}
    </button>
  );
}

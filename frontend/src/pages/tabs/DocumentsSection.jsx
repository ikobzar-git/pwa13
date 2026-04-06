import { useState, useEffect } from 'react';
import { documents } from '../../api';
import { useApp } from '../../contexts/AppContext';
import { C, btn } from '../../theme';
import { ts } from './tabStyles';

const CAT_LABELS = {
  contract: 'Договор',
  rules: 'Правила',
  instructions: 'Инструкция',
  general: 'Общее',
};

export default function DocumentsSection() {
  const { companyId } = useApp();
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (companyId) documents.list(companyId).then(setDocs).catch(() => setDocs([]));
  }, [companyId]);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' КБ';
    return (bytes / 1024 / 1024).toFixed(1) + ' МБ';
  };

  return (
    <>
      <div style={ts.section}>
        <div style={ts.sectionTitle}>Документы</div>
        {docs.length === 0 ? (
          <p style={ts.emptyText}>Нет документов</p>
        ) : (
          docs.map((d) => (
            <div key={d.id} style={{
              ...ts.noteItem, marginBottom: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <a
                  href={d.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.gold, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  {d.title}
                </a>
                <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>
                  {CAT_LABELS[d.category] || d.category}
                  {d.file_size && ` · ${formatSize(d.file_size)}`}
                  {d.uploaded_by?.name && ` · ${d.uploaded_by.name}`}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

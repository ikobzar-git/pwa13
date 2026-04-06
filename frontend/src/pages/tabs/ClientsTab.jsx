import { useState, useEffect, useRef } from 'react';
import { notes, companies } from '../../api';
import { useApp } from '../../contexts/AppContext';
import ClientCard from '../../components/ClientCard';
import { C } from '../../theme';
import { ts } from './tabStyles';

export default function ClientsTab() {
  const { user, companyId } = useApp();
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [myNotes, setMyNotes] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (user?.yclients_staff_id) {
      notes.my().then(setMyNotes).catch(() => setMyNotes([]));
    }
  }, [user?.yclients_staff_id]);

  const handleClientSearch = (query) => {
    setClientSearch(query);
    setSearchDone(false);
    clearTimeout(timerRef.current);
    if (query.length < 2 || !companyId) {
      setClientSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const results = await companies.searchClients(companyId, query);
        setClientSearchResults(results || []);
      } catch {
        setClientSearchResults([]);
      } finally {
        setIsSearching(false);
        setSearchDone(true);
      }
    }, 300);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientSearch('');
    setClientSearchResults([]);
    setSearchDone(false);
  };

  return (
    <>
      <div style={ts.section}>
        <div style={ts.sectionTitle}>Поиск клиента</div>
        <input
          type="text"
          value={clientSearch}
          onChange={(e) => handleClientSearch(e.target.value)}
          placeholder="Телефон или имя..."
          style={ts.searchInput}
        />
        {isSearching && (
          <div style={{ color: C.textSec, fontSize: 13, padding: '8px 0' }}>Поиск...</div>
        )}
        {clientSearchResults.length > 0 && (
          <div style={ts.searchResults}>
            {clientSearchResults.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectClient(c)}
                style={ts.searchResultItem}
              >
                <span style={{ fontWeight: 600 }}>{c.name || c.first_name || 'Клиент'}</span>
                {c.phone && (
                  <span style={{ color: C.textSec, marginLeft: 10, fontSize: 13 }}>{c.phone}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {searchDone && !isSearching && clientSearchResults.length === 0 && clientSearch.length >= 2 && (
          <div style={{ color: C.textSec, fontSize: 13, padding: '8px 0' }}>
            Ничего не найдено по запросу «{clientSearch}»
          </div>
        )}
      </div>

      {selectedClient && (
        <div style={{ padding: '0 16px', marginBottom: 24 }}>
          <ClientCard
            record={{ client: selectedClient }}
            companyId={companyId}
            user={user}
            onClose={() => setSelectedClient(null)}
          />
        </div>
      )}

      {myNotes.length > 0 && (
        <div style={ts.section}>
          <div style={ts.sectionTitle}>Заметки по клиентам</div>
          {myNotes.map((n) => (
            <div
              key={n.id}
              style={{
                ...ts.noteItem,
                ...(n.is_important ? ts.noteImportant : {}),
              }}
            >
              <div style={ts.noteMeta}>
                {n.is_important && <span style={{ color: C.gold, marginRight: 6 }}>★</span>}
                Клиент #{n.yclients_client_id} · {new Date(n.created_at).toLocaleString('ru')}
                {n.category === 'personal' && <span style={{ marginLeft: 6, color: C.textSec }}>(личное)</span>}
              </div>
              <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{n.text}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

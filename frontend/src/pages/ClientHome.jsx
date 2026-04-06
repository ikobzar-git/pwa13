import { useState, useEffect, lazy, Suspense } from 'react';
import { companies, chat } from '../api';
import { useApp } from '../contexts/AppContext';
import BookingFlow from '../components/BookingFlow';
import ProfileSection from '../components/ProfileSection';
import { C, btn } from '../theme';
import { SkeletonCard } from '../components/Skeleton';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import RoleSwitch from '../components/RoleSwitch';
import BottomNav, { Icons } from '../components/BottomNav';
import ChatTab from './tabs/ChatTab';
import { cs } from './client-tabs/clientTabStyles';

const ClientHomeTab = lazy(() => import('./client-tabs/ClientHomeTab'));

const TabFallback = () => (
  <div style={{ padding: '0 16px' }}>
    <SkeletonCard /><SkeletonCard /><SkeletonCard />
  </div>
);

const styles = {
  page: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '0 0 80px',
    minHeight: '100vh',
    background: C.bg,
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    marginBottom: 24,
    background: C.surface,
    borderBottom: `1px solid ${C.border}`,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    height: 28,
    width: 'auto',
  },
  greeting: {
    fontSize: 13,
    color: C.textSec,
    fontWeight: 500,
  },
};

export default function ClientHome({ onLogout, roleSwitch }) {
  const { user, updateUser, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('home');
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingInitialData, setBookingInitialData] = useState(null);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferredBranch, setPreferredBranch] = useState(() => {
    try { return JSON.parse(localStorage.getItem('preferred_branch')); } catch { return null; }
  });
  const [branchList, setBranchList] = useState([]);
  const [showBranchPicker, setShowBranchPicker] = useState(false);

  const saveBranch = (branch) => {
    setPreferredBranch(branch);
    if (branch) localStorage.setItem('preferred_branch', JSON.stringify(branch));
    setShowBranchPicker(false);
  };

  useEffect(() => {
    companies.list().then((list) => {
      setBranchList(list);
      if (!preferredBranch && list.length > 0) setShowBranchPicker(true);
    }).catch(() => {});
    chat.unreadCount().then(d => setUnreadCount(d.count)).catch(() => {});
    const unreadInterval = setInterval(() => {
      chat.unreadCount().then(d => setUnreadCount(d.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(unreadInterval);
  }, []);

  const handleTabChange = (tab) => {
    if (tab !== 'book') setBookingInitialData(null);
    if (tab !== 'chat') setChatConversationId(null);
    setActiveTab(tab);
  };

  const openChatForRecord = async (record) => {
    const staffId = record.staff?.id || record.staff_id;
    if (!staffId) return;
    try {
      const conv = await chat.create({
        yclients_record_id: String(record.id),
        company_id: String(record.company_id),
        yclients_staff_id: String(staffId),
      });
      setChatConversationId(conv.id);
      setActiveTab('chat');
    } catch (e) {
      showToast(e.message || 'Не удалось открыть чат', 'error');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div style={styles.brandRow}>
          <img src="/logo13.png" alt="13" style={styles.brandLogo} />
          <span style={styles.greeting}>
            {user?.name || user?.phone || 'Клиент'}
          </span>
        </div>
        {roleSwitch && <RoleSwitch roleSwitch={roleSwitch} />}
      </div>

      {activeTab === 'home' && (
        <Suspense fallback={<TabFallback />}>
          <ClientHomeTab
            bookingSuccess={bookingSuccess}
            onDismissSuccess={() => setBookingSuccess(null)}
            onBook={() => setActiveTab('book')}
            onRebook={(data) => { setBookingInitialData(data); setActiveTab('book'); }}
            onOpenChat={openChatForRecord}
          />
        </Suspense>
      )}

      {activeTab === 'book' && (
        <div style={cs.section}>
          <div style={cs.sectionTitle}>Записаться</div>
          <BookingFlow
            user={user}
            initialData={bookingInitialData}
            preferredBranch={preferredBranch}
            onBranchChange={saveBranch}
            onSuccess={(rec) => {
              setBookingSuccess(rec);
              setBookingInitialData(null);
              setActiveTab('home');
            }}
            onCancel={() => { setBookingInitialData(null); setActiveTab('home'); }}
          />
        </div>
      )}

      {activeTab === 'chat' && (
        <ChatTab
          conversationId={chatConversationId}
          onOpenConversation={(id) => setChatConversationId(id)}
          onCloseConversation={() => setChatConversationId(null)}
        />
      )}

      {activeTab === 'profile' && (
        <div style={cs.section}>
          <div style={cs.profilePageTitle}>Мой профиль</div>
          <ProfileSection user={user} onUpdate={updateUser} onLogout={onLogout} />
        </div>
      )}

      {showBranchPicker && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: C.surface, borderRadius: 20, padding: '28px 20px', maxWidth: 400, width: '100%',
            border: `1px solid ${C.border}`, boxShadow: '0 4px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4, textAlign: 'center' }}>
              Выберите филиал
            </div>
            <div style={{ fontSize: 13, color: C.textSec, marginBottom: 16, textAlign: 'center' }}>
              Мы запомним ваш выбор
            </div>
            {branchList.map(c => (
              <button
                key={c.id}
                onClick={() => saveBranch(c)}
                style={{
                  display: 'block', width: '100%', padding: '14px 16px', marginBottom: 8,
                  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12,
                  textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{c.name}</div>
                {c.address && <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{c.address}</div>}
              </button>
            ))}
            <button
              onClick={() => setShowBranchPicker(false)}
              style={{ ...btn.ghost, color: C.textSec, marginTop: 8, width: '100%', textAlign: 'center' }}
            >
              Выберу позже
            </button>
          </div>
        </div>
      )}

      <BottomNav tabs={[
        { id: 'home', icon: Icons.home, label: 'Главная' },
        { id: 'book', icon: Icons.plus, label: 'Записаться', accent: true },
        { id: 'chat', icon: Icons.chat, label: 'Чат', badge: unreadCount },
        { id: 'profile', icon: Icons.user, label: 'Профиль' },
      ]} activeTab={activeTab} onTabChange={handleTabChange} />
      <Toast />
      <ConfirmDialog />
    </div>
  );
}

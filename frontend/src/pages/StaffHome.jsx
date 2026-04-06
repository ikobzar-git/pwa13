import { useState, useEffect, lazy, Suspense } from 'react';
import { config, pushSubscribe, chat } from '../api';
import { useApp } from '../contexts/AppContext';
import { C, btn } from '../theme';
import { SkeletonCard } from '../components/Skeleton';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import RoleSwitch from '../components/RoleSwitch';
import BottomNav, { Icons } from '../components/BottomNav';
import ChatTab from './tabs/ChatTab';
import MenuTab from './tabs/MenuTab';

const RecordsTab = lazy(() => import('./tabs/RecordsTab'));
const WorkplaceTab = lazy(() => import('./tabs/WorkplaceTab'));
const ClientsTab = lazy(() => import('./tabs/ClientsTab'));
const StatsTab = lazy(() => import('./tabs/StatsTab'));
const FinanceSection = lazy(() => import('./tabs/FinanceSection'));
const InventorySection = lazy(() => import('./tabs/InventorySection'));
const DocumentsSection = lazy(() => import('./tabs/DocumentsSection'));
const ProfileSection = lazy(() => import('./tabs/ProfileSection'));
const RequestsSection = lazy(() => import('./tabs/RequestsSection'));
const FeedbackSection = lazy(() => import('./tabs/FeedbackSection'));

const TabFallback = () => (
  <div style={{ padding: '0 16px' }}>
    <SkeletonCard /><SkeletonCard /><SkeletonCard />
  </div>
);

function urlB64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function requestPushSubscription(vapidPublicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(vapidPublicKey),
  });
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint,
    keys: json.keys || { p256dh: json.p256dh, auth: json.auth },
  };
}

const MENU_SECTIONS = {
  stats: 'Статистика',
  finance: 'Финансы',
  clients: 'Клиенты',
  inventory: 'Инвентарь',
  documents: 'Документы',
  profile: 'Профиль',
  requests: 'Заявки',
  feedback: 'Обратная связь',
};

const styles = {
  page: {
    maxWidth: 640,
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
  role: {
    fontSize: 13,
    color: C.textSec,
    fontWeight: 500,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: C.textSec,
    fontSize: 13,
    cursor: 'pointer',
    padding: '4px 16px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
};

export default function StaffHome({ onLogout, roleSwitch }) {
  const { user, companyId, setCompanyId, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('records');
  const [menuSection, setMenuSection] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatConversationId, setChatConversationId] = useState(null);

  useEffect(() => {
    config().then((c) => {
      setCompanyId(c.company_id || '');
      if (c.vapid_public_key && Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            requestPushSubscription(c.vapid_public_key)
              .then((sub) => sub && pushSubscribe(sub))
              .catch(() => {});
          }
        });
      }
    }).catch(() => {});
    chat.unreadCount().then(d => setUnreadCount(d.count)).catch(() => {});
    const unreadInterval = setInterval(() => {
      chat.unreadCount().then(d => setUnreadCount(d.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(unreadInterval);
  }, []);

  const handleTabChange = (tab) => {
    if (tab !== 'chat') setChatConversationId(null);
    setMenuSection(null);
    setActiveTab(tab);
  };

  const handleMenuNavigate = (section) => {
    setMenuSection(section);
  };

  const openChatForRecord = async (record) => {
    const clientId = record.client?.id;
    if (!clientId) return;
    try {
      const conv = await chat.create({
        yclients_record_id: String(record.id),
        company_id: String(record.company_id || companyId),
        yclients_client_id: String(clientId),
      });
      setChatConversationId(conv.id);
      setActiveTab('chat');
    } catch (e) {
      showToast(e.message || 'Не удалось открыть чат', 'error');
    }
  };

  const roleLabel = user?.role === 'manager' ? 'Руководитель' : 'Барбер';

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div style={styles.brandRow}>
          <img src="/logo13.png" alt="13" style={styles.brandLogo} />
          <span style={styles.role}>
            {user?.name || user?.phone} · {roleLabel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {roleSwitch && <RoleSwitch roleSwitch={roleSwitch} />}
          <button style={btn.secondary} onClick={onLogout}>Выйти</button>
        </div>
      </div>

      <Suspense fallback={<TabFallback />}>
        {activeTab === 'records' && (
          <RecordsTab onOpenChat={openChatForRecord} />
        )}
        {activeTab === 'workplace' && <WorkplaceTab />}

        {activeTab === 'menu' && !menuSection && (
          <MenuTab onNavigate={handleMenuNavigate} />
        )}

        {activeTab === 'menu' && menuSection && (
          <>
            <button style={styles.backBtn} onClick={() => setMenuSection(null)}>
              ← {MENU_SECTIONS[menuSection] || 'Меню'}
            </button>
            {menuSection === 'stats' && <StatsTab />}
            {menuSection === 'finance' && <FinanceSection />}
            {menuSection === 'clients' && <ClientsTab />}
            {menuSection === 'inventory' && <InventorySection />}
            {menuSection === 'documents' && <DocumentsSection />}
            {menuSection === 'profile' && <ProfileSection />}
            {menuSection === 'requests' && <RequestsSection />}
            {menuSection === 'feedback' && <FeedbackSection />}
          </>
        )}
      </Suspense>

      {activeTab === 'chat' && (
        <ChatTab
          conversationId={chatConversationId}
          onOpenConversation={(id) => setChatConversationId(id)}
          onCloseConversation={() => setChatConversationId(null)}
        />
      )}

      <BottomNav tabs={[
        { id: 'records', icon: Icons.clipboard, label: 'Записи' },
        { id: 'workplace', icon: Icons.desk, label: 'Место' },
        { id: 'chat', icon: Icons.chat, label: 'Чат', badge: unreadCount },
        { id: 'menu', icon: Icons.menu, label: 'Меню' },
      ]} activeTab={activeTab} onTabChange={handleTabChange} />
      <Toast />
      <ConfirmDialog />
    </div>
  );
}

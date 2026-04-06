import { useState, lazy, Suspense } from 'react';
import { useApp } from '../contexts/AppContext';
import { C, btn } from '../theme';
import { SkeletonCard } from '../components/Skeleton';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import RoleSwitch from '../components/RoleSwitch';
import BottomNav, { Icons } from '../components/BottomNav';
import BranchSelector from './manager-tabs/BranchSelector';

const DashboardTab = lazy(() => import('./manager-tabs/DashboardTab'));
const TeamTab = lazy(() => import('./manager-tabs/TeamTab'));
const ManagerFinanceTab = lazy(() => import('./manager-tabs/ManagerFinanceTab'));
const ManagerMoreTab = lazy(() => import('./manager-tabs/ManagerMoreTab'));

// More sub-sections (reuse existing staff tabs)
const DocumentsSection = lazy(() => import('./tabs/DocumentsSection'));
const InventorySection = lazy(() => import('./tabs/InventorySection'));
const RequestsSection = lazy(() => import('./tabs/RequestsSection'));
const FeedbackSection = lazy(() => import('./tabs/FeedbackSection'));
const ClientAnalyticsSection = lazy(() => import('./manager-tabs/ClientAnalyticsSection'));
const ChatTab = lazy(() => import('./tabs/ChatTab'));

const TabFallback = () => (
  <div style={{ padding: '0 16px' }}>
    <SkeletonCard /><SkeletonCard /><SkeletonCard />
  </div>
);

const MORE_SECTIONS = {
  documents: 'Документы',
  inventory: 'Инвентарь',
  requests: 'Заявки',
  feedback: 'Обратная связь',
  clients: 'Клиенты',
  chat: 'Чат',
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
    marginBottom: 8,
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

export default function ManagerHome({ onLogout, roleSwitch }) {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [branchId, setBranchId] = useState('all');
  const [moreSection, setMoreSection] = useState(null);

  const handleTabChange = (tab) => {
    setMoreSection(null);
    setActiveTab(tab);
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div style={styles.brandRow}>
          <img src="/logo13.png" alt="13" style={styles.brandLogo} />
          <span style={styles.role}>
            {user?.name || user?.phone} · Руководитель
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {roleSwitch && <RoleSwitch roleSwitch={roleSwitch} />}
          <button style={btn.secondary} onClick={onLogout}>Выйти</button>
        </div>
      </div>

      {/* Branch selector — shown on dashboard, team, finance */}
      {['dashboard', 'team', 'finance'].includes(activeTab) && (
        <BranchSelector value={branchId} onChange={setBranchId} />
      )}

      <Suspense fallback={<TabFallback />}>
        {activeTab === 'dashboard' && <DashboardTab branchId={branchId} />}
        {activeTab === 'team' && <TeamTab branchId={branchId} />}
        {activeTab === 'finance' && <ManagerFinanceTab branchId={branchId} />}

        {activeTab === 'more' && !moreSection && (
          <ManagerMoreTab onNavigate={setMoreSection} />
        )}

        {activeTab === 'more' && moreSection && (
          <>
            <button style={styles.backBtn} onClick={() => setMoreSection(null)}>
              ← {MORE_SECTIONS[moreSection] || 'Ещё'}
            </button>
            {moreSection === 'documents' && <DocumentsSection />}
            {moreSection === 'inventory' && <InventorySection />}
            {moreSection === 'requests' && <RequestsSection />}
            {moreSection === 'feedback' && <FeedbackSection />}
            {moreSection === 'clients' && <ClientAnalyticsSection branchId={branchId} />}
            {moreSection === 'chat' && <ChatTab />}
          </>
        )}
      </Suspense>

      <BottomNav tabs={[
        { id: 'dashboard', icon: Icons.chart, label: 'Главная' },
        { id: 'team', icon: Icons.user, label: 'Команда' },
        { id: 'finance', icon: FinanceIcon, label: 'Финансы' },
        { id: 'more', icon: Icons.menu, label: 'Ещё' },
      ]} activeTab={activeTab} onTabChange={handleTabChange} />
      <Toast />
      <ConfirmDialog />
    </div>
  );
}

const FinanceIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

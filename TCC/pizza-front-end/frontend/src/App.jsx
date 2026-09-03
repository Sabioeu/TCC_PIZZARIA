import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Icon from './components/Icon';
import { AppProvider, useApp } from './context/AppContext';
import MainLayout from './layouts/MainLayout';
import AuditPage from './pages/AuditPage';
import AutomationsPage from './pages/AutomationsPage';
import CashPage from './pages/CashPage';
import CommercePage from './pages/CommercePage';
import DashboardPage from './pages/DashboardPage';
import DeliveryPage from './pages/DeliveryPage';
import KitchenPage from './pages/KitchenPage';
import LoginPage from './pages/LoginPage';
import { CustomersPage, FinancePage, InventoryPage, MenuPage, ReportsPage } from './pages/ManagementPages';
import OrdersPage from './pages/OrdersPage';
import PosPage from './pages/PosPage';
import PublicMenuPage from './pages/PublicMenuPage';
import PurchasesPage from './pages/PurchasesPage';
import SettingsPage from './pages/SettingsPage';
import TablesPage from './pages/TablesPage';
import WorkforcePage from './pages/WorkforcePage';
import FeedbackPage from './pages/FeedbackPage';
import ExperiencePage from './pages/ExperiencePage';
import PrivacyPage from './pages/PrivacyPage';

const homeByRole = { KITCHEN: '/cozinha', CASHIER: '/pdv', WAITER: '/pdv', DELIVERY: '/entregas' };
function Allowed({ roles, children }) {
  const { user } = useApp();
  return roles.includes(user?.role) ? children : <Navigate to={homeByRole[user?.role] || '/'} replace />;
}

function ProtectedRoutes() {
  const { authenticated, loading, user } = useApp();
  if (!authenticated) return <Navigate to="/entrar" replace />;
  if (loading) return <main className="app-loading"><div className="loading-brand"><span className="brand-mark"><Icon name="pizza" /></span><strong>Aurora Pizza</strong></div><span className="spinner" /><p>Sincronizando sua operação…</p></main>;
  const home = homeByRole[user?.role] || '/visao-geral';
  const permit = (roles, page) => <Allowed roles={roles}>{page}</Allowed>;
  return <Routes><Route element={<MainLayout />} path="/"><Route index element={<Navigate to={home} replace />} /><Route path="visao-geral" element={permit(['ADMIN','MANAGER','CASHIER','WAITER'], <DashboardPage />)} /><Route path="pdv" element={permit(['ADMIN','MANAGER','CASHIER','WAITER'], <PosPage />)} /><Route path="cozinha" element={permit(['ADMIN','MANAGER','KITCHEN'], <KitchenPage />)} /><Route path="pedidos" element={permit(['ADMIN','MANAGER','CASHIER','KITCHEN','WAITER','DELIVERY'], <OrdersPage />)} /><Route path="entregas" element={permit(['ADMIN','MANAGER','DELIVERY'], <DeliveryPage />)} /><Route path="jornada" element={permit(['ADMIN','MANAGER','CASHIER','KITCHEN','WAITER','DELIVERY'], <WorkforcePage />)} /><Route path="mesas" element={permit(['ADMIN','MANAGER','CASHIER','WAITER'], <TablesPage />)} /><Route path="caixa" element={permit(['ADMIN','MANAGER','CASHIER'], <CashPage />)} /><Route path="cardapio" element={permit(['ADMIN','MANAGER'], <MenuPage />)} /><Route path="estoque" element={permit(['ADMIN','MANAGER','KITCHEN'], <InventoryPage />)} /><Route path="compras" element={permit(['ADMIN','MANAGER'], <PurchasesPage />)} /><Route path="clientes" element={permit(['ADMIN','MANAGER','CASHIER','WAITER'], <CustomersPage />)} /><Route path="financeiro" element={permit(['ADMIN','MANAGER'], <FinancePage />)} /><Route path="comercial" element={permit(['ADMIN','MANAGER','CASHIER'], <CommercePage />)} /><Route path="automacoes" element={permit(['ADMIN','MANAGER'], <AutomationsPage />)} /><Route path="avaliacoes" element={permit(['ADMIN','MANAGER'], <ExperiencePage />)} /><Route path="relatorios" element={permit(['ADMIN','MANAGER'], <ReportsPage />)} /><Route path="configuracoes" element={permit(['ADMIN','MANAGER'], <SettingsPage />)} /><Route path="privacidade" element={permit(['ADMIN'], <PrivacyPage />)} /><Route path="auditoria" element={permit(['ADMIN'], <AuditPage />)} /><Route path="*" element={<Navigate to={home} replace />} /></Route></Routes>;
}

function AppRoutes() {
  return <Routes><Route path="/entrar" element={<LoginPage />} /><Route path="/menu/:token" element={<PublicMenuPage />} /><Route path="/avaliar/:orderCode" element={<FeedbackPage />} /><Route path="/*" element={<ProtectedRoutes />} /></Routes>;
}

export default function App() {
  return <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><AppProvider><AppRoutes /></AppProvider></BrowserRouter>;
}

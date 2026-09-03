import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Icon from './components/Icon';
import { AppProvider, useApp } from './context/AppContext';
import MainLayout from './layouts/MainLayout';
import AuditPage from './pages/AuditPage';
import CashPage from './pages/CashPage';
import CommercePage from './pages/CommercePage';
import DashboardPage from './pages/DashboardPage';
import KitchenPage from './pages/KitchenPage';
import LoginPage from './pages/LoginPage';
import { CustomersPage, FinancePage, InventoryPage, MenuPage, ReportsPage } from './pages/ManagementPages';
import OrdersPage from './pages/OrdersPage';
import PosPage from './pages/PosPage';
import PublicMenuPage from './pages/PublicMenuPage';
import PurchasesPage from './pages/PurchasesPage';
import SettingsPage from './pages/SettingsPage';
import TablesPage from './pages/TablesPage';

function ProtectedRoutes() {
  const { authenticated, loading } = useApp();
  if (!authenticated) return <Navigate to="/entrar" replace />;
  if (loading) return <main className="app-loading"><div className="loading-brand"><span className="brand-mark"><Icon name="pizza" /></span><strong>Aurora Pizza</strong></div><span className="spinner" /><p>Sincronizando sua operação…</p></main>;
  return <Routes><Route element={<MainLayout />} path="/"><Route index element={<DashboardPage />} /><Route path="pdv" element={<PosPage />} /><Route path="cozinha" element={<KitchenPage />} /><Route path="pedidos" element={<OrdersPage />} /><Route path="mesas" element={<TablesPage />} /><Route path="caixa" element={<CashPage />} /><Route path="cardapio" element={<MenuPage />} /><Route path="estoque" element={<InventoryPage />} /><Route path="compras" element={<PurchasesPage />} /><Route path="clientes" element={<CustomersPage />} /><Route path="financeiro" element={<FinancePage />} /><Route path="comercial" element={<CommercePage />} /><Route path="relatorios" element={<ReportsPage />} /><Route path="configuracoes" element={<SettingsPage />} /><Route path="auditoria" element={<AuditPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes>;
}

function AppRoutes() {
  return <Routes><Route path="/entrar" element={<LoginPage />} /><Route path="/menu/:token" element={<PublicMenuPage />} /><Route path="/*" element={<ProtectedRoutes />} /></Routes>;
}

export default function App() {
  return <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><AppProvider><AppRoutes /></AppProvider></BrowserRouter>;
}

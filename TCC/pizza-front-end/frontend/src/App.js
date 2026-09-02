import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import { AppProvider } from './context/AppContext';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import PosPage from './pages/PosPage';
import KitchenPage from './pages/KitchenPage';
import OrdersPage from './pages/OrdersPage';
import TablesPage from './pages/TablesPage';
import { CustomersPage, FinancePage, InventoryPage, MenuPage, ReportsPage, SettingsPage } from './pages/ManagementPages';

export default function App() {
  return <AppProvider><BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><Routes><Route element={<MainLayout />} path="/"><Route index element={<DashboardPage />} /><Route path="pdv" element={<PosPage />} /><Route path="cozinha" element={<KitchenPage />} /><Route path="pedidos" element={<OrdersPage />} /><Route path="mesas" element={<TablesPage />} /><Route path="cardapio" element={<MenuPage />} /><Route path="estoque" element={<InventoryPage />} /><Route path="clientes" element={<CustomersPage />} /><Route path="financeiro" element={<FinancePage />} /><Route path="relatorios" element={<ReportsPage />} /><Route path="configuracoes" element={<SettingsPage />} /><Route path="*" element={<DashboardPage />} /></Route></Routes></BrowserRouter></AppProvider>;
}

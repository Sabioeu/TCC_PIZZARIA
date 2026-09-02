import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/api';
import { demoCustomers, demoDashboard, demoFinance, demoInventory, demoOrders, demoProducts, demoTables } from '../data/demoData';

const AppContext = createContext(null);
export const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const labels = { RECEIVED: 'Recebido', PREPARING: 'Em preparo', READY: 'Pronto', OUT_FOR_DELIVERY: 'Em rota', COMPLETED: 'Concluído', CANCELED: 'Cancelado', AVAILABLE: 'Disponível', OCCUPIED: 'Ocupada', RESERVED: 'Reservada', CLEANING: 'Limpeza', INACTIVE: 'Inativa', PAID: 'Pago', PENDING: 'Pendente', OVERDUE: 'Vencido', DINE_IN: 'Salão', DELIVERY: 'Delivery', PICKUP: 'Retirada' };

export function AppProvider({ children }) {
  const [data, setData] = useState({ products: demoProducts, orders: demoOrders, tables: demoTables, inventory: demoInventory, customers: demoCustomers, finance: demoFinance, dashboard: demoDashboard });
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    Promise.all(['/products', '/orders', '/tables', '/inventory', '/customers', '/finance', '/dashboard'].map(path => api.get(path)))
      .then(([products, orders, tables, inventory, customers, finance, dashboard]) => {
        setData({ products: products.data, orders: orders.data, tables: tables.data, inventory: inventory.data, customers: customers.data, finance: finance.data, dashboard: dashboard.data });
        setOnline(true);
      }).catch(() => setOnline(false)).finally(() => setLoading(false));
  }, []);

  const notify = message => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const createOrder = async command => {
    try { const { data: created } = await api.post('/orders', command); setData(d => ({ ...d, orders: [created, ...d.orders] })); setOnline(true); notify(`Pedido ${created.code} enviado para a cozinha`); return created; }
    catch { const created = { ...command, id: Date.now(), code: `A${String(data.orders.length + 1).padStart(4, '0')}`, status: 'RECEIVED', createdAt: new Date().toISOString(), total: command.items.reduce((sum, x) => sum + data.products.find(p => p.id === x.productId).price * x.quantity, 0), items: command.items.map(x => { const p = data.products.find(item => item.id === x.productId); return { productId: p.id, productName: p.name, quantity: x.quantity, unitPrice: p.price }; }) }; setData(d => ({ ...d, orders: [created, ...d.orders] })); notify(`Pedido ${created.code} criado no modo demonstração`); return created; }
  };
  const setOrderStatus = async (id, status) => { try { await api.patch(`/orders/${id}/status`, { status }); } catch {} setData(d => ({ ...d, orders: d.orders.map(o => o.id === id ? { ...o, status } : o) })); notify(`Pedido atualizado: ${labels[status]}`); };
  const setTableStatus = async (id, status) => { try { await api.patch(`/tables/${id}/status`, { status }); } catch {} setData(d => ({ ...d, tables: d.tables.map(t => t.id === id ? { ...t, status } : t) })); notify(`Mesa atualizada: ${labels[status]}`); };
  const addProduct = async product => { let created = { ...product, id: Date.now(), active: true }; try { created = (await api.post('/products', product)).data; } catch {} setData(d => ({ ...d, products: [...d.products, created] })); notify('Produto adicionado ao cardápio'); };
  const addCustomer = async customer => { let created = { ...customer, id: Date.now(), ordersCount: 0 }; try { created = (await api.post('/customers', customer)).data; } catch {} setData(d => ({ ...d, customers: [...d.customers, created] })); notify('Cliente cadastrado com sucesso'); };

  const value = { ...data, online, loading, toast, createOrder, setOrderStatus, setTableStatus, addProduct, addCustomer, notify };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export const useApp = () => useContext(AppContext);

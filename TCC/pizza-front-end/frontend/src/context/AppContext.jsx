import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { apiMessage, WS_URL } from '../api/api';
import {
  demoAudit, demoBranches, demoCash, demoCoupons, demoCustomers, demoDashboard, demoFinance,
  demoIntelligence, demoInventory, demoOrders, demoProducts, demoPurchases, demoReservations,
  demoSettings, demoStockMovements, demoSuppliers, demoTables, demoUsers,
} from '../data/demoData';

const AppContext = createContext(null);
export const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const number = (value, digits = 2) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits });
export const labels = {
  RECEIVED: 'Recebido', PREPARING: 'Em preparo', READY: 'Pronto', OUT_FOR_DELIVERY: 'Em rota', DELIVERED: 'Entregue', COMPLETED: 'Concluído', CANCELED: 'Cancelado',
  AVAILABLE: 'Disponível', OCCUPIED: 'Ocupada', RESERVED: 'Reservada', CLEANING: 'Limpeza', INACTIVE: 'Inativa',
  PAID: 'Pago', PENDING: 'Pendente', OVERDUE: 'Vencido', DINE_IN: 'Salão', DELIVERY: 'Delivery', PICKUP: 'Retirada',
  CONFIRMED: 'Confirmada', SEATED: 'Cliente à mesa', NO_SHOW: 'Não compareceu', DRAFT: 'Rascunho', SENT: 'Enviado', PARTIALLY_RECEIVED: 'Recebido parcial',
  PURCHASE: 'Compra', SALE: 'Venda', ADJUSTMENT: 'Ajuste', WASTE: 'Perda', RETURN: 'Devolução', SUPPLY: 'Suprimento', WITHDRAWAL: 'Sangria', REFUND: 'Estorno',
  ADMIN: 'Administrador', MANAGER: 'Gerente', CASHIER: 'Caixa', KITCHEN: 'Cozinha', WAITER: 'Garçom', DELIVERY: 'Entregador', EARN: 'Crédito', REDEEM: 'Resgate',
};

const variants = [
  { name: 'Individual', priceAdjustment: -18 }, { name: 'Grande', priceAdjustment: 0 }, { name: 'Família', priceAdjustment: 18 },
];
const richDemoProducts = demoProducts.map((product, index) => ({
  ...product, sku: `${product.category.slice(0, 2).toUpperCase()}${String(index + 1).padStart(3, '0')}`,
  prepMinutes: product.category === 'Pizzas' ? 18 : product.category === 'Bebidas' ? 2 : 10,
  availableForHalf: product.category === 'Pizzas', variants: product.category === 'Pizzas' ? variants : [],
}));
const richDemoInventory = demoInventory.map((item, index) => ({ ...item, costPerUnit: [6.9, 42, 19.5, 64, 13.2, 48, 1.45, 38][index] }));
const initialData = () => ({
  branches: demoBranches, products: richDemoProducts, orders: demoOrders, tables: demoTables,
  inventory: richDemoInventory, customers: demoCustomers.map((customer, index) => ({ ...customer, loyaltyPoints: [920, 610, 440, 285][index], totalSpent: customer.ordersCount * 82 })),
  finance: demoFinance, dashboard: demoDashboard, reservations: demoReservations, suppliers: demoSuppliers,
  purchases: demoPurchases, stockMovements: demoStockMovements, cash: demoCash, intelligence: demoIntelligence,
  settings: demoSettings, coupons: demoCoupons, users: demoUsers, audit: demoAudit,
});

function storedSession() {
  try { return JSON.parse(localStorage.getItem('aurora_session') || 'null'); } catch { return null; }
}

export function AppProvider({ children }) {
  const [data, setData] = useState(initialData);
  const [session, setSession] = useState(storedSession);
  const [branchId, setBranchId] = useState(() => Number(localStorage.getItem('aurora_branch_id') || storedSession()?.user?.branchId || 1));
  const [online, setOnline] = useState(false);
  const [socketOnline, setSocketOnline] = useState(false);
  const [loading, setLoading] = useState(Boolean(session));
  const [authLoading, setAuthLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [notificationsReadAt, setNotificationsReadAt] = useState(0);
  const toastTimer = useRef(null);
  const loadedSessionKey = useRef('');

  const notify = useCallback(message => {
    setToast(message); window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2800);
  }, []);

  const loadData = useCallback(async (selectedBranch = branchId, quiet = false) => {
    if (!session) return;
    if (!quiet) setLoading(true);
    if (session.demo) {
      setData(initialData()); setOnline(false); setLastSync(new Date()); setLoading(false); return;
    }
    try {
      const { data: bootstrap } = await api.get('/bootstrap', { headers: { 'X-Branch-Id': selectedBranch } });
      let adminData = {};
      if (session.user?.role === 'ADMIN') {
        const [users, audit] = await Promise.allSettled([api.get('/users'), api.get('/audit')]);
        adminData = { users: users.status === 'fulfilled' ? users.value.data : [], audit: audit.status === 'fulfilled' ? audit.value.data : [] };
      }
      setData(previous => ({ ...previous, ...bootstrap, ...adminData }));
      setOnline(true); setLastSync(new Date());
    } catch (error) {
      setOnline(false);
      if (error?.response?.status === 401) {
        localStorage.removeItem('aurora_session'); setSession(null);
      } else if (!quiet) notify('API indisponível — o Aurora ativou o modo offline seguro');
    } finally { setLoading(false); }
  }, [branchId, notify, session]);

  useEffect(() => {
    if (!session) { loadedSessionKey.current = ''; setLoading(false); return; }
    const key = `${session.token}:${branchId}`;
    if (loadedSessionKey.current === key) return;
    loadedSessionKey.current = key;
    loadData(branchId);
  }, [session, branchId, loadData]);

  useEffect(() => {
    if (!session || session.demo || typeof WebSocket === 'undefined') return undefined;
    let socket; let reconnect;
    const connect = () => {
      const realtimeUrl = `${WS_URL}?token=${encodeURIComponent(session.token)}&branchId=${branchId}`;
      socket = new WebSocket(realtimeUrl);
      socket.onopen = () => setSocketOnline(true);
      socket.onmessage = event => {
        try { const message = JSON.parse(event.data); if (!message.branchId || Number(message.branchId) === Number(branchId)) loadData(branchId, true); } catch { /* mensagem de heartbeat */ }
      };
      socket.onclose = () => { setSocketOnline(false); reconnect = window.setTimeout(connect, 3500); };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => { window.clearTimeout(reconnect); if (socket) { socket.onclose = null; socket.close(); } setSocketOnline(false); };
  }, [branchId, loadData, session]);

  const flushQueue = useCallback(async () => {
    if (!session || session.demo) return;
    let pending = [];
    try { pending = JSON.parse(localStorage.getItem('aurora_pending_orders') || '[]'); } catch { return; }
    if (!pending.length) return;
    const remaining = [];
    for (const order of pending) {
      try { await api.post('/orders', order.command, { headers: { 'X-Branch-Id': order.branchId } }); } catch { remaining.push(order); }
    }
    localStorage.setItem('aurora_pending_orders', JSON.stringify(remaining));
    if (remaining.length < pending.length) { notify(`${pending.length - remaining.length} pedido(s) offline sincronizado(s)`); loadData(branchId, true); }
  }, [branchId, loadData, notify, session]);

  useEffect(() => {
    const connected = () => { flushQueue(); loadData(branchId, true); };
    window.addEventListener('online', connected);
    return () => window.removeEventListener('online', connected);
  }, [branchId, flushQueue, loadData]);

  const login = async (email, password) => {
    setAuthLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const next = { ...response.data, demo: false };
      localStorage.setItem('aurora_session', JSON.stringify(next));
      localStorage.setItem('aurora_branch_id', String(next.user.branchId || 1));
      setBranchId(Number(next.user.branchId || 1)); setSession(next); setOnline(true); return next;
    } catch (error) {
      const demoUser = demoUsers.find(user => user.email.toLowerCase() === email.trim().toLowerCase());
      if (!error?.response && demoUser && password === 'Aurora@2026') {
        const next = { token: 'offline-demo', user: { ...demoUser, branchId: 1 }, demo: true };
        localStorage.setItem('aurora_session', JSON.stringify(next)); localStorage.setItem('aurora_branch_id', '1');
        setBranchId(1); setSession(next); notify('Modo demonstração ativado'); return next;
      }
      throw new Error(apiMessage(error, 'E-mail ou senha inválidos'));
    } finally { setAuthLoading(false); }
  };

  const logout = () => { localStorage.removeItem('aurora_session'); loadedSessionKey.current = ''; setSession(null); setOnline(false); setSocketOnline(false); setData(initialData()); };
  const selectBranch = id => { const selected = Number(id); localStorage.setItem('aurora_branch_id', String(selected)); setBranchId(selected); };

  const createOrder = async command => {
    try {
      if (session && !session.demo) {
        const { data: created } = await api.post('/orders', command);
        setData(current => ({ ...current, orders: [created, ...current.orders] }));
        setOnline(true); notify(`Pedido ${created.code} enviado para a cozinha`); return created;
      }
      throw new Error('offline');
    } catch (error) {
      if (error?.response) { notify(apiMessage(error)); throw error; }
      const modifierPrices = { 'Borda de catupiry': 10, 'Extra mozzarella': 8, 'Bacon crocante': 9, Azeitonas: 4, 'Sem lactose': 7 };
      const lines = command.items.map(item => {
        const product = data.products.find(value => value.id === item.productId);
        const half = data.products.find(value => value.id === item.halfProductId);
        const adjustment = product?.variants?.find(value => value.name === item.variantName)?.priceAdjustment || 0;
        const extras = (item.modifiers || []).reduce((sum, name) => sum + (modifierPrices[name] || 0), 0);
        const unitPrice = Math.max(Number(product?.price || 0), Number(half?.price || 0)) + Number(adjustment) + extras;
        return { ...item, productName: product?.name, halfProductName: half?.name, unitPrice, lineTotal: unitPrice * item.quantity, modifiers: (item.modifiers || []).join(', ') };
      });
      const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const coupon = data.coupons.find(value => value.code === command.couponCode?.toUpperCase());
      const discount = coupon ? (coupon.type === 'PERCENT' ? subtotal * coupon.value / 100 : coupon.value) : 0;
      const serviceFee = command.type === 'DINE_IN' ? subtotal * Number(data.settings.serviceFeePercent || 10) / 100 : 0;
      const deliveryFee = command.type === 'DELIVERY' ? Number(command.deliveryFee ?? data.settings.defaultDeliveryFee ?? 8) : 0;
      const total = Math.max(0, subtotal + serviceFee + deliveryFee - discount);
      const created = { ...command, id: Date.now(), branchId, code: `OFF-${String(data.orders.length + 1).padStart(4, '0')}`, status: 'RECEIVED', createdAt: new Date().toISOString(), subtotal, serviceFee, deliveryFee, discount, total, items: lines, paymentMethod: (command.payments || []).map(x => x.method).join(' + ') || command.paymentMethod || 'A definir' };
      setData(current => ({ ...current, orders: [created, ...current.orders] }));
      if (session && !session.demo) {
        const queue = JSON.parse(localStorage.getItem('aurora_pending_orders') || '[]');
        queue.push({ branchId, command, createdAt: new Date().toISOString() }); localStorage.setItem('aurora_pending_orders', JSON.stringify(queue));
        notify(`Pedido ${created.code} salvo offline; sincronização automática pendente`);
      } else notify(`Pedido ${created.code} criado no modo demonstração`);
      return created;
    }
  };

  const setOrderStatus = async (id, status) => {
    try { if (!session?.demo) await api.patch(`/orders/${id}/status`, { status }); }
    catch (error) { if (error?.response) { notify(apiMessage(error)); return false; } }
    setData(current => ({ ...current, orders: current.orders.map(order => order.id === id ? { ...order, status } : order) }));
    notify(`Pedido atualizado: ${labels[status]}`); return true;
  };
  const claimDelivery = async id => {
    let assigned;
    try { if (!session?.demo) assigned = (await api.patch(`/orders/${id}/assign-self`)).data; }
    catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, orders: current.orders.map(order => order.id === id ? (assigned || { ...order, deliveryDriver: session?.user?.name }) : order) }));
    notify('Entrega atribuída ao seu usuário'); return true;
  };
  const setTableStatus = async (id, status) => {
    try { if (!session?.demo) await api.patch(`/tables/${id}/status`, { status }); } catch (error) { if (error?.response) return notify(apiMessage(error)); }
    setData(current => ({ ...current, tables: current.tables.map(table => table.id === id ? { ...table, status } : table) })); notify(`Mesa atualizada: ${labels[status]}`);
  };
  const addProduct = async product => {
    let created = { ...product, id: Date.now(), active: true };
    try { if (!session?.demo) created = (await api.post('/products', product)).data; } catch (error) { if (error?.response) return notify(apiMessage(error)); }
    setData(current => ({ ...current, products: [...current.products, created] })); notify('Produto adicionado ao cardápio'); return created;
  };
  const updateProduct = async (id, product) => {
    let updated = { ...product, id };
    try { if (!session?.demo) updated = (await api.put(`/products/${id}`, product)).data; } catch (error) { if (error?.response) return notify(apiMessage(error)); }
    setData(current => ({ ...current, products: current.products.map(item => item.id === id ? updated : item) })); notify('Produto atualizado'); return updated;
  };
  const saveRecipe = async (productId, recipe) => {
    try { if (!session?.demo) await api.put(`/products/${productId}/recipe`, recipe); notify('Ficha técnica salva e vinculada ao estoque'); return true; }
    catch (error) { notify(apiMessage(error)); return false; }
  };
  const addCustomer = async customer => {
    let created = { ...customer, id: Date.now(), ordersCount: 0, loyaltyPoints: 0, totalSpent: 0 };
    try { if (!session?.demo) created = (await api.post('/customers', customer)).data; } catch (error) { if (error?.response) return notify(apiMessage(error)); }
    setData(current => ({ ...current, customers: [...current.customers, created] })); notify('Cliente cadastrado com sucesso'); return created;
  };
  const adjustLoyalty = async (customerId, payload) => {
    let updated;
    try { if (!session?.demo) updated = (await api.post(`/customers/${customerId}/loyalty`, payload)).data; } catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, customers: current.customers.map(customer => customer.id === customerId ? (updated || { ...customer, loyaltyPoints: Number(customer.loyaltyPoints || 0) + (payload.type === 'REDEEM' ? -Math.abs(payload.points) : Number(payload.points)) }) : customer) }));
    notify('Saldo de fidelidade atualizado'); return true;
  };
  const adjustStock = async (id, payload) => {
    let updated;
    try { if (!session?.demo) updated = (await api.patch(`/inventory/${id}`, payload)).data; } catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, inventory: current.inventory.map(item => item.id === id ? (updated || { ...item, quantity: payload.absolute ? Number(payload.quantity) : Number(item.quantity) + Number(payload.quantity) }) : item) }));
    notify('Movimento de estoque registrado'); return true;
  };
  const createReservation = async payload => {
    let created = { ...payload, id: Date.now(), tableNumber: data.tables.find(table => table.id === Number(payload.tableId))?.number, status: 'CONFIRMED', createdAt: new Date().toISOString() };
    try { if (!session?.demo) created = (await api.post('/reservations', payload)).data; } catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, reservations: [...current.reservations, created], tables: current.tables.map(table => table.id === Number(payload.tableId) ? { ...table, status: 'RESERVED' } : table) })); notify('Reserva confirmada'); return created;
  };
  const updateReservation = async (id, status) => {
    try { if (!session?.demo) await api.patch(`/reservations/${id}/status`, { status }); } catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, reservations: current.reservations.map(item => item.id === id ? { ...item, status } : item) })); notify(`Reserva: ${labels[status]}`); return true;
  };
  const addFinance = async payload => {
    let created = { ...payload, id: Date.now() };
    try { if (!session?.demo) created = (await api.post('/finance', payload)).data; } catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, finance: [created, ...current.finance] })); notify('Lançamento financeiro criado'); return created;
  };
  const addSupplier = async payload => {
    let created = { ...payload, id: Date.now(), active: true };
    try { if (!session?.demo) created = (await api.post('/suppliers', payload)).data; } catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, suppliers: [...current.suppliers, created] })); notify('Fornecedor cadastrado'); return created;
  };
  const createPurchase = async payload => {
    let created = { ...payload, id: Date.now(), code: `PC-OFF-${data.purchases.length + 1}`, supplierName: data.suppliers.find(x => x.id === Number(payload.supplierId))?.name, status: 'SENT', createdAt: new Date().toISOString(), total: payload.items.reduce((sum, x) => sum + Number(x.quantity) * Number(x.unitCost), 0), items: payload.items.map(x => ({ ...x, inventoryItemName: data.inventory.find(i => i.id === Number(x.inventoryItemId))?.name, lineTotal: Number(x.quantity) * Number(x.unitCost) })) };
    try { if (!session?.demo) created = (await api.post('/purchases', payload)).data; } catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, purchases: [created, ...current.purchases] })); notify(`Pedido de compra ${created.code} enviado`); return created;
  };
  const receivePurchase = async id => {
    let received;
    try { if (!session?.demo) received = (await api.post(`/purchases/${id}/receive`)).data; } catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, purchases: current.purchases.map(item => item.id === id ? (received || { ...item, status: 'RECEIVED', receivedDate: new Date().toISOString().slice(0, 10) }) : item) }));
    notify('Compra recebida; estoque e financeiro atualizados'); if (!session?.demo) loadData(branchId, true); return true;
  };
  const cashAction = async (path, payload) => {
    let response;
    try { if (!session?.demo) response = (await api.post(path, payload)).data; } catch (error) { notify(apiMessage(error)); return false; }
    if (!response) {
      const now = new Date().toISOString();
      if (path.endsWith('/open')) response = { status: 'OPEN', expectedCash: Number(payload.openingAmount), session: { id: Date.now(), status: 'OPEN', openingAmount: Number(payload.openingAmount), openedAt: now }, totals: {}, movements: [] };
      else if (path.endsWith('/movements')) response = { ...data.cash, movements: [{ ...payload, id: Date.now(), createdAt: now }, ...(data.cash.movements || [])], expectedCash: Number(data.cash.expectedCash || 0) + (payload.type === 'WITHDRAWAL' ? -Number(payload.amount) : Number(payload.amount)) };
      else response = { ...data.cash, status: 'CLOSED', session: { ...data.cash.session, status: 'CLOSED', countedAmount: Number(payload.countedAmount), closedAt: now }, movements: data.cash.movements || [], totals: data.cash.totals || {} };
    }
    setData(current => ({ ...current, cash: response })); notify(path.endsWith('/close') ? 'Caixa fechado e conferido' : path.endsWith('/open') ? 'Caixa aberto com sucesso' : 'Movimento de caixa registrado'); return response;
  };
  const saveSettings = async payload => {
    let saved = payload;
    try { if (!session?.demo) saved = (await api.put('/settings', payload)).data; } catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, settings: saved })); notify('Configurações salvas'); return saved;
  };
  const addUser = async payload => {
    let created = { ...payload, id: Date.now(), active: true };
    try { if (!session?.demo) created = (await api.post('/users', payload)).data; } catch (error) { notify(apiMessage(error)); return false; }
    setData(current => ({ ...current, users: [...current.users, created] })); notify('Colaborador criado com acesso seguro'); return created;
  };
  const validateCoupon = async (code, subtotal) => {
    try { if (!session?.demo) return (await api.post('/coupons/validate', { code, subtotal })).data; }
    catch (error) { throw new Error(apiMessage(error, 'Cupom inválido')); }
    const coupon = data.coupons.find(value => value.code === code.trim().toUpperCase());
    if (!coupon) throw new Error('Cupom inválido');
    return { code: coupon.code, description: coupon.description, discount: coupon.type === 'PERCENT' ? subtotal * coupon.value / 100 : Math.min(subtotal, coupon.value) };
  };

  const notifications = useMemo(() => {
    const items = [];
    const low = data.inventory.filter(item => Number(item.quantity) <= Number(item.minimumQuantity));
    if (low.length) items.push({ id: 'stock', icon: 'boxes', title: `${low.length} insumo(s) em nível crítico`, text: 'Revise a sugestão automática de compras.', to: '/estoque' });
    const late = data.orders.filter(order => !['COMPLETED', 'DELIVERED', 'CANCELED'].includes(order.status) && Date.now() - new Date(order.createdAt).getTime() > 25 * 60000);
    if (late.length) items.push({ id: 'late', icon: 'clock', title: `${late.length} pedido(s) acima do SLA`, text: 'A cozinha precisa de atenção agora.', to: '/cozinha' });
    const due = data.finance.filter(entry => entry.status === 'OVERDUE');
    if (due.length) items.push({ id: 'finance', icon: 'wallet', title: `${due.length} conta(s) vencida(s)`, text: 'Regularize o fluxo financeiro.', to: '/financeiro' });
    return items;
  }, [data.finance, data.inventory, data.orders]);

  const value = {
    ...data, session, user: session?.user, authenticated: Boolean(session), branchId, online, socketOnline, loading, authLoading,
    toast, lastSync, notifications, unreadNotifications: notificationsReadAt ? 0 : notifications.length,
    login, logout, selectBranch, refresh: () => loadData(branchId), notify, markNotificationsRead: () => setNotificationsReadAt(Date.now()),
    createOrder, setOrderStatus, claimDelivery, setTableStatus, addProduct, updateProduct, saveRecipe, addCustomer, adjustLoyalty,
    adjustStock, createReservation, updateReservation, addFinance, addSupplier, createPurchase, receivePurchase,
    openCash: payload => cashAction('/cash/open', payload), cashMovement: payload => cashAction('/cash/movements', payload),
    closeCash: payload => cashAction('/cash/close', payload), saveSettings, addUser, validateCoupon,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);

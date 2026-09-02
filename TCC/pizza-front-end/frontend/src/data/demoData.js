export const demoProducts = [
  { id: 1, name: 'Margherita Suprema', category: 'Pizzas', description: 'San Marzano, fior di latte e pesto de manjericão', price: 54.9, cost: 18.2, accent: '#e9652d', active: true },
  { id: 2, name: 'Pepperoni Piccante', category: 'Pizzas', description: 'Pepperoni artesanal, mozzarella e mel apimentado', price: 64.9, cost: 22.8, accent: '#d84032', active: true },
  { id: 3, name: 'Burrata & Parma', category: 'Pizzas', description: 'Burrata cremosa, presunto cru e rúcula selvagem', price: 78.9, cost: 31.5, accent: '#8d5d43', active: true },
  { id: 4, name: 'Quattro Formaggi', category: 'Pizzas', description: 'Mozzarella, gorgonzola, provolone e parmesão', price: 69.9, cost: 25.3, accent: '#d79532', active: true },
  { id: 5, name: 'Trufada Funghi', category: 'Pizzas', description: 'Cogumelos, creme de trufas e tomilho fresco', price: 76.9, cost: 29.4, accent: '#7a6048', active: true },
  { id: 6, name: 'Diavola', category: 'Pizzas', description: 'Calabresa artesanal, cebola roxa e pimenta', price: 61.9, cost: 21.1, accent: '#b7352b', active: true },
  { id: 7, name: 'Burrata ao Forno', category: 'Entradas', description: 'Tomates confitados, focaccia e azeite de ervas', price: 38, cost: 13.2, accent: '#cc7042', active: true },
  { id: 8, name: 'Arancini', category: 'Entradas', description: 'Bolinhos de risoto, queijo e aioli de limão', price: 32, cost: 11.4, accent: '#da9b36', active: true },
  { id: 9, name: 'Tiramisù da Casa', category: 'Sobremesas', description: 'Mascarpone, espresso e cacau belga', price: 26, cost: 8.3, accent: '#654438', active: true },
  { id: 10, name: 'Cannoli de Pistache', category: 'Sobremesas', description: 'Ricota doce, pistache e chocolate amargo', price: 24, cost: 7.8, accent: '#72864d', active: true },
  { id: 11, name: 'Limonata Siciliana', category: 'Bebidas', description: 'Limão siciliano, soda e alecrim', price: 14, cost: 3.9, accent: '#8ea94f', active: true },
  { id: 12, name: 'Vinho Tinto da Casa', category: 'Bebidas', description: 'Taça de corte italiano selecionado', price: 28, cost: 9.5, accent: '#77323b', active: true },
];

export const demoTables = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, number: i + 1, seats: i % 4 === 3 ? 6 : 4, area: i < 6 ? 'Salão principal' : 'Terraço', status: [3, 7, 9].includes(i + 1) ? 'OCCUPIED' : i === 10 ? 'RESERVED' : 'AVAILABLE' }));
export const demoCustomers = [
  { id: 1, name: 'Marina Costa', phone: '(11) 99942-1820', email: 'marina@email.com', address: 'Alameda Santos, 420', ordersCount: 18 },
  { id: 2, name: 'Rafael Almeida', phone: '(11) 98831-4402', email: 'rafael@email.com', address: 'Rua Oscar Freire, 88', ordersCount: 12 },
  { id: 3, name: 'Bianca Ferreira', phone: '(11) 97710-2265', email: 'bianca@email.com', address: 'Rua Bela Cintra, 710', ordersCount: 9 },
  { id: 4, name: 'Lucas Martins', phone: '(11) 96622-8091', email: 'lucas@email.com', address: 'Av. Paulista, 1560', ordersCount: 7 },
];
export const demoInventory = [
  ['Farinha italiana 00', 'kg', 42.5, 18, 'Casa do Padeiro'], ['Mozzarella fior di latte', 'kg', 8.4, 10, 'Laticínios Aurora'],
  ['Tomate San Marzano', 'kg', 14.2, 8, 'Empório Itália'], ['Pepperoni artesanal', 'kg', 5.1, 4, 'Salumeria Roma'],
  ['Burrata', 'un', 6, 8, 'Laticínios Aurora'], ['Azeite extravirgem', 'l', 11, 5, 'Empório Itália'],
  ['Caixas delivery G', 'un', 84, 50, 'Pack Food'], ['Cogumelos frescos', 'kg', 2.2, 3, 'Horta Viva'],
].map((x, i) => ({ id: i + 1, name: x[0], unit: x[1], quantity: x[2], minimumQuantity: x[3], supplier: x[4], expiresAt: `2026-0${9 + (i > 4 ? 1 : 0)}-${10 + i}` }));
const names = ['Marina Costa', 'Cliente balcão', 'Rafael Almeida', 'Bianca Ferreira'];
export const demoOrders = Array.from({ length: 14 }, (_, i) => {
  const p1 = demoProducts[i % 6], p2 = demoProducts[6 + (i % 5)];
  return { id: i + 1, code: `A${String(i + 1).padStart(4, '0')}`, status: ['PREPARING', 'READY', 'RECEIVED', 'COMPLETED'][i < 4 ? i : 3], type: ['DINE_IN', 'DELIVERY', 'PICKUP'][i % 3], tableNumber: i % 3 === 0 ? (i % 12) + 1 : null, customerName: names[i % names.length], paymentMethod: i % 2 ? 'PIX' : 'Cartão', total: p1.price + p2.price, createdAt: new Date(Date.now() - i * 31 * 60000).toISOString(), items: [{ productId: p1.id, productName: p1.name, quantity: 1, unitPrice: p1.price }, { productId: p2.id, productName: p2.name, quantity: 1, unitPrice: p2.price }] };
});
export const demoFinance = [
  { id: 1, description: 'Fechamento do salão', category: 'Vendas', type: 'INCOME', status: 'PAID', amount: 4280.5, dueDate: '2026-09-02' },
  { id: 2, description: 'Fornecedor de laticínios', category: 'Fornecedores', type: 'EXPENSE', status: 'PENDING', amount: 1380, dueDate: '2026-09-04' },
  { id: 3, description: 'Energia elétrica', category: 'Operacional', type: 'EXPENSE', status: 'PENDING', amount: 864.3, dueDate: '2026-09-07' },
  { id: 4, description: 'Manutenção do forno', category: 'Manutenção', type: 'EXPENSE', status: 'OVERDUE', amount: 490, dueDate: '2026-08-31' },
];

export const demoDashboard = {
  revenueToday: 6342.8, revenueMonth: 42890.4, openOrders: 7, averageTicket: 86.7,
  occupiedTables: 3, availableTables: 9, lowStock: 3, customers: 284,
  weeklyRevenue: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label, i) => ({ label, value: [3920, 4580, 4210, 5380, 6840, 8920, 6342][i] })),
  channelMix: [{ label: 'Salão', value: 46 }, { label: 'Delivery', value: 38 }, { label: 'Retirada', value: 16 }],
};

export const demoBranches = [
  { id: 1, code: 'JARDINS', name: 'Aurora Jardins', address: 'Alameda dos Sabores, 188 · São Paulo, SP', active: true },
  { id: 2, code: 'PINHEIROS', name: 'Aurora Pinheiros', address: 'Rua dos Pinheiros, 874 · São Paulo, SP', active: true },
];

export const demoReservations = [
  { id: 1, tableId: 6, tableNumber: 6, customerId: 2, customerName: 'Rafael Almeida', phone: '(11) 98831-4402', reservedFor: new Date(Date.now() + 3 * 3600000).toISOString(), partySize: 4, status: 'CONFIRMED', notes: 'Aniversário' },
];

export const demoSuppliers = [
  { id: 1, name: 'Casa do Padeiro', document: '11.222.333/0001-40', contactName: 'Caio', phone: '(11) 3030-4411', leadTimeDays: 2, active: true },
  { id: 2, name: 'Laticínios Aurora', document: '22.333.444/0001-51', contactName: 'Lívia', phone: '(11) 3030-5522', leadTimeDays: 1, active: true },
  { id: 3, name: 'Empório Itália', document: '33.444.555/0001-62', contactName: 'Marco', phone: '(11) 3030-6633', leadTimeDays: 3, active: true },
];

export const demoPurchases = [
  { id: 1, code: 'PC-DEMO-JARDINS', supplierId: 2, supplierName: 'Laticínios Aurora', status: 'SENT', expectedDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), total: 756, createdAt: new Date().toISOString(), items: [{ inventoryItemId: 2, inventoryItemName: 'Mozzarella fior di latte', quantity: 18, unitCost: 42, lineTotal: 756 }] },
];

export const demoStockMovements = [
  { id: 1, inventoryItemId: 1, inventoryItemName: 'Farinha italiana 00', type: 'PURCHASE', quantity: 25, balanceAfter: 42.5, reason: 'Recebimento de compra', performedBy: 'admin@aurora.pizza', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 2, inventoryItemId: 2, inventoryItemName: 'Mozzarella fior di latte', type: 'SALE', quantity: -0.36, balanceAfter: 8.4, reason: 'Baixa automática por ficha técnica', referenceCode: 'A0018', performedBy: 'system', createdAt: new Date(Date.now() - 3600000).toISOString() },
];

export const demoCash = {
  status: 'OPEN', expectedCash: 400,
  session: { id: 1, status: 'OPEN', openingAmount: 300, openedBy: 'admin@aurora.pizza', openedAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  totals: { sales: 0, cashSales: 0, supplies: 100, outflows: 0 },
  movements: [{ id: 1, type: 'SUPPLY', amount: 100, description: 'Reforço de troco', paymentMethod: 'Dinheiro', performedBy: 'admin@aurora.pizza', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() }],
};

export const demoSettings = {
  id: 1, tradeName: 'Aurora Pizza Contemporânea', document: '12.345.678/0001-90', phone: '(11) 3456-7890', address: 'Alameda dos Sabores, 188 · São Paulo, SP',
  serviceFeePercent: 10, minimumDeliveryOrder: 35, defaultDeliveryFee: 8, averagePrepMinutes: 35, maxDeliveryRadiusKm: 8,
  automaticAcceptance: true, allowNotes: true, printTicket: false, pixEnabled: true, cardEnabled: true, cashEnabled: true, pixKey: 'financeiro@aurorapizza.com.br',
};

export const demoCoupons = [
  { id: 1, code: 'AURORA10', description: '10% de boas-vindas', type: 'PERCENT', value: 10, active: true },
  { id: 2, code: 'FAMILIA15', description: 'R$ 15 para pedidos em família', type: 'FIXED', value: 15, active: true },
];

export const demoIntelligence = {
  revenue: 42890.4, productCost: 13467.58, expenses: 2734.3, grossProfit: 29422.82, netResult: 26688.52, cmvPercent: 31.4, grossMarginPercent: 68.6,
  menuEngineering: demoProducts.slice(0, 6).map((p, index) => ({ name: p.name, quantity: [184, 162, 149, 121, 98, 84][index], revenue: p.price * [184, 162, 149, 121, 98, 84][index], contribution: (p.price - p.cost) * [184, 162, 149, 121, 98, 84][index], classification: index < 2 ? 'ESTRELA' : index < 4 ? 'POPULAR' : 'OPORTUNIDADE' })),
  hourlyDemand: ['11h', '12h', '13h', '14h', '18h', '19h', '20h', '21h', '22h', '23h'].map((hour, index) => ({ hour, orders: [4, 12, 9, 3, 8, 21, 31, 27, 16, 6][index] })),
  forecast: Array.from({ length: 7 }, (_, index) => ({ date: new Date(Date.now() + (index + 1) * 86400000).toISOString().slice(0, 10), projectedRevenue: [6200, 6450, 7100, 8950, 9680, 7440, 5820][index], projectedOrders: [72, 75, 82, 102, 111, 86, 68][index] })),
  purchaseSuggestions: demoInventory.filter(x => Number(x.quantity) <= Number(x.minimumQuantity)).map(x => ({ inventoryItemId: x.id, name: x.name, current: x.quantity, suggestedQuantity: Math.max(0, x.minimumQuantity * 3 - x.quantity), supplier: x.supplier })),
  alerts: [{ level: 'warning', title: 'Risco de ruptura', message: '3 insumos precisam de reposição' }, { level: 'success', title: 'Previsão de demanda', message: 'Prepare 28% mais massa para sexta e sábado' }],
};

export const demoUsers = [
  { id: 1, name: 'Davi Fernandes', email: 'admin@aurora.pizza', role: 'ADMIN', active: true },
  { id: 2, name: 'Marina Costa', email: 'gerente@aurora.pizza', role: 'MANAGER', active: true },
  { id: 3, name: 'João Silva', email: 'cozinha@aurora.pizza', role: 'KITCHEN', active: true },
  { id: 4, name: 'Ana Lima', email: 'caixa@aurora.pizza', role: 'CASHIER', active: true },
];

export const demoAudit = [
  { id: 1, actor: 'admin@aurora.pizza', action: 'OPEN', entityType: 'CASH_SESSION', entityId: '1', details: 'Fundo R$ 300,00', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 2, actor: 'gerente@aurora.pizza', action: 'UPDATE_RECIPE', entityType: 'PRODUCT', entityId: '2', details: '4 componentes', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
];

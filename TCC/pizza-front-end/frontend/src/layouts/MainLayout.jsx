import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import { labels, useApp } from '../context/AppContext';

const sections = [
  { label: 'Operação', items: [
    ['/visao-geral', 'grid', 'Visão geral', ['ADMIN','MANAGER','CASHIER','WAITER']], ['/pdv', 'cart', 'Novo pedido', ['ADMIN','MANAGER','CASHIER','WAITER']],
    ['/cozinha', 'chef', 'Cozinha • KDS', ['ADMIN','MANAGER','KITCHEN']], ['/pedidos', 'receipt', 'Pedidos', ['ADMIN','MANAGER','CASHIER','KITCHEN','WAITER']],
    ['/entregas', 'truck', 'Minhas entregas', ['ADMIN','MANAGER','DELIVERY']], ['/jornada', 'clock', 'Minha jornada', ['ADMIN','MANAGER','CASHIER','KITCHEN','WAITER','DELIVERY']], ['/mesas', 'table', 'Mesas & reservas', ['ADMIN','MANAGER','CASHIER','WAITER']], ['/caixa', 'cash', 'Caixa', ['ADMIN','MANAGER','CASHIER']],
  ] },
  { label: 'Gestão', items: [
    ['/cardapio', 'pizza', 'Cardápio & fichas', ['ADMIN','MANAGER']], ['/estoque', 'boxes', 'Estoque', ['ADMIN','MANAGER','KITCHEN']],
    ['/compras', 'supplier', 'Compras', ['ADMIN','MANAGER']], ['/clientes', 'users', 'Clientes & CRM', ['ADMIN','MANAGER','CASHIER']],
    ['/financeiro', 'wallet', 'Financeiro', ['ADMIN','MANAGER']], ['/comercial', 'sparkles', 'Central comercial', ['ADMIN','MANAGER','CASHIER']], ['/automacoes', 'bell', 'Automações WhatsApp', ['ADMIN','MANAGER']], ['/avaliacoes', 'sparkles', 'Experiência & qualidade', ['ADMIN','MANAGER']], ['/relatorios', 'chart', 'Inteligência', ['ADMIN','MANAGER']],
  ] },
  { label: 'Sistema', items: [['/configuracoes', 'settings', 'Configurações', ['ADMIN','MANAGER']], ['/privacidade', 'lock', 'Privacidade & LGPD', ['ADMIN']], ['/auditoria', 'shield', 'Auditoria', ['ADMIN']]] },
];
const titles = {
  '/': ['Aurora Pizza', 'Operação segura'], '/visao-geral': ['Visão geral', 'Seu negócio, agora'], '/pdv': ['Frente de caixa', 'Venda rápida e personalizada'], '/cozinha': ['Kitchen Display', 'Produção em tempo real'], '/entregas': ['Minhas entregas', 'Rotas prontas para sair'], '/jornada': ['Minha jornada', 'Ponto e turnos da equipe'],
  '/pedidos': ['Pedidos', 'Todos os canais e entregas'], '/mesas': ['Mesas & reservas', 'Salão e autoatendimento'], '/caixa': ['Caixa', 'Conciliação do turno'],
  '/cardapio': ['Cardápio', 'Produtos, tamanhos e fichas técnicas'], '/estoque': ['Estoque inteligente', 'Saldos e rastreabilidade'], '/compras': ['Compras', 'Fornecedores e reposição'],
  '/clientes': ['Clientes', 'CRM e fidelidade'], '/financeiro': ['Financeiro', 'Fluxo de caixa e DRE'], '/comercial': ['Central comercial', 'Cobranças, relacionamento e fiscal'], '/automacoes': ['Automações WhatsApp', 'Mensagens e eventos operacionais'], '/avaliacoes': ['Experiência & qualidade', 'Voz do cliente por pedido'], '/relatorios': ['Aura Intelligence', 'Previsões e decisões'],
  '/configuracoes': ['Configurações', 'Personalize sua operação'], '/privacidade': ['Privacidade & LGPD', 'Governança dos dados pessoais'], '/auditoria': ['Auditoria', 'Integridade e conformidade'],
};

export default function MainLayout() {
  const [open, setOpen] = useState(false); const [collapsed, setCollapsed] = useState(() => localStorage.getItem('aurora_sidebar_collapsed') === 'true'); const [notificationsOpen, setNotificationsOpen] = useState(false); const [profileOpen, setProfileOpen] = useState(false); const [installPrompt, setInstallPrompt] = useState(null);
  const location = useLocation(); const { online, socketOnline, toast, user, logout, orders, branches, branchId, selectBranch, notifications, unreadNotifications, markNotificationsRead, lastSync } = useApp();
  const title = titles[location.pathname] || titles['/']; const activeOrders = orders.filter(order => !['COMPLETED','DELIVERED','CANCELED'].includes(order.status)).length;
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); setNotificationsOpen(false); setProfileOpen(false); }, [location.pathname]);
  useEffect(() => { const handler = event => { event.preventDefault(); setInstallPrompt(event); }; window.addEventListener('beforeinstallprompt', handler); return () => window.removeEventListener('beforeinstallprompt', handler); }, []);
  const install = async () => { if (!installPrompt) return; await installPrompt.prompt(); setInstallPrompt(null); };
  const toggleCollapsed = () => setCollapsed(current => { const next = !current; localStorage.setItem('aurora_sidebar_collapsed', String(next)); setProfileOpen(false); return next; });
  const visibleSections = sections.map(section => ({ ...section, items: section.items.filter(item => item[3].includes(user?.role || 'ADMIN')) })).filter(section => section.items.length);
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand-block"><span className="brand-mark"><Icon name="pizza" /></span><div className="brand-copy"><strong>Aurora Pizza</strong><span>Operating System</span></div><button type="button" aria-label="Fechar menu" className="icon-button sidebar-close" onClick={() => setOpen(false)}><Icon name="close" /></button></div><button type="button" aria-label={collapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'} title={collapsed ? 'Expandir menu' : 'Minimizar menu'} className="sidebar-collapse" onClick={toggleCollapsed}><Icon name="arrow" /></button>
      <div className="branch-switcher"><span className="branch-dot">A</span><div><label htmlFor="active-branch">Unidade ativa</label><select id="active-branch" value={branchId} onChange={event => selectBranch(event.target.value)} disabled={user?.role !== 'ADMIN'}>{branches.filter(branch => user?.role === 'ADMIN' || Number(branch.id) === Number(user?.branchId)).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div><Icon name="store" /></div>
      <div className="sidebar-scroll">{visibleSections.map(section => <nav className="nav-section" key={section.label}><p className="nav-label">{section.label}</p><ul className="nav-list">{section.items.map(([to, icon, label]) => <li key={to}><NavLink end={to === '/'} to={to} title={collapsed ? label : undefined} aria-label={label} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}><Icon name={icon} /><span>{label}</span>{to === '/cozinha' && activeOrders > 0 && <b className="nav-count">{activeOrders}</b>}</NavLink></li>)}</ul></nav>)}</div>
      {installPrompt && <button className="install-app" onClick={install}><Icon name="download" /><span><b>Instalar Aurora</b><small>Use como aplicativo</small></span></button>}
      <div className="sidebar-footer"><button type="button" aria-label="Abrir menu do usuário" className="user-chip" onClick={() => setProfileOpen(!profileOpen)}><span className="user-avatar">{user?.name?.split(' ').map(part => part[0]).slice(0, 2).join('') || 'AU'}</span><div className="user-meta"><strong>{user?.name || 'Usuário Aurora'}</strong><span>{labels[user?.role] || 'Operação'}</span></div><span className={`presence ${online ? 'online' : ''}`} /></button>{profileOpen && <div className="profile-popover"><div><small>Sessão atual</small><strong>{user?.email}</strong></div><button type="button" onClick={logout}><Icon name="logout" />Sair com segurança</button></div>}</div>
    </aside>
    {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
    <main className="app-main"><header className="topbar"><div className="topbar-left"><button type="button" aria-label="Abrir menu" className="icon-button menu-button" onClick={() => setOpen(true)}><Icon name="menu" /></button><div><h2 className="topbar-title">{title[0]}</h2><span className="topbar-subtitle">{title[1]}</span></div></div><div className="topbar-right"><span className={`api-state ${online ? 'connected' : ''}`} title={lastSync ? `Última sincronização ${lastSync.toLocaleTimeString('pt-BR')}` : ''}><i />{online ? (socketOnline ? 'Tempo real' : 'API conectada') : 'Modo offline'}</span><div className="topbar-date"><Icon name="clock" />{new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date())}</div><div className="notification-wrap"><button type="button" aria-label="Abrir central de notificações" className="icon-button notification" onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); markNotificationsRead(); }}><Icon name="bell" />{unreadNotifications > 0 && <i />}</button>{notificationsOpen && <div className="notification-panel"><header><div><strong>Central de atenção</strong><span>{notifications.length} alerta(s) operacional(is)</span></div><Icon name="sparkles" /></header>{notifications.length ? notifications.map(item => <NavLink to={item.to} key={item.id}><span><Icon name={item.icon} /></span><div><strong>{item.title}</strong><p>{item.text}</p></div><Icon name="arrow" /></NavLink>) : <div className="notifications-empty"><Icon name="check" /><strong>Tudo sob controle</strong><span>Nenhuma pendência crítica agora.</span></div>}</div>}</div></div></header>{!online && <div className="offline-banner"><Icon name="refresh" /><span><b>Operação offline protegida.</b> Pedidos ficam salvos neste dispositivo e serão sincronizados quando a API voltar.</span></div>}<div className="content-area"><Outlet /></div></main>
    {toast && <div className="toast"><span><Icon name="check" /></span>{toast}</div>}
  </div>;
}

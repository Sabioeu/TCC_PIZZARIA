import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';

const sections = [
  { label: 'Operação', items: [['/', 'grid', 'Visão geral'], ['/pdv', 'cart', 'Novo pedido'], ['/cozinha', 'chef', 'Cozinha • KDS'], ['/pedidos', 'receipt', 'Pedidos'], ['/mesas', 'table', 'Mesas & salão']] },
  { label: 'Gestão', items: [['/cardapio', 'pizza', 'Cardápio'], ['/estoque', 'boxes', 'Estoque'], ['/clientes', 'users', 'Clientes'], ['/financeiro', 'wallet', 'Financeiro'], ['/relatorios', 'chart', 'Inteligência']] },
  { label: 'Sistema', items: [['/configuracoes', 'settings', 'Configurações']] },
];
const titles = { '/': ['Visão geral', 'Seu negócio, agora'], '/pdv': ['Frente de caixa', 'Venda rápida e sem atrito'], '/cozinha': ['Kitchen Display', 'Produção em tempo real'], '/pedidos': ['Pedidos', 'Acompanhe todos os canais'], '/mesas': ['Mesas & salão', 'Mapa operacional'], '/cardapio': ['Cardápio', 'Produtos e engenharia de menu'], '/estoque': ['Estoque inteligente', 'Controle de insumos'], '/clientes': ['Clientes', 'Relacionamento e fidelidade'], '/financeiro': ['Financeiro', 'Fluxo de caixa'], '/relatorios': ['Inteligência', 'Dados para decidir'], '/configuracoes': ['Configurações', 'Personalize sua operação'] };

export default function MainLayout() {
  const [open, setOpen] = useState(false); const location = useLocation(); const { online, toast } = useApp();
  const title = titles[location.pathname] || titles['/'];
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [location.pathname]);
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand-block"><span className="brand-mark"><Icon name="pizza" /></span><div className="brand-copy"><strong>Aurora Pizza</strong><span>Operating System</span></div><button className="icon-button sidebar-close" onClick={() => setOpen(false)}><Icon name="close" /></button></div>
      <div className="sidebar-scroll">{sections.map(section => <nav className="nav-section" key={section.label}><p className="nav-label">{section.label}</p><ul className="nav-list">{section.items.map(([to, icon, label]) => <li key={to}><NavLink end={to === '/'} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}><Icon name={icon} /><span>{label}</span>{to === '/cozinha' && <b className="nav-count">3</b>}</NavLink></li>)}</ul></nav>)}</div>
      <div className="sidebar-footer"><div className="user-chip"><span className="user-avatar">DF</span><div className="user-meta"><strong>Davi Fernandes</strong><span>Administrador geral</span></div><span className={`presence ${online ? 'online' : ''}`} /></div></div>
    </aside>
    {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
    <main className="app-main"><header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" onClick={() => setOpen(true)}><Icon name="menu" /></button><div><h2 className="topbar-title">{title[0]}</h2><span className="topbar-subtitle">{title[1]}</span></div></div><div className="topbar-right"><span className={`api-state ${online ? 'connected' : ''}`}><i />{online ? 'API conectada' : 'Modo demo'}</span><div className="topbar-date"><Icon name="clock" />{new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date())}</div><button className="icon-button notification"><Icon name="bell" /><i /></button></div></header><div className="content-area"><Outlet /></div></main>
    {toast && <div className="toast"><span><Icon name="check" /></span>{toast}</div>}
  </div>;
}

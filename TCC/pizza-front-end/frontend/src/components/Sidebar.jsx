import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { useAuth, podeAcessar } from '../auth/AuthContext';

const sections = [
  {
    label: 'Principal',
    items: [
      { to: '/', icon: 'dashboard', label: 'Dashboard', end: true },
      { to: '/pedidos', icon: 'orders', label: 'Novo pedido' },
      { to: '/comandas', icon: 'receipt', label: 'Comandas' },
      { to: '/mesas', icon: 'tables', label: 'Mesas' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/transacoes-financeiras', icon: 'finance', label: 'Financeiro' },
      { to: '/contas-a-pagar', icon: 'wallet', label: 'Contas a pagar' },
      { to: '/estoque', icon: 'inventory', label: 'Estoque' },
      { to: '/relatorios', icon: 'reports', label: 'Relatórios' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { to: '/cadastro-clientes', icon: 'clients', label: 'Clientes' },
      { to: '/cadastro-produtos', icon: 'products', label: 'Produtos' },
      { to: '/cadastro-insumo', icon: 'ingredients', label: 'Insumos' },
      { to: '/cadastro-fornecedores', icon: 'suppliers', label: 'Fornecedores' },
      { to: '/cadastro-usuario', icon: 'users', label: 'Usuários' },
    ],
  },
];

const Sidebar = ({ open, onClose }) => {
  const { usuario, sair } = useAuth();
  const [saindo, setSaindo] = React.useState(false);
  const [erro, setErro] = React.useState('');
  const operacao = React.useRef(false);
  const logout = async () => { if (operacao.current) return; operacao.current = true; setSaindo(true); setErro(''); try { await sair(); } catch { setErro('Não foi possível sair. Tente novamente.'); } finally { operacao.current = false; setSaindo(false); } };
  return (
  <aside className={`sidebar ${open ? 'open' : ''}`}>
    <div className="brand-block">
      <div className="brand-mark"><Icon name="pizza" /></div>
      <div className="brand-copy">
        <strong>Modelos Pizza</strong>
        <span>Gestão inteligente</span>
      </div>
      <button aria-label="Fechar menu" type="button" className="icon-button sidebar-close" onClick={onClose}>
        <Icon name="close" />
      </button>
    </div>

    <nav className="sidebar-scroll" aria-label="Navegação principal">
      {sections.map((section) => ({ ...section, items: section.items.filter((item) => podeAcessar(usuario, item.to)) })).filter((section) => section.items.length).map((section) => (
        <div className="nav-section" key={section.label}>
          <p className="nav-label">{section.label}</p>
          <ul className="nav-list">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end={item.end} to={item.to} onClick={onClose}>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>

    <div className="sidebar-footer">
      <div className="user-chip">
        <div className="user-avatar" aria-hidden="true">{(usuario?.nome || 'MP').split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase()}</div>
        <div className="user-meta">
            <strong>{usuario?.nome}</strong>
            <span>{usuario?.perfil}</span>
        </div>
      </div>
      {erro && <p role="alert" style={{ color: '#fca5a5', fontSize: 12 }}>{erro}</p>}
      <button className="button" type="button" disabled={saindo} onClick={logout} style={{ width: '100%', marginTop: 12 }}>{saindo ? 'Saindo...' : 'Sair do sistema'}</button>
    </div>
  </aside>
  );
};

export default Sidebar;

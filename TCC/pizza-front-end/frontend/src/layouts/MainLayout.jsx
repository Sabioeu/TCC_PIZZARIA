import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Icon from '../components/Icon';

const routeTitles = {
  '/': ['Visão geral', 'Acompanhe a operação em tempo real'],
  '/pedidos': ['Novo pedido', 'Atendimento e lançamento de itens'],
  '/comandas': ['Comandas', 'Acompanhamento e faturamento'],
  '/mesas': ['Gestão de mesas', 'Mapa de ocupação do salão'],
  '/transacoes-financeiras': ['Registros financeiros', 'Movimentações e receitas'],
  '/contas-a-pagar': ['Contas a pagar', 'Compromissos e fluxo de caixa'],
  '/cadastro-clientes': ['Clientes', 'Cadastro e relacionamento'],
  '/cadastro-produtos': ['Produtos', 'Cardápio e precificação'],
  '/cadastro-insumo': ['Insumos', 'Materiais e unidades'],
  '/cadastro-fornecedores': ['Fornecedores', 'Parceiros comerciais'],
  '/estoque': ['Estoque', 'Entradas e saldos de produtos'],
  '/cadastro-usuario': ['Usuários', 'Equipe e permissões'],
  '/relatorios': ['Relatórios', 'Documentos gerenciais'],
};

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const currentRoute = routeTitles[location.pathname] || ['Modelos Pizza', 'Sistema de gestão'];

  const currentDate = useMemo(() => new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date()), []);

  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <button aria-label="Fechar menu" className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button aria-label="Abrir menu" className="icon-button menu-button" onClick={() => setSidebarOpen(true)}>
              <Icon name="menu" />
            </button>
            <div>
              <h2 className="topbar-title">{currentRoute[0]}</h2>
              <span className="topbar-subtitle">{currentRoute[1]}</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-date">
              <Icon name="calendar" />
              <span>{currentDate}</span>
            </div>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;

import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Icon from '../components/Icon';
import * as Dialog from '@radix-ui/react-dialog';

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
  const [mobile, setMobile] = useState(() => window.innerWidth <= 920);
  const location = useLocation();
  const currentRoute = useMemo(() => routeTitles[location.pathname] || ['Modelos Pizza', 'Sistema de gestão'], [location.pathname]);

  const currentDate = useMemo(() => new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date()), []);

  useEffect(() => {
    setSidebarOpen(false);
    document.title = `${currentRoute[0]} · Modelos Pizza`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, currentRoute]);

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 920px)');
    if (!media) return undefined;
    const change = () => { setMobile(media.matches); setSidebarOpen(false); };
    change(); media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  return (
    <Dialog.Root open={sidebarOpen && mobile} onOpenChange={setSidebarOpen}><div className="app-shell">
      <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
      {!mobile && <Sidebar open={false} onClose={() => setSidebarOpen(false)} />}
      {mobile && <Dialog.Portal><Dialog.Overlay className="sidebar-overlay" /><Dialog.Content className="mobile-nav" aria-describedby={undefined}><Dialog.Title className="sr-only">Menu do sistema</Dialog.Title><Sidebar open onClose={() => setSidebarOpen(false)} /></Dialog.Content></Dialog.Portal>}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <Dialog.Trigger asChild><button aria-label="Abrir menu" type="button" className="icon-button menu-button">
              <Icon name="menu" />
            </button></Dialog.Trigger>
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

        <main className="content-area" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div></Dialog.Root>
  );
}

export default MainLayout;

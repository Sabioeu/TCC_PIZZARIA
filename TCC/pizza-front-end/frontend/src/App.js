import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';

import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import PedidosPage from './pages/PedidosPage';
import ComandasPage from './pages/ComandasPage';
import MesasPage from './pages/MesasPage';
import CadastroClientePage from './pages/CadastroClientePage';
import CadastroProdutoPage from './pages/CadastroProdutoPage';
import CadastroInsumoPage from './pages/CadastroInsumoPage';
import CadastroUsuarioPage from './pages/CadastroUsuarioPage';
import CadastroFornecedorPage from './pages/CadastroFornecedorPage';
import EstoquePage from './pages/EstoquePage';
import RelatoriosPage from './pages/RelatoriosPage';
import TransacoesFinanceirasPage from './pages/TransacoesFinanceirasPage';
import ContasAPagarPage from './pages/ContasAPagarPage';

function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route element={<MainLayout />} path="/">
          <Route element={<HomePage />} index />
          <Route element={<PedidosPage />} path="pedidos" />
          <Route element={<ComandasPage />} path="comandas" />
          <Route element={<MesasPage />} path="mesas" />
          <Route element={<CadastroClientePage />} path="cadastro-clientes" />
          <Route element={<CadastroProdutoPage />} path="cadastro-produtos" />
          <Route element={<CadastroInsumoPage />} path="cadastro-insumo" />
          <Route element={<CadastroUsuarioPage />} path="cadastro-usuario" />
          <Route element={<TransacoesFinanceirasPage />} path="transacoes-financeiras" />
          <Route element={<ContasAPagarPage />} path="contas-a-pagar" />
          <Route element={<CadastroFornecedorPage />} path="cadastro-fornecedores" />
          <Route element={<EstoquePage />} path="estoque" />
          <Route element={<RelatoriosPage />} path="relatorios" />
          <Route element={<HomePage />} path="*" />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

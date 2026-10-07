import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';

const PedidosPage = () => {
  const { usuario } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [mesaSelecionada, setMesaSelecionada] = useState('');
  const [comandaExistenteId, setComandaExistenteId] = useState(null);
  const [isFinalizando, setIsFinalizando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      setError('');
      try {
        const [resCli, resProds, resMesas] = await Promise.all([
          api.get('/clientes'),
          api.get('/produtos'),
          api.get('/mesas'),
        ]);
        setClientes(resCli.data || []);
        setProdutos(resProds.data || []);
        setMesas((resMesas.data || []).filter((mesa) => mesa.ativo));
      } catch (err) {
        console.error('Erro ao carregar dados do pedido:', err);
        setError('Não foi possível carregar clientes, produtos e mesas. Verifique a conexão com o servidor.');
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  useEffect(() => {
    if (!mesaSelecionada) {
      setComandaExistenteId(null);
      setClienteSelecionado('');
      return;
    }

    api.get('/comandas/abertas').then((response) => {
      const encontrada = (response.data || []).find(
        (comanda) => comanda.mesa && comanda.mesa.id === Number(mesaSelecionada),
      );
      if (encontrada) {
        setComandaExistenteId(encontrada.id);
        setClienteSelecionado(encontrada.cliente?.id || '');
      } else {
        setComandaExistenteId(null);
        setClienteSelecionado('');
      }
    }).catch((err) => {
      console.error('Erro ao verificar a mesa:', err);
      setError('Não foi possível verificar se a mesa possui uma comanda aberta.');
    });
  }, [mesaSelecionada]);

  const produtosFiltrados = useMemo(() => produtos.filter((produto) => (
    `${produto.nome} ${produto.descricao || ''}`.toLowerCase().includes(busca.toLowerCase())
  )), [busca, produtos]);

  const totalPedido = useMemo(() => carrinho.reduce(
    (total, item) => total + Number(item.preco || 0) * item.quantidade,
    0,
  ), [carrinho]);

  const adicionarAoCarrinho = (produto) => {
    setCarrinho((atual) => {
      const existente = atual.find((item) => item.id === produto.id);
      return existente
        ? atual.map((item) => item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item)
        : [...atual, { ...produto, quantidade: 1 }];
    });
  };

  const alterarQuantidade = (id, delta) => {
    setCarrinho((atual) => atual
      .map((item) => item.id === id ? { ...item, quantidade: item.quantidade + delta } : item)
      .filter((item) => item.quantidade > 0));
  };

  const finalizarPedido = async () => {
    const precisaValidarCliente = !comandaExistenteId;
    if (!mesaSelecionada || (precisaValidarCliente && !clienteSelecionado) || carrinho.length === 0) {
      setError('Selecione a mesa, o cliente e adicione pelo menos um item ao pedido.');
      return;
    }

    setIsFinalizando(true);
    setError('');
    const payload = {
      clienteId: Number(clienteSelecionado),
      mesaId: Number(mesaSelecionada),
      usuarioId: usuario.id,
      itens: carrinho.map((item) => ({
        produtoId: Number(item.id),
        quantidade: Number(item.quantidade),
        precoUnitario: Number(item.preco),
      })),
    };

    try {
      if (comandaExistenteId) {
        await api.put(`/comandas/${comandaExistenteId}/adicionar-itens`, payload);
      } else {
        await api.post('/comandas', payload);
      }
      navigate('/comandas');
    } catch (err) {
      console.error('Erro ao processar o pedido:', err);
      setError(err.response?.data?.message || 'Não foi possível processar o pedido. Revise os dados e tente novamente.');
    } finally {
      setIsFinalizando(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        description="Selecione a mesa, associe o cliente e monte o pedido a partir do cardápio."
        eyebrow="Atendimento"
        title="Novo pedido"
      />

      {error && <div className="alert alert-error"><Icon name="alert" size={17} />{error}</div>}

      <section className="order-context">
        <div className={`mode-banner ${comandaExistenteId ? 'existing' : ''}`}>
          <span>{comandaExistenteId ? `Comanda #${comandaExistenteId} encontrada para esta mesa` : 'Uma nova comanda será aberta'}</span>
          <span className={`status-badge ${comandaExistenteId ? 'status-info' : 'status-warning'}`}>
            {comandaExistenteId ? 'Adicionar itens' : 'Nova comanda'}
          </span>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="mesaPedido">Mesa</label>
          <select id="mesaPedido" onChange={(event) => setMesaSelecionada(event.target.value)} value={mesaSelecionada}>
            <option value="">Selecione uma mesa</option>
            {mesas.map((mesa) => (
              <option key={mesa.id} value={mesa.id}>
                Mesa {mesa.numero}{mesa.status === 'OCUPADA' ? ' · ocupada' : ' · disponível'}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="clientePedido">
            Cliente
            {comandaExistenteId && <span className="form-hint">Vinculado à comanda</span>}
          </label>
          <select
            disabled={Boolean(comandaExistenteId)}
            id="clientePedido"
            onChange={(event) => setClienteSelecionado(event.target.value)}
            value={clienteSelecionado}
          >
            <option value="">Selecione o cliente</option>
            {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
          </select>
        </div>
      </section>

      <section className="order-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Cardápio</h2>
              <p className="panel-subtitle">Clique em um produto para adicioná-lo ao pedido</p>
            </div>
            <div style={{ width: 220 }}>
              <input
                aria-label="Buscar produto"
                className="search-input"
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar produto..."
                value={busca}
              />
            </div>
          </div>
          {loading ? (
            <div className="loading-state"><div><div className="spinner" />Carregando cardápio...</div></div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="empty-state"><div><div className="empty-state-icon"><Icon name="search" /></div><strong>Nenhum produto encontrado</strong><p>Ajuste a busca ou cadastre novos produtos no cardápio.</p></div></div>
          ) : (
            <div className="product-grid">
              {produtosFiltrados.map((produto) => (
                <button className="product-tile" key={produto.id} onClick={() => adicionarAoCarrinho(produto)} type="button">
                  <span className="product-tile-name">{produto.nome}</span>
                  <span className="product-tile-description">{produto.descricao || 'Produto do cardápio'}</span>
                  <span className="product-tile-price">{formatCurrency(produto.preco)}</span>
                  <span className="product-add"><Icon name="plus" size={14} /></span>
                </button>
              ))}
            </div>
          )}
        </article>

        <aside className="panel order-cart">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Resumo do pedido</h2>
              <p className="panel-subtitle">{carrinho.reduce((sum, item) => sum + item.quantidade, 0)} itens selecionados</p>
            </div>
            <span className="metric-icon brand"><Icon name="orders" size={17} /></span>
          </div>
          {carrinho.length === 0 ? (
            <div className="empty-state">
              <div><div className="empty-state-icon"><Icon name="orders" /></div><strong>Seu pedido está vazio</strong><p>Escolha os produtos no cardápio para iniciar.</p></div>
            </div>
          ) : (
            <>
              <div className="cart-list">
                {carrinho.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div>
                      <div className="cart-item-name">{item.nome}</div>
                      <div className="cart-item-price">{formatCurrency(Number(item.preco) * item.quantidade)}</div>
                    </div>
                    <div className="quantity-control">
                      <button aria-label={`Remover uma unidade de ${item.nome}`} className="quantity-button" onClick={() => alterarQuantidade(item.id, -1)} type="button">−</button>
                      <span className="quantity-value">{item.quantidade}</span>
                      <button aria-label={`Adicionar uma unidade de ${item.nome}`} className="quantity-button" onClick={() => alterarQuantidade(item.id, 1)} type="button">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-total"><span>Total do pedido</span><strong>{formatCurrency(totalPedido)}</strong></div>
            </>
          )}
          <div className="cart-footer">
            <button className="button button-primary button-lg" disabled={isFinalizando || carrinho.length === 0} onClick={finalizarPedido} type="button">
              {isFinalizando ? 'Processando...' : comandaExistenteId ? 'Adicionar à comanda' : 'Abrir comanda'}
              {!isFinalizando && <Icon name="arrow" size={16} />}
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default PedidosPage;

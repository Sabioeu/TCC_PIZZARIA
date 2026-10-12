import Select from '../components/Select';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { formatCurrency, comandaReference } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';
import './Atendimento.css';

const porIngredientes = (produto) => produto.modoEstoque === 'INGREDIENTES';
const quantidadeFormatada = (valor) => Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 6 });
const saldoDoProduto = (produto, saldo) => ({
  ...produto,
  modoEstoque: saldo?.modoEstoque || produto.modoEstoque || 'PRODUTO',
  disponivel: Number(saldo?.disponivel ?? produto.disponivel ?? produto.quantidade ?? 0),
  ingredientes: saldo?.ingredientes || produto.ingredientes || [],
});

// A capacidade individual de duas pizzas não pode ser somada quando elas usam o mesmo insumo.
const validarCarrinho = (itens) => {
  const excedido = itens.find((item) => item.quantidade > item.disponivel);
  if (excedido) return `${porIngredientes(excedido) ? 'Ingredientes insuficientes' : 'Estoque insuficiente'} para ${excedido.nome}. Disponível: ${quantidadeFormatada(excedido.disponivel)}.`;
  const consumo = new Map();
  itens.filter(porIngredientes).forEach((item) => (item.ingredientes || []).forEach((ingrediente) => {
    const anterior = consumo.get(ingrediente.insumoId);
    consumo.set(ingrediente.insumoId, {
      ...ingrediente,
      necessario: (anterior?.necessario || 0) + Number(ingrediente.quantidadePorUnidade) * item.quantidade,
      disponivel: Math.min(anterior?.disponivel ?? Infinity, Number(ingrediente.disponivel || 0)),
    });
  }));
  const insuficiente = [...consumo.values()].find((ingrediente) => ingrediente.necessario - ingrediente.disponivel > 0.0000001);
  return insuficiente
    ? `Ingredientes compartilhados insuficientes: ${insuficiente.nome}. O pedido precisa de ${quantidadeFormatada(insuficiente.necessario)} ${insuficiente.unidade || ''}, mas há ${quantidadeFormatada(insuficiente.disponivel)} ${insuficiente.unidade || ''} disponíveis. Reduza os itens ou reponha o insumo.`
    : '';
};

const PedidosPage = () => {
  const { usuario } = useAuth();
  const { notify } = useToast();
  const envioEmCurso = useRef(false);
  const saldoEmCurso = useRef(false);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const carrinhoAtual = useRef([]);
  carrinhoAtual.current = carrinho;
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [mesaSelecionada, setMesaSelecionada] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState('PRESENCIAL');
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [telefoneContato, setTelefoneContato] = useState('');
  const [taxaEntrega, setTaxaEntrega] = useState('0');
  const [verificandoMesa, setVerificandoMesa] = useState(false);
  const [atualizandoSaldo, setAtualizandoSaldo] = useState(false);
  const atualizarSaldo = async () => {
    if (saldoEmCurso.current) return;
    saldoEmCurso.current = true;
    setAtualizandoSaldo(true);
    try {
      const { data } = await api.get('/produtos/disponibilidade');
      const saldos = new Map((data || []).map((saldo) => [saldo.produtoId, saldo]));
      const atualizar = (lista) => lista.map((produto) => saldoDoProduto(produto, saldos.get(produto.id)));
      setProdutos(atualizar);
      const atualizado = atualizar(carrinhoAtual.current);
      carrinhoAtual.current = atualizado;
      setCarrinho(atualizado);
      setError(validarCarrinho(atualizado));
    } catch { setError('Não foi possível atualizar o estoque disponível.'); }
    finally { saldoEmCurso.current = false; setAtualizandoSaldo(false); }
  };
  const [comandaExistenteId, setComandaExistenteId] = useState(null);
  const [referenciaComanda, setReferenciaComanda] = useState('');
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
        const [resCli, resProds, resMesas, resSaldo] = await Promise.all([
          api.get('/clientes'),
          api.get('/produtos'),
          api.get('/mesas'),
          api.get('/produtos/disponibilidade'),
        ]);
        setClientes(resCli.data || []);
        const saldos = new Map((resSaldo.data || []).map((saldo) => [saldo.produtoId, saldo]));
        setProdutos((resProds.data || []).map((produto) => saldoDoProduto(produto, saldos.get(produto.id))));
        setMesas((resMesas.data || []).filter((mesa) => mesa.ativo));
      } catch (err) {
        setError('Não foi possível carregar clientes, produtos e mesas. Verifique a conexão com o servidor.');
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  useEffect(() => {
    let ativo = true;
    if (!mesaSelecionada || tipoAtendimento !== 'PRESENCIAL') {
      setComandaExistenteId(null);
      setReferenciaComanda('');
      setVerificandoMesa(false);
      return;
    }

    setVerificandoMesa(true);
    api.get('/comandas/abertas').then((response) => {
      if (!ativo) return;
      const encontrada = (response.data || []).find(
        (comanda) => (!comanda.tipoAtendimento || comanda.tipoAtendimento === 'PRESENCIAL') && comanda.mesa && comanda.mesa.id === Number(mesaSelecionada),
      );
      if (encontrada) {
        setComandaExistenteId(encontrada.id);
        setReferenciaComanda(comandaReference(encontrada));
        setClienteSelecionado(encontrada.cliente?.id || '');
      } else {
        setComandaExistenteId(null);
        setReferenciaComanda('');
        setClienteSelecionado('');
      }
    }).catch((err) => {
      if (!ativo) return;
      setError('Não foi possível verificar se a mesa possui uma comanda aberta.');
    }).finally(() => { if (ativo) setVerificandoMesa(false); });
    return () => { ativo = false; };
  }, [mesaSelecionada, tipoAtendimento]);

  const produtosFiltrados = useMemo(() => produtos.filter((produto) => (
    `${produto.nome} ${produto.descricao || ''}`.toLowerCase().includes(busca.toLowerCase())
  )), [busca, produtos]);

  const totalPedido = useMemo(() => carrinho.reduce(
    (total, item) => total + Number(item.preco || 0) * item.quantidade,
    0,
  ), [carrinho]);
  const quantidadeItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
  const atendimentoDefinido = Boolean(clienteSelecionado || comandaExistenteId)
    && (tipoAtendimento !== 'PRESENCIAL' || Boolean(mesaSelecionada))
    && (tipoAtendimento !== 'DELIVERY' || Boolean(enderecoEntrega.trim() && telefoneContato.trim()));
  const descricoesAtendimento = {
    PRESENCIAL: 'Consumo no salão. A mesa é vinculada ao atendimento presencial.',
    DELIVERY: 'Entrega ao cliente. Confirme o endereço, o contato e a taxa antes de enviar.',
    RETIRADA: 'Pedido para buscar no balcão. Não exige mesa nem taxa de entrega.',
  };

  const adicionarAoCarrinho = (produto) => {
    if (envioEmCurso.current || saldoEmCurso.current) return;
    const existente = carrinhoAtual.current.find((item) => item.id === produto.id);
    const proximo = existente
      ? carrinhoAtual.current.map((item) => item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item)
      : [...carrinhoAtual.current, { ...produto, quantidade: 1 }];
    const erro = validarCarrinho(proximo);
    if (erro) { setError(erro); return; }
    carrinhoAtual.current = proximo;
    setCarrinho(proximo);
    setError('');
  };

  const alterarQuantidade = (id, delta) => {
    if (envioEmCurso.current || saldoEmCurso.current) return;
    const proximo = carrinhoAtual.current
      .map((item) => item.id === id ? { ...item, quantidade: item.quantidade + delta } : item)
      .filter((item) => item.quantidade > 0);
    const erro = validarCarrinho(proximo);
    if (delta > 0 && erro) { setError(erro); return; }
    carrinhoAtual.current = proximo;
    setCarrinho(proximo);
    setError(erro);
  };

  const finalizarPedido = async () => {
    if (envioEmCurso.current || verificandoMesa || saldoEmCurso.current) return;
    const erroEstoque = validarCarrinho(carrinhoAtual.current);
    if (erroEstoque) { setError(`Reduza a quantidade do pedido. ${erroEstoque}`); return; }
    const precisaValidarCliente = !comandaExistenteId;
    if ((tipoAtendimento === 'PRESENCIAL' && !mesaSelecionada) || (precisaValidarCliente && !clienteSelecionado) || carrinho.length === 0) {
      setError('Selecione o cliente, adicione itens e informe uma mesa para atendimento presencial.');
      return;
    }
    if (tipoAtendimento === 'DELIVERY' && (!enderecoEntrega.trim() || !telefoneContato.trim() || !Number.isFinite(Number(taxaEntrega)) || Number(taxaEntrega) < 0 || !/^\d+(\.\d{1,2})?$/.test(taxaEntrega))) {
      setError('Informe endereço, telefone e uma taxa de entrega válida (até duas casas decimais).'); return;
    }

    if (!usuario?.id) { setError('Sua sessão não está disponível. Entre no sistema novamente.'); return; }
    envioEmCurso.current = true;
    setIsFinalizando(true);
    setError('');
    const payload = {
      clienteId: Number(clienteSelecionado),
      mesaId: mesaSelecionada ? Number(mesaSelecionada) : null,
      tipoAtendimento,
      enderecoEntrega: tipoAtendimento === 'DELIVERY' ? enderecoEntrega.trim() : null,
      telefoneContato: tipoAtendimento === 'DELIVERY' ? telefoneContato.trim() : null,
      taxaEntrega: tipoAtendimento === 'DELIVERY' ? Number(taxaEntrega) : 0,
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
      notify(comandaExistenteId ? 'Itens adicionados à comanda.' : 'Pedido criado com sucesso.', { type: 'success' });
      navigate('/comandas');
    } catch (err) {
      if (err.response?.status === 409) await atualizarSaldo();
      setError(err.response?.data?.message || 'Não foi possível processar o pedido. Revise os dados e tente novamente.');
    } finally {
      envioEmCurso.current = false;
      setIsFinalizando(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        actions={<button className="button" type="button" disabled={loading || atualizandoSaldo || isFinalizando} onClick={atualizarSaldo}><Icon name="refresh" size={16} />{atualizandoSaldo ? 'Atualizando...' : 'Atualizar estoque'}</button>}
        description="Escolha presencial, delivery ou retirada e monte o pedido a partir do cardápio."
        eyebrow="Atendimento"
        title="Novo pedido"
      />

      {error && <div className="alert alert-error" role="alert"><Icon name="alert" size={17} />{error}</div>}

      <ol className="pedido-guide" aria-label="Preparação do pedido">
        <li className={atendimentoDefinido ? 'complete' : 'current'}><span className="pedido-guide-number">{atendimentoDefinido ? <Icon name="check" size={15} /> : '1'}</span><div><strong>Defina o atendimento</strong><small>Tipo, cliente e dados necessários</small></div></li>
        <li className={carrinho.length ? 'complete' : atendimentoDefinido ? 'current' : ''}><span className="pedido-guide-number">{carrinho.length ? <Icon name="check" size={15} /> : '2'}</span><div><strong>Escolha os produtos</strong><small>Unidades e ingredientes disponíveis</small></div></li>
        <li className={atendimentoDefinido && carrinho.length ? 'current' : ''}><span className="pedido-guide-number">3</span><div><strong>Confira e envie</strong><small>Revise o resumo do pedido</small></div></li>
      </ol>

      <section className="order-context">
        <div className="form-field full-span"><label className="form-label" htmlFor="tipoAtendimento">Tipo de atendimento</label><Select disabled={loading || isFinalizando} id="tipoAtendimento" value={tipoAtendimento} onChange={(e) => { setTipoAtendimento(e.target.value); setMesaSelecionada(''); setComandaExistenteId(null); setError(''); }}><option value="PRESENCIAL" data-icon="tables" data-description="Consumo no salão, com mesa e comanda.">Presencial</option><option value="DELIVERY" data-icon="store" data-description="Entrega no endereço do cliente, com contato e taxa.">Delivery</option><option value="RETIRADA" data-icon="orders" data-description="Pedido para buscar no balcão, sem exigir mesa.">Retirada</option></Select><p className="atendimento-context-hint">{descricoesAtendimento[tipoAtendimento]}</p></div>
        <div className={`mode-banner ${comandaExistenteId ? 'existing' : ''}`}>
          <span>{verificandoMesa ? 'Verificando atendimento desta mesa...' : comandaExistenteId ? `Comanda ${referenciaComanda} encontrada para esta mesa` : 'Uma nova comanda será aberta'}</span>
          <span className={`status-badge ${comandaExistenteId ? 'status-info' : 'status-warning'}`}>
            {comandaExistenteId ? 'Adicionar itens' : 'Nova comanda'}
          </span>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="mesaPedido">{tipoAtendimento === 'PRESENCIAL' ? 'Mesa' : 'Mesa de referência (opcional)'}</label>
          <Select disabled={loading || isFinalizando} id="mesaPedido" onChange={(event) => { setMesaSelecionada(event.target.value); setComandaExistenteId(null); setVerificandoMesa(tipoAtendimento === 'PRESENCIAL' && Boolean(event.target.value)); }} value={mesaSelecionada}>
            <option value="">{tipoAtendimento === 'PRESENCIAL' ? 'Selecione uma mesa' : 'Sem mesa — não ocupa o salão'}</option>
            {mesas.map((mesa) => (
              <option key={mesa.id} value={mesa.id}>
                Mesa {mesa.numero}{mesa.status === 'OCUPADA' ? ' · ocupada' : ' · disponível'}
              </option>
            ))}
          </Select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="clientePedido">
            Cliente
            {comandaExistenteId && <span className="form-hint">Vinculado à comanda</span>}
          </label>
          <Select
            disabled={Boolean(comandaExistenteId) || loading || isFinalizando || verificandoMesa}
            id="clientePedido"
            onChange={(event) => setClienteSelecionado(event.target.value)}
            value={clienteSelecionado}
          >
            <option value="">Selecione o cliente</option>
            {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
          </Select>
        </div>
        {tipoAtendimento === 'DELIVERY' && <>
          <div className="form-field full-span"><label className="form-label" htmlFor="enderecoEntrega">Endereço de entrega</label><input disabled={isFinalizando} id="enderecoEntrega" maxLength={255} value={enderecoEntrega} onChange={(e) => setEnderecoEntrega(e.target.value)} placeholder="Rua, número, bairro, cidade e complemento" /></div>
          <div className="form-field"><label className="form-label" htmlFor="telefoneContato">Telefone de contato</label><input disabled={isFinalizando} id="telefoneContato" type="tel" maxLength={20} value={telefoneContato} onChange={(e) => setTelefoneContato(e.target.value)} /></div>
          <div className="form-field"><label className="form-label" htmlFor="taxaEntrega">Taxa de entrega (R$)</label><input disabled={isFinalizando} id="taxaEntrega" type="number" min="0" max="999999.99" step="0.01" value={taxaEntrega} onChange={(e) => setTaxaEntrega(e.target.value)} /></div>
        </>}
      </section>

      <section className="order-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Cardápio</h2>
              <p className="panel-subtitle">Clique em um produto para adicioná-lo ao pedido</p>
            </div>
            <div className="atendimento-search">
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
                <button className="product-tile" disabled={produto.disponivel < 1 || isFinalizando || atualizandoSaldo} key={produto.id} onClick={() => adicionarAoCarrinho(produto)} type="button">
                  <span className="product-tile-name">{produto.nome}</span>
                  <span className="product-tile-description">{produto.descricao || 'Produto do cardápio'}</span>
                  <span className={`product-stock-hint ${porIngredientes(produto) ? 'ingredients' : ''} ${produto.disponivel < 1 ? 'unavailable' : ''}`}>{produto.disponivel < 1 ? porIngredientes(produto) ? 'Sem ingredientes disponíveis' : 'Sem estoque disponível' : `${porIngredientes(produto) ? 'Preparo disponível' : 'Disponível'}: ${quantidadeFormatada(produto.disponivel)}`}</span>
                  {porIngredientes(produto) && <span className="product-stock-mode"><Icon name="ingredients" size={12} /> Produzido com ingredientes</span>}
                  {carrinho.some((item) => item.id === produto.id) && <span className="product-cart-count">{carrinho.find((item) => item.id === produto.id).quantidade} no pedido</span>}
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
              <p className="panel-subtitle" aria-live="polite">{quantidadeItens} {quantidadeItens === 1 ? 'item selecionado' : 'itens selecionados'}</p>
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
                      {porIngredientes(item) && <span className="product-stock-mode">Consome ingredientes da ficha técnica</span>}
                    </div>
                    <div className="quantity-control">
                      <button aria-label={`Remover uma unidade de ${item.nome}`} className="quantity-button" disabled={isFinalizando} onClick={() => alterarQuantidade(item.id, -1)} type="button">−</button>
                      <span className="quantity-value">{item.quantidade}</span>
                      <button aria-label={`Adicionar uma unidade de ${item.nome}`} className="quantity-button" disabled={isFinalizando || atualizandoSaldo || item.quantidade + 1 > item.disponivel} onClick={() => alterarQuantidade(item.id, 1)} type="button">+</button>
                    </div>
                  </div>
                ))}
              </div>
              {tipoAtendimento === 'DELIVERY' && <div className="cart-total"><span>Taxa de entrega</span><strong>{formatCurrency(Number(taxaEntrega) || 0)}</strong></div>}
              <div className="cart-total"><span>Total do pedido</span><strong>{formatCurrency(totalPedido + (tipoAtendimento === 'DELIVERY' ? Number(taxaEntrega) || 0 : 0))}</strong></div>
            </>
          )}
          <div className="cart-footer">
            <p className="atendimento-context-hint">{comandaExistenteId ? 'Os itens serão incluídos no atendimento existente. ' : ''}O servidor confere e reserva o estoque ao enviar, incluindo ingredientes compartilhados entre produtos.</p>
            <button className="button button-primary button-lg" aria-busy={isFinalizando} disabled={loading || isFinalizando || verificandoMesa || atualizandoSaldo || carrinho.length === 0} onClick={finalizarPedido} type="button">
              {isFinalizando ? 'Processando...' : verificandoMesa ? 'Verificando mesa...' : comandaExistenteId ? 'Adicionar à comanda' : tipoAtendimento === 'PRESENCIAL' ? 'Abrir comanda' : 'Abrir pedido'}
              {!isFinalizando && <Icon name="arrow" size={16} />}
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default PedidosPage;

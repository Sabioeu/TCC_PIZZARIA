import React, { useCallback, useEffect, useState } from 'react';
import ProdutoForm from '../components/ProdutoForm';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import api from '../api/api';
import { formatCurrency } from '../utils/formatters';

const CadastroProdutoPage = () => {
  const [produtos, setProdutos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const carregar = useCallback(async () => { setLoading(true); setError(''); try { const response = await api.get('/produtos'); setProdutos(response.data || []); } catch (err) { console.error(err); setError('Não foi possível carregar os produtos.'); } finally { setLoading(false); } }, []);
  useEffect(() => { carregar(); }, [carregar]);
  const excluir = async (produto) => { if (!window.confirm(`Excluir o produto "${produto.nome}"?`)) return; try { await api.delete(`/produtos/${produto.id}`); setProdutos((atuais) => atuais.filter((item) => item.id !== produto.id)); } catch (err) { console.error(err); setError('Não foi possível excluir o produto. Ele pode estar associado a uma comanda.'); } };

  return (
    <div className="page-stack">
      <PageHeader description="Gerencie os itens oferecidos, descrições e preços do cardápio." eyebrow="Cadastros" title="Produtos" />
      <section className="split-layout">
        <article className="panel sticky-panel"><div className="panel-header"><div><h2 className="panel-title">{editando ? 'Editar produto' : 'Novo produto'}</h2><p className="panel-subtitle">{editando ? `Alterando o registro #${editando.id}` : 'Inclua um item no cardápio'}</p></div>{editando && <span className="status-badge status-info">Editando</span>}</div><div className="panel-body"><ProdutoForm onCadastroSucesso={(item) => setProdutos((atuais) => [...atuais, item])} onEdicaoSucesso={(item) => { if (item) setProdutos((atuais) => atuais.map((current) => current.id === item.id ? item : current)); setEditando(null); }} produtoParaEdicao={editando} /></div></article>
        <article className="panel"><div className="panel-header"><div><h2 className="panel-title">Cardápio cadastrado</h2><p className="panel-subtitle">{produtos.length} produtos encontrados</p></div></div>{error && <div className="panel-body"><div className="alert alert-error">{error}</div></div>}{loading ? <Loading /> : produtos.length === 0 ? <Empty icon="products" /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Produto</th><th>Preço</th><th>Saldo</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead><tbody>{produtos.map((produto) => <tr key={produto.id}><td><span className="cell-title">{produto.nome}</span><span className="cell-subtitle">{produto.descricao || 'Sem descrição'}</span></td><td><span className="cell-title">{formatCurrency(produto.preco)}</span></td><td>{Number(produto.quantidade || 0).toFixed(2)}</td><ActionCell onDelete={() => excluir(produto)} onEdit={() => setEditando(produto)} /></tr>)}</tbody></table></div>}</article>
      </section>
    </div>
  );
};

const Loading = () => <div className="loading-state"><div><div className="spinner" />Carregando...</div></div>;
const Empty = ({ icon }) => <div className="empty-state"><div><div className="empty-state-icon"><Icon name={icon} /></div><strong>Nenhum produto</strong><p>Os itens do cardápio aparecerão aqui.</p></div></div>;
const ActionCell = ({ onDelete, onEdit }) => <td><div className="table-actions"><button aria-label="Editar" className="icon-button" onClick={onEdit} type="button"><Icon name="edit" size={15} /></button><button aria-label="Excluir" className="icon-button" onClick={onDelete} style={{ color: 'var(--red)' }} type="button"><Icon name="trash" size={15} /></button></div></td>;
export default CadastroProdutoPage;

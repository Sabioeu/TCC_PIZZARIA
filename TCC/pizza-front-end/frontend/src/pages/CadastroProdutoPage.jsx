import React, { useCallback, useEffect, useRef, useState } from 'react';
import ProdutoForm from '../components/ProdutoForm';
import FichaTecnicaForm from '../components/FichaTecnicaForm';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import CadastroDrawer from '../components/CadastroDrawer';
import { useToast } from '../components/ToastProvider';
import { apiErrorMessage } from '../utils/apiError';
import api from '../api/api';
import { formatCurrency } from '../utils/formatters';

const CadastroProdutoPage = () => {
  const [registros, setRegistros] = useState([]);
  const [editando, setEditando] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formSaving, setFormSaving] = useState(false);
  const [fichaProduto, setFichaProduto] = useState(null);
  const [fichaSaving, setFichaSaving] = useState(false);
  const [error, setError] = useState('');
  const [exclusao, setExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');
  const bloqueioExclusao = useRef(false);
  const { notify } = useToast();

  const carregar = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get('/produtos'); setRegistros(response.data || []); }
    catch (err) { setError(apiErrorMessage(err, 'Não foi possível carregar produtos. Tente novamente.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const abrirCadastro = (item = null) => {
    if (formSaving || fichaSaving || excluindo || fichaProduto) return;
    setEditando(item); setFormOpen(true);
  };
  const fecharCadastro = () => {
    if (formSaving) return;
    setFormOpen(false); setEditando(null);
  };

  const excluir = async () => {
    if (!exclusao || bloqueioExclusao.current || fichaSaving) return;
    bloqueioExclusao.current = true; setExcluindo(true); setErroExclusao('');
    try {
      await api.delete(`/produtos/${exclusao.id}`);
      setRegistros((atuais) => atuais.filter((item) => item.id !== exclusao.id));
      if (editando?.id === exclusao.id) setEditando(null);
      setExclusao(null); notify('Produto excluído.', { type: 'success' });
    } catch (err) { setErroExclusao(apiErrorMessage(err, 'Não foi possível excluir o produto. Ele pode estar associado a uma comanda.')); }
    finally { bloqueioExclusao.current = false; setExcluindo(false); }
  };
  const columns = [
    { key: 'nome', label: 'Produto', render: (item) => <><span className="cell-title">{item.nome}</span><span className="cell-subtitle">{item.descricao || 'Sem descrição'}</span></> },
    { key: 'preco', label: 'Preço', value: (item) => Number(item.preco || 0), render: (item) => <span className="cell-title">{formatCurrency(item.preco)}</span> },
    { key: 'porIngredientes', label: 'Controle de estoque', value: (item) => item.porIngredientes ? 'Ingredientes' : 'Produto estocado', render: (item) => <span className={`ficha-mode-badge ${item.porIngredientes ? 'is-active' : ''}`}><Icon name={item.porIngredientes ? 'ingredients' : 'products'} size={13} />{item.porIngredientes ? 'Ingredientes' : 'Produto estocado'}</span> },
    { key: 'quantidade', label: 'Saldo do produto', value: (item) => item.porIngredientes ? null : Number(item.quantidade || 0), render: (item) => item.porIngredientes ? <span className="cell-subtitle">Pelos ingredientes</span> : Number(item.quantidade || 0).toFixed(2) },
    { key: 'acoes', label: 'Ações', sortable: false, align: 'right', render: (item) => <div className="table-actions"><button aria-label={`Ficha técnica de ${item.nome}`} className="button ficha-table-button" disabled={excluindo || formSaving || fichaSaving || formOpen || Boolean(fichaProduto)} onClick={() => setFichaProduto(item)} type="button"><Icon name="ingredients" size={15} /> Ficha técnica</button><button aria-label={`Editar produto ${item.nome}`} title="Editar produto" className="icon-button" disabled={excluindo || formSaving || fichaSaving || Boolean(fichaProduto)} onClick={() => abrirCadastro(item)} type="button"><Icon name="edit" size={15} /></button><button aria-label={`Excluir produto ${item.nome}`} title="Excluir produto" className="icon-button" disabled={excluindo || formSaving || fichaSaving || Boolean(fichaProduto)} onClick={() => { setExclusao(item); setErroExclusao(''); }} style={{ color: 'var(--red)' }} type="button"><Icon name="trash" size={15} /></button></div> },
  ];

  return <div className="page-stack">
    <PageHeader description="Gerencie o cardápio, os preços e a composição dos produtos preparados." eyebrow="Cadastros" title="Produtos" actions={<button className="button button-primary" disabled={excluindo || formSaving || fichaSaving || Boolean(fichaProduto)} onClick={() => abrirCadastro()} type="button"><Icon name="plus" size={18} /> Novo produto</button>} />
    <DataTable title="Cardápio cadastrado" description="Edite os detalhes e use Ficha técnica para configurar o consumo de ingredientes de cada produto." rows={registros} columns={columns} searchKeys={["nome","descricao","id"]} searchPlaceholder="Buscar produto ou descrição" loading={loading} error={error} onRetry={carregar} defaultSort={{ key: 'nome', direction: 'asc' }} emptyTitle="Nenhum produto cadastrado" emptyDescription="Clique em Novo produto para incluir o primeiro item do cardápio." />
    {formOpen && <CadastroDrawer title={editando ? 'Editar produto' : 'Novo produto'} subtitle={editando ? `Atualize o item do registro #${editando.id}.` : 'Adicione um item ao cardápio, com nome e preço de venda.'} busy={formSaving} onClose={fecharCadastro}>
      <ProdutoForm onCancel={fecharCadastro} onSavingChange={setFormSaving} produtoParaEdicao={editando} onCadastroSucesso={(item) => { setRegistros((atuais) => [...atuais, item]); setFormOpen(false); setEditando(null); }} onEdicaoSucesso={(item) => { if (item) setRegistros((atuais) => atuais.map((current) => current.id === item.id ? item : current)); setFormOpen(false); setEditando(null); }} />
    </CadastroDrawer>}
    {fichaProduto && <CadastroDrawer title="Ficha técnica" subtitle={`Configure o estoque de ${fichaProduto.nome} e o consumo para preparar uma unidade.`} busy={fichaSaving} onClose={() => { if (!fichaSaving) setFichaProduto(null); }}>
      <FichaTecnicaForm produto={fichaProduto} onCancel={() => { if (!fichaSaving) setFichaProduto(null); }} onSavingChange={setFichaSaving} onSuccess={(ficha) => { setRegistros((atuais) => atuais.map((item) => item.id === fichaProduto.id ? { ...item, porIngredientes: ficha.porIngredientes } : item)); setFichaProduto(null); }} />
    </CadastroDrawer>}
    {exclusao && <ConfirmDialog title="Excluir produto?" description={`O cadastro de ${exclusao.nome} será removido. Produtos vinculados a comandas podem impedir a exclusão.`} confirmLabel="Excluir produto" onCancel={() => setExclusao(null)} onConfirm={excluir} busy={excluindo} error={erroExclusao} />}
  </div>;
};
export default CadastroProdutoPage;

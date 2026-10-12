import React, { useCallback, useEffect, useRef, useState } from 'react';
import InsumoForm from '../components/InsumoForm';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import CadastroDrawer from '../components/CadastroDrawer';
import { useToast } from '../components/ToastProvider';
import { apiErrorMessage } from '../utils/apiError';
import api from '../api/api';


const CadastroInsumoPage = () => {
  const [registros, setRegistros] = useState([]);
  const [editando, setEditando] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formSaving, setFormSaving] = useState(false);
  const [error, setError] = useState('');
  const [exclusao, setExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');
  const bloqueioExclusao = useRef(false);
  const { notify } = useToast();

  const carregar = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get('/insumos'); setRegistros(response.data || []); }
    catch (err) { setError(apiErrorMessage(err, 'Não foi possível carregar insumos. Tente novamente.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const abrirCadastro = (item = null) => {
    if (formSaving || excluindo) return;
    setEditando(item); setFormOpen(true);
  };
  const fecharCadastro = () => {
    if (formSaving) return;
    setFormOpen(false); setEditando(null);
  };

  const excluir = async () => {
    if (!exclusao || bloqueioExclusao.current) return;
    bloqueioExclusao.current = true; setExcluindo(true); setErroExclusao('');
    try {
      await api.delete(`/insumos/${exclusao.id}`);
      setRegistros((atuais) => atuais.filter((item) => item.id !== exclusao.id));
      if (editando?.id === exclusao.id) setEditando(null);
      setExclusao(null); notify('Insumo excluído.', { type: 'success' });
    } catch (err) { setErroExclusao(apiErrorMessage(err, 'Não foi possível excluir o insumo. Verifique os registros vinculados.')); }
    finally { bloqueioExclusao.current = false; setExcluindo(false); }
  };
  const columns = [
    { key: 'nome', label: 'Insumo', render: (item) => <><span className="cell-title">{item.nome}</span><span className="cell-subtitle">ID #{item.id}</span></> },
    { key: 'quantidade', label: 'Saldo físico', value: (item) => Number(item.quantidade || 0), render: (item) => <span className="cell-title">{Number(item.quantidade || 0).toLocaleString('pt-BR', { maximumFractionDigits: 6 })} {item.unidade}</span> },
    { key: 'situacao', label: 'Situação', value: (item) => Number(item.quantidade || 0) <= 5 ? 'Estoque baixo' : 'Regular', render: (item) => <span className={`status-badge ${Number(item.quantidade || 0) <= 5 ? 'status-danger' : 'status-success'}`}>{Number(item.quantidade || 0) <= 5 ? 'Estoque baixo' : 'Regular'}</span> },
    { key: 'acoes', label: 'Ações', sortable: false, align: 'right', render: (item) => <div className="table-actions"><button aria-label={`Editar insumo ${item.nome}`} title="Editar insumo" className="icon-button" disabled={excluindo || formSaving} onClick={() => abrirCadastro(item)} type="button"><Icon name="edit" size={15} /></button><button aria-label={`Excluir insumo ${item.nome}`} title="Excluir insumo" className="icon-button" disabled={excluindo || formSaving} onClick={() => { setExclusao(item); setErroExclusao(''); }} style={{ color: 'var(--red)' }} type="button"><Icon name="trash" size={15} /></button></div> },
  ];

  return <div className="page-stack">
    <PageHeader description="Organize matérias-primas, unidades de medida e quantidades disponíveis." eyebrow="Cadastros" title="Insumos" actions={<button className="button button-primary" disabled={excluindo || formSaving} onClick={() => abrirCadastro()} type="button"><Icon name="plus" size={18} /> Novo insumo</button>} />
    <DataTable title="Insumos cadastrados" description="Saldo físico, sem descontar reservas. A capacidade livre de preparo pode ser consultada em Estoque." rows={registros} columns={columns} searchKeys={["nome","unidade","id"]} searchPlaceholder="Buscar insumo ou unidade" loading={loading} error={error} onRetry={carregar} defaultSort={{ key: 'nome', direction: 'asc' }} emptyTitle="Nenhum insumo cadastrado" emptyDescription="Clique em Novo insumo para cadastrar a primeira matéria-prima e sua unidade de medida." />
    {formOpen && <CadastroDrawer title={editando ? 'Editar insumo' : 'Novo insumo'} subtitle={editando ? `Atualize a matéria-prima do registro #${editando.id}.` : 'Informe a matéria-prima, a quantidade e a unidade utilizada.'} busy={formSaving} onClose={fecharCadastro}>
      <InsumoForm onCancel={fecharCadastro} onSavingChange={setFormSaving} insumoParaEdicao={editando} onCadastroSucesso={(item) => { setRegistros((atuais) => [...atuais, item]); setFormOpen(false); setEditando(null); }} onEdicaoSucesso={(item) => { if (item) setRegistros((atuais) => atuais.map((current) => current.id === item.id ? item : current)); setFormOpen(false); setEditando(null); }} />
    </CadastroDrawer>}
    {exclusao && <ConfirmDialog title="Excluir insumo?" description={`O cadastro de ${exclusao.nome} será removido. Insumos vinculados a movimentações podem impedir a exclusão.`} confirmLabel="Excluir insumo" onCancel={() => setExclusao(null)} onConfirm={excluir} busy={excluindo} error={erroExclusao} />}
  </div>;
};
export default CadastroInsumoPage;

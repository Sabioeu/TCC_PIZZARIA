import React, { useCallback, useEffect, useRef, useState } from 'react';
import ClienteForm from '../components/ClienteForm';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import CadastroDrawer from '../components/CadastroDrawer';
import { useToast } from '../components/ToastProvider';
import { apiErrorMessage } from '../utils/apiError';
import { maskCpf, maskPhone, onlyDigits } from '../utils/cadastroFields';
import api from '../api/api';

const CadastroClientePage = () => {
  const [clientes, setClientes] = useState([]);
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
    try { const response = await api.get('/clientes'); setClientes(response.data || []); }
    catch (err) { setError(apiErrorMessage(err, 'Não foi possível carregar os clientes. Tente novamente.')); }
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
      await api.delete(`/clientes/${exclusao.id}`);
      setClientes((atuais) => atuais.filter((item) => item.id !== exclusao.id));
      if (editando?.id === exclusao.id) setEditando(null);
      setExclusao(null); notify('Cliente excluído.', { type: 'success' });
    } catch (err) { setErroExclusao(apiErrorMessage(err, 'Não foi possível excluir o cliente. Ele pode estar associado a um pedido.')); }
    finally { bloqueioExclusao.current = false; setExcluindo(false); }
  };
  const columns = [
    { key: 'nome', label: 'Cliente', render: (item) => <><span className="cell-title">{item.nome}</span><span className="cell-subtitle">ID #{item.id}</span></> },
    { key: 'cpf', label: 'Documento', render: (item) => item.cpf ? maskCpf(item.cpf) : '—' },
    { key: 'telefone', label: 'Contato', render: (item) => <><span className="cell-title">{item.telefone ? maskPhone(item.telefone) : '—'}</span><span className="cell-subtitle">{item.endereco || 'Sem endereço'}</span></> },
    { key: 'acoes', label: 'Ações', sortable: false, align: 'right', render: (item) => <div className="table-actions"><button aria-label={`Editar cliente ${item.nome}`} title="Editar cliente" className="icon-button" disabled={excluindo || formSaving} onClick={() => abrirCadastro(item)} type="button"><Icon name="edit" size={15} /></button><button aria-label={`Excluir cliente ${item.nome}`} title="Excluir cliente" className="icon-button" disabled={excluindo || formSaving} onClick={() => { setExclusao(item); setErroExclusao(''); }} style={{ color: 'var(--red)' }} type="button"><Icon name="trash" size={15} /></button></div> },
  ];

  return <div className="page-stack">
    <PageHeader description="Mantenha os dados de contato organizados para agilizar novos atendimentos." eyebrow="Cadastros" title="Clientes" actions={<button className="button button-primary" disabled={excluindo || formSaving} onClick={() => abrirCadastro()} type="button"><Icon name="plus" size={18} /> Novo cliente</button>} />
    <DataTable title="Clientes cadastrados" description="Encontre um cliente pela busca e use as ações para atualizar seus dados." rows={clientes} columns={columns} searchKeys={['nome', 'cpf', 'telefone', 'endereco', 'id', (item) => maskCpf(item.cpf), (item) => maskPhone(item.telefone), (item) => onlyDigits(item.cpf), (item) => onlyDigits(item.telefone)]} searchPlaceholder="Buscar cliente, documento ou contato" loading={loading} error={error} onRetry={carregar} defaultSort={{ key: 'nome', direction: 'asc' }} emptyTitle="Nenhum cliente cadastrado" emptyDescription="Clique em Novo cliente para cadastrar o primeiro contato e agilizar os próximos pedidos." />
    {formOpen && <CadastroDrawer title={editando ? 'Editar cliente' : 'Novo cliente'} subtitle={editando ? `Atualize os dados do registro #${editando.id}.` : 'Cadastre um contato para os próximos atendimentos.'} busy={formSaving} onClose={fecharCadastro}>
      <ClienteForm onCancel={fecharCadastro} onSavingChange={setFormSaving} clienteParaEdicao={editando} onCadastroSucesso={(item) => { setClientes((atuais) => [...atuais, item]); setFormOpen(false); setEditando(null); }} onEdicaoSucesso={(item) => { if (item) setClientes((atuais) => atuais.map((current) => current.id === item.id ? item : current)); setFormOpen(false); setEditando(null); }} />
    </CadastroDrawer>}
    {exclusao && <ConfirmDialog title="Excluir cliente?" description={`O cadastro de ${exclusao.nome} será removido. Registros vinculados a pedidos podem impedir a exclusão.`} confirmLabel="Excluir cliente" onCancel={() => setExclusao(null)} onConfirm={excluir} busy={excluindo} error={erroExclusao} />}
  </div>;
};
export default CadastroClientePage;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import UsuarioForm from '../components/UsuarioForm';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import CadastroDrawer from '../components/CadastroDrawer';
import { useToast } from '../components/ToastProvider';
import { apiErrorMessage } from '../utils/apiError';
import api from '../api/api';


const CadastroUsuarioPage = () => {
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
    try { const response = await api.get('/usuarios'); setRegistros(response.data || []); }
    catch (err) { setError(apiErrorMessage(err, 'Não foi possível carregar usuários. Tente novamente.')); }
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
      await api.delete(`/usuarios/${exclusao.id}`);
      setRegistros((atuais) => atuais.filter((item) => item.id !== exclusao.id));
      if (editando?.id === exclusao.id) setEditando(null);
      setExclusao(null); notify('Usuário excluído.', { type: 'success' });
    } catch (err) { setErroExclusao(apiErrorMessage(err, 'Não foi possível excluir o usuário.')); }
    finally { bloqueioExclusao.current = false; setExcluindo(false); }
  };
  const columns = [
    { key: 'nome', label: 'Colaborador', render: (item) => <><span className="cell-title">{item.nome}</span><span className="cell-subtitle">ID #{item.id}</span></> },
    { key: 'email', label: 'E-mail' },
    { key: 'perfil', label: 'Perfil', render: (item) => <span className="status-badge status-info">{item.perfil}</span> },
    { key: 'ativo', label: 'Acesso', value: (item) => item.ativo === false ? 'Bloqueado' : 'Liberado', render: (item) => <span className={`status-badge ${item.ativo === false ? 'status-warning' : 'status-success'}`}>{item.ativo === false ? 'Aguardando aprovação / bloqueado' : 'Liberado'}</span> },
    { key: 'acoes', label: 'Ações', sortable: false, align: 'right', render: (item) => <div className="table-actions"><button aria-label={`Editar usuário ${item.nome}`} title="Editar usuário" className="icon-button" disabled={excluindo || formSaving} onClick={() => abrirCadastro(item)} type="button"><Icon name="edit" size={15} /></button><button aria-label={`Excluir usuário ${item.nome}`} title="Excluir usuário" className="icon-button" disabled={excluindo || formSaving} onClick={() => { setExclusao(item); setErroExclusao(''); }} style={{ color: 'var(--red)' }} type="button"><Icon name="trash" size={15} /></button></div> },
  ];

  return <div className="page-stack">
    <PageHeader description="Gerencie colaboradores e os níveis de acesso utilizados no atendimento." eyebrow="Configurações" title="Usuários" actions={<button className="button button-primary" disabled={excluindo || formSaving} onClick={() => abrirCadastro()} type="button"><Icon name="plus" size={18} /> Novo usuário</button>} />
    <DataTable title="Equipe cadastrada" description="Consulte os perfis e aprove ou bloqueie o acesso na edição do usuário." rows={registros} columns={columns} searchKeys={['nome', 'email', 'perfil', (item) => item.ativo === false ? 'bloqueado aprovação' : 'liberado', 'id']} searchPlaceholder="Buscar nome, e-mail ou perfil" loading={loading} error={error} onRetry={carregar} defaultSort={{ key: 'nome', direction: 'asc' }} emptyTitle="Nenhum usuário cadastrado" emptyDescription="Clique em Novo usuário para cadastrar um colaborador. As solicitações de acesso também aparecerão aqui." />
    {formOpen && <CadastroDrawer title={editando ? 'Editar usuário' : 'Novo usuário'} subtitle={editando ? `Revise os dados e as permissões do registro #${editando.id}.` : 'Cadastre um colaborador e defina suas permissões de acesso.'} busy={formSaving} onClose={fecharCadastro}>
      <UsuarioForm onCancel={fecharCadastro} onSavingChange={setFormSaving} usuarioParaEdicao={editando} onCadastroSucesso={(item) => { setRegistros((atuais) => [...atuais, item]); setFormOpen(false); setEditando(null); }} onEdicaoSucesso={(item) => { if (item) setRegistros((atuais) => atuais.map((current) => current.id === item.id ? item : current)); setFormOpen(false); setEditando(null); }} />
    </CadastroDrawer>}
    {exclusao && <ConfirmDialog title="Excluir usuário?" description={`O cadastro de ${exclusao.nome} será removido. A conta perderá o acesso ao sistema. Vínculos existentes podem impedir a exclusão.`} confirmLabel="Excluir usuário" onCancel={() => setExclusao(null)} onConfirm={excluir} busy={excluindo} error={erroExclusao} />}
  </div>;
};
export default CadastroUsuarioPage;

import React, { useCallback, useEffect, useState } from 'react';
import UsuarioForm from '../components/UsuarioForm';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import api from '../api/api';

const CadastroUsuarioPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const carregar = useCallback(async () => { setLoading(true); setError(''); try { const response = await api.get('/usuarios'); setUsuarios(response.data || []); } catch (err) { console.error(err); setError('Não foi possível carregar os usuários.'); } finally { setLoading(false); } }, []);
  useEffect(() => { carregar(); }, [carregar]);
  const excluir = async (usuario) => { if (!window.confirm(`Excluir o usuário "${usuario.nome}"?`)) return; try { await api.delete(`/usuarios/${usuario.id}`); setUsuarios((atuais) => atuais.filter((item) => item.id !== usuario.id)); } catch (err) { console.error(err); setError('Não foi possível excluir o usuário.'); } };

  const salvarEdicao = (item) => {
    if (item) setUsuarios((atuais) => atuais.map((current) => current.id === item.id ? item : current));
    setEditando(null);
  };

  return (
    <div className="page-stack">
      <PageHeader description="Gerencie colaboradores e os níveis de acesso utilizados no atendimento." eyebrow="Configurações" title="Usuários" />
      <section className="split-layout">
        <article className="panel sticky-panel"><div className="panel-header"><div><h2 className="panel-title">{editando ? 'Editar usuário' : 'Novo usuário'}</h2><p className="panel-subtitle">{editando ? `Alterando o registro #${editando.id}` : 'Cadastre um colaborador'}</p></div>{editando && <span className="status-badge status-info">Editando</span>}</div><div className="panel-body"><UsuarioForm onCadastroSucesso={(item) => setUsuarios((atuais) => [...atuais, item])} onEdicaoSucesso={salvarEdicao} usuarioParaEdicao={editando} /></div></article>
        <article className="panel"><div className="panel-header"><div><h2 className="panel-title">Equipe cadastrada</h2><p className="panel-subtitle">{usuarios.length} usuários encontrados</p></div></div>{error && <div className="panel-body"><div className="alert alert-error">{error}</div></div>}{loading ? <Loading /> : usuarios.length === 0 ? <Empty /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Colaborador</th><th>E-mail</th><th>Perfil</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead><tbody>{usuarios.map((usuario) => <tr key={usuario.id}><td><span className="cell-title">{usuario.nome}</span><span className="cell-subtitle">ID #{usuario.id}</span></td><td>{usuario.email}</td><td><span className="status-badge status-info">{usuario.perfil}</span></td><ActionCell onDelete={() => excluir(usuario)} onEdit={() => setEditando(usuario)} /></tr>)}</tbody></table></div>}</article>
      </section>
    </div>
  );
};
const Loading = () => <div className="loading-state"><div><div className="spinner" />Carregando...</div></div>;
const Empty = () => <div className="empty-state"><div><div className="empty-state-icon"><Icon name="users" /></div><strong>Nenhum usuário</strong><p>A equipe cadastrada aparecerá aqui.</p></div></div>;
const ActionCell = ({ onDelete, onEdit }) => <td><div className="table-actions"><button aria-label="Editar" className="icon-button" onClick={onEdit} type="button"><Icon name="edit" size={15} /></button><button aria-label="Excluir" className="icon-button" onClick={onDelete} style={{ color: 'var(--red)' }} type="button"><Icon name="trash" size={15} /></button></div></td>;
export default CadastroUsuarioPage;

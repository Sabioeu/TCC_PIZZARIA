import React, { useCallback, useEffect, useState } from 'react';
import ClienteForm from '../components/ClienteForm';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import api from '../api/api';

const CadastroClientePage = () => {
  const [clientes, setClientes] = useState([]);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');
    try { const response = await api.get('/clientes'); setClientes(response.data || []); }
    catch (err) { console.error(err); setError('Não foi possível carregar os clientes.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const excluir = async (cliente) => {
    if (!window.confirm(`Excluir o cliente "${cliente.nome}"?`)) return;
    try { await api.delete(`/clientes/${cliente.id}`); setClientes((atuais) => atuais.filter((item) => item.id !== cliente.id)); }
    catch (err) { console.error(err); setError('Não foi possível excluir o cliente. Ele pode estar associado a um pedido.'); }
  };

  return (
    <CrudPage description="Mantenha os dados de contato organizados para agilizar novos atendimentos." eyebrow="Cadastros" title="Clientes">
      <section className="split-layout">
        <FormPanel editing={editando} label="cliente">
          <ClienteForm clienteParaEdicao={editando} onCadastroSucesso={(item) => setClientes((atuais) => [...atuais, item])} onEdicaoSucesso={(item) => { if (item) setClientes((atuais) => atuais.map((current) => current.id === item.id ? item : current)); setEditando(null); }} />
        </FormPanel>
        <ListPanel count={clientes.length} error={error} loading={loading} title="Clientes cadastrados">
          {clientes.map((cliente) => (
            <tr key={cliente.id}><td><span className="cell-title">{cliente.nome}</span><span className="cell-subtitle">ID #{cliente.id}</span></td><td>{cliente.cpf}</td><td><span className="cell-title">{cliente.telefone}</span><span className="cell-subtitle">{cliente.endereco}</span></td><Actions onDelete={() => excluir(cliente)} onEdit={() => setEditando(cliente)} /></tr>
          ))}
        </ListPanel>
      </section>
    </CrudPage>
  );
};

const CrudPage = ({ children, ...header }) => <div className="page-stack"><PageHeader {...header} />{children}</div>;
const FormPanel = ({ children, editing, label }) => <article className="panel sticky-panel"><div className="panel-header"><div><h2 className="panel-title">{editing ? `Editar ${label}` : `Novo ${label}`}</h2><p className="panel-subtitle">{editing ? `Você está alterando o registro #${editing.id}` : 'Preencha os campos para cadastrar'}</p></div>{editing && <span className="status-badge status-info">Editando</span>}</div><div className="panel-body">{children}</div></article>;
const ListPanel = ({ children, count, error, loading, title }) => <article className="panel"><div className="panel-header"><div><h2 className="panel-title">{title}</h2><p className="panel-subtitle">{count} registros encontrados</p></div></div>{error && <div className="panel-body"><div className="alert alert-error">{error}</div></div>}{loading ? <div className="loading-state"><div><div className="spinner" />Carregando...</div></div> : count === 0 ? <div className="empty-state"><div><div className="empty-state-icon"><Icon name="clients" /></div><strong>Nenhum registro</strong><p>Os novos cadastros aparecerão aqui.</p></div></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Cliente</th><th>Documento</th><th>Contato</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead><tbody>{children}</tbody></table></div>}</article>;
const Actions = ({ onDelete, onEdit }) => <td><div className="table-actions"><button aria-label="Editar" className="icon-button" onClick={onEdit} type="button"><Icon name="edit" size={15} /></button><button aria-label="Excluir" className="icon-button" onClick={onDelete} style={{ color: 'var(--red)' }} type="button"><Icon name="trash" size={15} /></button></div></td>;
export default CadastroClientePage;

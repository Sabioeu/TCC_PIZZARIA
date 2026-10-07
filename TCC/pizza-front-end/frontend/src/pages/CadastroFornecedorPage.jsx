import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';

const initialSupplier = { id: null, nome: '', cnpjCpf: '', telefone: '', email: '', endereco: '', ativo: true };

const CadastroFornecedorPage = () => {
  const [fornecedor, setFornecedor] = useState(initialSupplier);
  const [fornecedores, setFornecedores] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');
    try { const response = await api.get('/fornecedores'); setFornecedores(response.data || []); }
    catch (err) { console.error(err); setError('Não foi possível carregar os fornecedores.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => fornecedores.filter((item) => (
    `${item.nome} ${item.cnpjCpf || ''}`.toLowerCase().includes(termoBusca.toLowerCase())
  )), [fornecedores, termoBusca]);

  const update = (event) => {
    const { name, value } = event.target;
    setFornecedor((current) => ({ ...current, [name]: name === 'ativo' ? value === 'true' : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = fornecedor.id
        ? await api.put(`/fornecedores/${fornecedor.id}`, fornecedor)
        : await api.post('/fornecedores', fornecedor);
      setFornecedores((atuais) => fornecedor.id
        ? atuais.map((item) => item.id === response.data.id ? response.data : item)
        : [...atuais, response.data]);
      setFornecedor(initialSupplier);
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err);
      setError(err.response?.data?.message || 'Não foi possível salvar o fornecedor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader description="Centralize parceiros comerciais e defina quais estão disponíveis para novos lançamentos." eyebrow="Cadastros" title="Fornecedores" />
      {error && <div className="alert alert-error"><Icon name="alert" size={17} />{error}</div>}
      <section className="split-layout">
        <article className="panel sticky-panel">
          <div className="panel-header"><div><h2 className="panel-title">{fornecedor.id ? 'Editar fornecedor' : 'Novo fornecedor'}</h2><p className="panel-subtitle">{fornecedor.id ? `Alterando o registro #${fornecedor.id}` : 'Cadastre um parceiro comercial'}</p></div>{fornecedor.id && <span className="status-badge status-info">Editando</span>}</div>
          <div className="panel-body">
            <form className="form-grid" onSubmit={handleSubmit}>
              <Field className="full-span" label="Razão social / nome"><input name="nome" onChange={update} placeholder="Nome do fornecedor" required value={fornecedor.nome} /></Field>
              <Field label="CNPJ / CPF"><input disabled={Boolean(fornecedor.id)} name="cnpjCpf" onChange={update} placeholder="Documento" required value={fornecedor.cnpjCpf} /></Field>
              <Field label="Telefone"><input name="telefone" onChange={update} placeholder="(00) 00000-0000" value={fornecedor.telefone} /></Field>
              <Field className="full-span" label="E-mail"><input name="email" onChange={update} placeholder="contato@fornecedor.com" type="email" value={fornecedor.email} /></Field>
              <Field className="full-span" label="Endereço"><input name="endereco" onChange={update} placeholder="Endereço comercial" value={fornecedor.endereco} /></Field>
              <Field className="full-span" label="Status"><select name="ativo" onChange={update} value={String(fornecedor.ativo)}><option value="true">Ativo — disponível no financeiro</option><option value="false">Inativo — oculto no financeiro</option></select></Field>
              <div className="form-actions">{fornecedor.id && <button className="button" onClick={() => setFornecedor(initialSupplier)} type="button">Cancelar</button>}<button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : fornecedor.id ? 'Salvar alterações' : 'Cadastrar fornecedor'}</button></div>
            </form>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header"><div><h2 className="panel-title">Fornecedores cadastrados</h2><p className="panel-subtitle">{filtrados.length} registros encontrados</p></div><input className="search-input" onChange={(event) => setTermoBusca(event.target.value)} placeholder="Buscar nome ou documento" style={{ width: 210 }} value={termoBusca} /></div>
          {loading ? <div className="loading-state"><div><div className="spinner" />Carregando...</div></div> : filtrados.length === 0 ? <div className="empty-state"><div><div className="empty-state-icon"><Icon name="suppliers" /></div><strong>Nenhum fornecedor</strong><p>Os parceiros cadastrados aparecerão aqui.</p></div></div> : (
            <div className="table-wrap"><table className="data-table"><thead><tr><th>Fornecedor</th><th>Contato</th><th>Status</th><th style={{ textAlign: 'right' }}>Ação</th></tr></thead><tbody>{filtrados.map((item) => <tr key={item.id}><td><span className="cell-title">{item.nome}</span><span className="cell-subtitle">{item.cnpjCpf}</span></td><td><span className="cell-title">{item.telefone || '—'}</span><span className="cell-subtitle">{item.email || 'Sem e-mail'}</span></td><td><span className={`status-badge ${item.ativo ? 'status-success' : 'status-neutral'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span></td><td><div className="table-actions"><button className="button button-sm" onClick={() => setFornecedor(item)} type="button"><Icon name="edit" size={14} /> Editar</button></div></td></tr>)}</tbody></table></div>
          )}
        </article>
      </section>
    </div>
  );
};

const Field = ({ children, className = '', label }) => <div className={`form-field ${className}`}><label className="form-label">{label}</label>{children}</div>;
export default CadastroFornecedorPage;

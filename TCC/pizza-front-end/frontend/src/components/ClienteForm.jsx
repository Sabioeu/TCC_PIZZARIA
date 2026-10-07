import React, { useEffect, useState } from 'react';
import api from '../api/api';
import Icon from './Icon';

const initialData = { nome: '', cpf: '', telefone: '', endereco: '' };

const ClienteForm = ({ onCadastroSucesso, clienteParaEdicao, onEdicaoSucesso }) => {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(clienteParaEdicao ? {
      nome: clienteParaEdicao.nome || '',
      cpf: clienteParaEdicao.cpf || '',
      telefone: clienteParaEdicao.telefone || '',
      endereco: clienteParaEdicao.endereco || '',
    } : initialData);
    setError('');
  }, [clienteParaEdicao]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = clienteParaEdicao
        ? await api.put(`/clientes/${clienteParaEdicao.id}`, formData)
        : await api.post('/clientes', formData);
      if (clienteParaEdicao) onEdicaoSucesso?.(response.data);
      else onCadastroSucesso?.(response.data);
      setFormData(initialData);
    } catch (err) {
      console.error('Erro ao processar cliente:', err);
      setError(err.response?.data?.message || 'Não foi possível salvar o cliente.');
    } finally {
      setSaving(false);
    }
  };

  const update = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <Field className="full-span" label="Nome completo"><input autoComplete="name" name="nome" onChange={update} placeholder="Nome do cliente" required value={formData.nome} /></Field>
      <Field label="CPF"><input inputMode="numeric" name="cpf" onChange={update} placeholder="000.000.000-00" required value={formData.cpf} /></Field>
      <Field label="Telefone"><input autoComplete="tel" name="telefone" onChange={update} placeholder="(00) 00000-0000" required value={formData.telefone} /></Field>
      <Field className="full-span" label="Endereço"><input autoComplete="street-address" name="endereco" onChange={update} placeholder="Rua, número e bairro" required value={formData.endereco} /></Field>
      {error && <div className="alert alert-error full-span"><Icon name="alert" size={16} />{error}</div>}
      <div className="form-actions">
        {clienteParaEdicao && <button className="button" onClick={() => onEdicaoSucesso?.(null)} type="button">Cancelar</button>}
        <button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : clienteParaEdicao ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
      </div>
    </form>
  );
};

const Field = ({ children, className = '', label }) => <div className={`form-field ${className}`}><label className="form-label">{label}</label>{children}</div>;
export default ClienteForm;

import React, { useEffect, useState } from 'react';
import api from '../api/api';
import Icon from './Icon';

const initialData = { nome: '', email: '', senha: '', perfil: 'ATENDENTE' };

const UsuarioForm = ({ onCadastroSucesso, usuarioParaEdicao, onEdicaoSucesso }) => {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(usuarioParaEdicao ? {
      nome: usuarioParaEdicao.nome || '',
      email: usuarioParaEdicao.email || '',
      senha: '',
      perfil: usuarioParaEdicao.perfil || 'ATENDENTE',
    } : initialData);
    setError('');
  }, [usuarioParaEdicao]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...formData };
      if (usuarioParaEdicao && !payload.senha) delete payload.senha;
      const response = usuarioParaEdicao
        ? await api.put(`/usuarios/${usuarioParaEdicao.id}`, payload)
        : await api.post('/usuarios', payload);
      if (usuarioParaEdicao) onEdicaoSucesso?.(response.data);
      else onCadastroSucesso?.(response.data);
      setFormData(initialData);
    } catch (err) {
      console.error('Erro ao processar usuário:', err);
      setError(err.response?.data?.message || 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  const update = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <Field className="full-span" label="Nome"><input autoComplete="name" name="nome" onChange={update} placeholder="Nome do colaborador" required value={formData.nome} /></Field>
      <Field className="full-span" label="E-mail"><input autoComplete="email" name="email" onChange={update} placeholder="colaborador@empresa.com" required type="email" value={formData.email} /></Field>
      <Field label="Senha" hint={usuarioParaEdicao ? 'Vazio mantém a atual' : 'Mínimo de 8 caracteres'}><input autoComplete="new-password" minLength={8} maxLength={72} name="senha" onChange={update} placeholder="••••••••" required={!usuarioParaEdicao} type="password" value={formData.senha} /></Field>
      <Field label="Perfil"><select name="perfil" onChange={update} required value={formData.perfil}><option value="ATENDENTE">Atendente</option><option value="GERENTE">Gerente</option><option value="ADMINISTRADOR">Administrador</option></select></Field>
      {error && <div className="alert alert-error full-span"><Icon name="alert" size={16} />{error}</div>}
      <div className="form-actions">
        {usuarioParaEdicao && <button className="button" onClick={() => onEdicaoSucesso?.(null)} type="button">Cancelar</button>}
        <button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : usuarioParaEdicao ? 'Salvar alterações' : 'Cadastrar usuário'}</button>
      </div>
    </form>
  );
};

const Field = ({ children, className = '', hint, label }) => <div className={`form-field ${className}`}><label className="form-label">{label}{hint && <span className="form-hint">{hint}</span>}</label>{children}</div>;
export default UsuarioForm;

import Select from './Select';
import React, { useEffect, useRef, useState } from 'react';
import api from '../api/api';
import Icon from './Icon';
import { useToast } from './ToastProvider';
import { apiErrorMessage } from '../utils/apiError';
import FormField from './FormField';
import FormSection from './FormSection';
import PasswordInput from './PasswordInput';
import { firstInvalidField, requiredText, validateEmail, validatePassword } from '../utils/cadastroFields';

const initialData = { nome: '', email: '', senha: '', perfil: 'ATENDENTE', ativo: true };
const validate = (data, editing) => ({ nome: requiredText(data.nome, 'o nome do colaborador', 100), email: validateEmail(data.email, true), senha: validatePassword(data.senha, !editing), perfil: !['ATENDENTE', 'GERENTE', 'ADMINISTRADOR'].includes(data.perfil) ? 'Selecione um perfil de acesso.' : '' });
const profileDescriptions = { ATENDENTE: 'Atendimento, pedidos, comandas e consulta dos dados necessários à operação.', GERENTE: 'Acesso à operação e à gestão, incluindo estoque, financeiro e relatórios.', ADMINISTRADOR: 'Acesso completo, incluindo aprovação de contas e gestão dos usuários.' };

const UsuarioForm = ({ onCadastroSucesso, usuarioParaEdicao, onEdicaoSucesso, onSavingChange, onCancel }) => {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const savingRef = useRef(false);
  const { notify } = useToast();

  useEffect(() => {
    setFormData(usuarioParaEdicao ? {
      nome: usuarioParaEdicao.nome || '',
      email: usuarioParaEdicao.email || '',
      senha: '',
      perfil: usuarioParaEdicao.perfil || 'ATENDENTE',
      ativo: usuarioParaEdicao.ativo !== false,
    } : initialData);
    setError('');
    setFieldErrors({});
  }, [usuarioParaEdicao]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    const errors = validate(formData, Boolean(usuarioParaEdicao));
    setFieldErrors(errors); setError('');
    if (Object.values(errors).some(Boolean)) { firstInvalidField(event.currentTarget, errors); return; }
    savingRef.current = true;
    setSaving(true); onSavingChange?.(true);
    setError('');
    try {
      const payload = { ...formData, nome: formData.nome.trim(), email: formData.email.trim() };
      if (usuarioParaEdicao && !payload.senha) delete payload.senha;
      const response = usuarioParaEdicao
        ? await api.put(`/usuarios/${usuarioParaEdicao.id}`, payload)
        : await api.post('/usuarios', payload);
      if (usuarioParaEdicao) onEdicaoSucesso?.(response.data);
      else onCadastroSucesso?.(response.data);
      setFormData(initialData);
      setFieldErrors({});
      notify(usuarioParaEdicao ? 'Usuário atualizado com sucesso.' : 'Usuário cadastrado com sucesso.', { type: 'success' });
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível salvar o usuário.'));
    } finally {
      savingRef.current = false;
      setSaving(false); onSavingChange?.(false);
    }
  };

  const update = (event) => { const { name, value } = event.target; setFormData((current) => ({ ...current, [name]: value })); setFieldErrors((current) => ({ ...current, [name]: '' })); };
  const blur = (event) => { const { name } = event.target; setFieldErrors((current) => ({ ...current, [name]: validate(formData, Boolean(usuarioParaEdicao))[name] })); };
  const cancel = () => { if (savingRef.current) return; if (onCancel) onCancel(); else if (usuarioParaEdicao) onEdicaoSucesso?.(null); else { setFormData(initialData); setError(''); setFieldErrors({}); } };

  return (
    <form className="cadastro-form" aria-label="Formulário de usuário" aria-busy={saving} onSubmit={handleSubmit} noValidate>
      <fieldset className="form-fieldset" disabled={saving}>
      <FormSection title="Dados do colaborador" description="Identificação e credenciais para entrar no sistema." icon="users">
        <FormField className="full-span" label="Nome" required error={fieldErrors.nome}><input autoComplete="name" name="nome" onChange={update} onBlur={blur} maxLength={100} placeholder="Nome do colaborador" required value={formData.nome} /></FormField>
        <FormField className="full-span" label="E-mail" required error={fieldErrors.email} hint="Este será o e-mail utilizado no login."><input autoComplete="email" name="email" onChange={update} onBlur={blur} maxLength={100} placeholder="colaborador@empresa.com" required type="email" value={formData.email} /></FormField>
        <FormField className="full-span" label="Senha" required={!usuarioParaEdicao} error={fieldErrors.senha} hint={usuarioParaEdicao ? 'Deixe vazio para manter a senha atual. Preencher altera a senha deste usuário.' : 'Use pelo menos 8 caracteres. Senhas com acentos ou emojis têm limite de tamanho em bytes.'}><PasswordInput autoComplete="new-password" minLength={8} maxLength={72} name="senha" onChange={update} onBlur={blur} placeholder={usuarioParaEdicao ? 'Manter senha atual' : 'Crie uma senha para o usuário'} required={!usuarioParaEdicao} value={formData.senha} disabled={saving} /></FormField>
      </FormSection>
      <FormSection title="Permissões de acesso" description="Defina o papel e a autorização de entrada do colaborador." icon="store">
        <FormField className="full-span" label="Perfil" required error={fieldErrors.perfil} hint={profileDescriptions[formData.perfil]}><Select disabled={saving} name="perfil" onChange={update} required value={formData.perfil}><option value="ATENDENTE" data-description="Operação e atendimento">Atendente</option><option value="GERENTE" data-description="Operação e gestão">Gerente</option><option value="ADMINISTRADOR" data-description="Gestão completa e usuários">Administrador</option></Select></FormField>
        <FormField className="full-span" label="Acesso ao sistema" required hint={formData.ativo ? 'Usuário autorizado a entrar com suas credenciais.' : 'A conta será mantida, mas não poderá entrar até a liberação.'}><Select disabled={saving} name="ativo" value={formData.ativo ? 'ativo' : 'bloqueado'} onChange={(e) => setFormData((atual) => ({ ...atual, ativo: e.target.value === 'ativo' }))}><option value="ativo">Liberado — aprovar acesso</option><option value="bloqueado">Bloqueado / aguardando aprovação</option></Select></FormField>
      </FormSection>
      {error && <div className="alert alert-error full-span" role="alert"><Icon name="alert" size={16} />{error}</div>}
      <div className="form-actions cadastro-form-actions">
        <button className="button" onClick={cancel} type="button">{onCancel ? 'Voltar' : usuarioParaEdicao ? 'Cancelar edição' : 'Limpar campos'}</button>
        <button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : usuarioParaEdicao ? 'Salvar alterações' : 'Cadastrar usuário'}</button>
      </div>
      </fieldset>
    </form>
  );
};

export default UsuarioForm;

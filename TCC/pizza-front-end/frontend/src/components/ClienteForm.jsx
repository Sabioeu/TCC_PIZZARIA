import React, { useEffect, useRef, useState } from 'react';
import api from '../api/api';
import Icon from './Icon';
import { useToast } from './ToastProvider';
import { apiErrorMessage } from '../utils/apiError';
import FormField from './FormField';
import FormSection from './FormSection';
import { firstInvalidField, maskCpf, maskPhone, onlyDigits, requiredText, validateCpf, validatePhone } from '../utils/cadastroFields';

const initialData = { nome: '', cpf: '', telefone: '', endereco: '' };
const validate = (data) => ({ nome: requiredText(data.nome, 'o nome completo', 100), cpf: validateCpf(data.cpf), telefone: validatePhone(data.telefone, true), endereco: requiredText(data.endereco, 'o endereço', 255) });

const ClienteForm = ({ onCadastroSucesso, clienteParaEdicao, onEdicaoSucesso, onSavingChange, onCancel }) => {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const savingRef = useRef(false);
  const { notify } = useToast();

  useEffect(() => {
    setFormData(clienteParaEdicao ? {
      nome: clienteParaEdicao.nome || '',
      cpf: maskCpf(clienteParaEdicao.cpf || ''),
      telefone: clienteParaEdicao.telefone || '',
      endereco: clienteParaEdicao.endereco || '',
    } : initialData);
    setError('');
    setFieldErrors({});
  }, [clienteParaEdicao]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    const errors = validate(formData);
    setFieldErrors(errors); setError('');
    if (Object.values(errors).some(Boolean)) { firstInvalidField(event.currentTarget, errors); return; }
    savingRef.current = true;
    setSaving(true); onSavingChange?.(true);
    setError('');
    try {
      const payload = { nome: formData.nome.trim(), cpf: onlyDigits(formData.cpf), telefone: formData.telefone.trim(), endereco: formData.endereco.trim() };
      const response = clienteParaEdicao
        ? await api.put(`/clientes/${clienteParaEdicao.id}`, payload)
        : await api.post('/clientes', payload);
      if (clienteParaEdicao) onEdicaoSucesso?.(response.data);
      else onCadastroSucesso?.(response.data);
      setFormData(initialData);
      setFieldErrors({});
      notify(clienteParaEdicao ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.', { type: 'success' });
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível salvar o cliente.'));
    } finally {
      savingRef.current = false;
      setSaving(false); onSavingChange?.(false);
    }
  };

  const update = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: name === 'cpf' ? maskCpf(value) : name === 'telefone' ? maskPhone(value) : value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  };
  const blur = (event) => { const { name } = event.target; setFieldErrors((current) => ({ ...current, [name]: validate(formData)[name] })); };
  const cancel = () => { if (savingRef.current) return; if (onCancel) onCancel(); else if (clienteParaEdicao) onEdicaoSucesso?.(null); else { setFormData(initialData); setError(''); setFieldErrors({}); } };

  return (
    <form className="cadastro-form" aria-label="Formulário de cliente" aria-busy={saving} onSubmit={handleSubmit} noValidate>
      <fieldset className="form-fieldset" disabled={saving}>
      <FormSection title="Identificação" description="Dados para reconhecer o cliente nos atendimentos." icon="clients">
        <FormField className="full-span" label="Nome completo" required error={fieldErrors.nome}><input autoComplete="name" name="nome" onChange={update} onBlur={blur} maxLength={100} placeholder="Ex.: Maria de Souza" required value={formData.nome} /></FormField>
        <FormField className="full-span" label="CPF" required error={fieldErrors.cpf} hint="Digite os 11 números; a pontuação é aplicada automaticamente."><input inputMode="numeric" name="cpf" onChange={update} onBlur={blur} placeholder="000.000.000-00" required value={formData.cpf} /></FormField>
      </FormSection>
      <FormSection title="Contato e endereço" description="Informações para contato e identificação do endereço." icon="store">
        <FormField className="full-span" label="Telefone" required error={fieldErrors.telefone} hint="Informe o DDD. Números com código de país também são aceitos."><input autoComplete="tel" type="tel" name="telefone" onChange={update} onBlur={blur} maxLength={20} placeholder="(44) 99999-9999" required value={maskPhone(formData.telefone)} /></FormField>
        <FormField className="full-span" label="Endereço" required error={fieldErrors.endereco} hint="Inclua rua, número, bairro e complemento, se houver."><textarea autoComplete="street-address" name="endereco" onChange={update} onBlur={blur} maxLength={255} placeholder="Ex.: Rua das Palmeiras, 120, Centro" required value={formData.endereco} /></FormField>
      </FormSection>
      {error && <div className="alert alert-error full-span" role="alert"><Icon name="alert" size={16} />{error}</div>}
      <div className="form-actions cadastro-form-actions">
        <button className="button" onClick={cancel} type="button">{onCancel ? 'Voltar' : clienteParaEdicao ? 'Cancelar edição' : 'Limpar campos'}</button>
        <button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : clienteParaEdicao ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
      </div>
      </fieldset>
    </form>
  );
};

export default ClienteForm;

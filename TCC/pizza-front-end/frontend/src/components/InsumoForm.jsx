import Select from './Select';
import React, { useEffect, useRef, useState } from 'react';
import api from '../api/api';
import Icon from './Icon';
import { useToast } from './ToastProvider';
import { apiErrorMessage } from '../utils/apiError';
import FormField from './FormField';
import FormSection from './FormSection';
import { firstInvalidField, requiredText, validateDecimal } from '../utils/cadastroFields';

const initialData = { nome: '', quantidade: '', unidade: '' };
const validate = (data) => ({ nome: requiredText(data.nome, 'o nome do insumo', 150), quantidade: validateDecimal(data.quantidade, 0, 'Informe uma quantidade igual ou maior que zero.', 6), unidade: requiredText(data.unidade, 'a unidade de medida', 50) });
const unidades = [
  { value: 'g', label: 'Gramas (g)' },
  { value: 'kg', label: 'Quilogramas (kg)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'un', label: 'Unidades (un)' },
];

const InsumoForm = ({ onCadastroSucesso, insumoParaEdicao, onEdicaoSucesso, onSavingChange, onCancel }) => {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const savingRef = useRef(false);
  const { notify } = useToast();

  useEffect(() => {
    setFormData(insumoParaEdicao ? {
      nome: insumoParaEdicao.nome || '',
      quantidade: insumoParaEdicao.quantidade ?? '',
      unidade: insumoParaEdicao.unidade || '',
    } : initialData);
    setError('');
    setFieldErrors({});
  }, [insumoParaEdicao]);

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
      const payload = { ...formData, nome: formData.nome.trim(), quantidade: Number(formData.quantidade) };
      const response = insumoParaEdicao
        ? await api.put(`/insumos/${insumoParaEdicao.id}`, payload)
        : await api.post('/insumos', payload);
      if (insumoParaEdicao) onEdicaoSucesso?.(response.data);
      else onCadastroSucesso?.(response.data);
      setFormData(initialData);
      setFieldErrors({});
      notify(insumoParaEdicao ? 'Insumo atualizado com sucesso.' : 'Insumo cadastrado com sucesso.', { type: 'success' });
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível salvar o insumo.'));
    } finally {
      savingRef.current = false;
      setSaving(false); onSavingChange?.(false);
    }
  };

  const update = (event) => { const { name, value } = event.target; setFormData((current) => ({ ...current, [name]: value })); setFieldErrors((current) => ({ ...current, [name]: '' })); };
  const blur = (event) => { const { name } = event.target; setFieldErrors((current) => ({ ...current, [name]: validate(formData)[name] })); };
  const cancel = () => { if (savingRef.current) return; if (onCancel) onCancel(); else if (insumoParaEdicao) onEdicaoSucesso?.(null); else { setFormData(initialData); setError(''); setFieldErrors({}); } };
  const listedUnits = unidades.some((unit) => unit.value === formData.unidade) ? unidades : [...unidades, { value: formData.unidade, label: formData.unidade }].filter((unit) => unit.value);

  return (
    <form className="cadastro-form" aria-label="Formulário de insumo" aria-busy={saving} onSubmit={handleSubmit} noValidate>
      <fieldset className="form-fieldset" disabled={saving}>
      <FormSection title="Identificação do insumo" description="Cadastre a matéria-prima utilizada na operação." icon="ingredients">
        <FormField className="full-span" label="Nome do insumo" required error={fieldErrors.nome}><input name="nome" onChange={update} onBlur={blur} maxLength={150} placeholder="Ex.: Farinha de trigo" required value={formData.nome} /></FormField>
      </FormSection>
      <FormSection title="Saldo e unidade" description="Informe a quantidade na mesma unidade utilizada no controle de estoque." icon="inventory">
        <FormField label={insumoParaEdicao ? 'Quantidade em estoque' : 'Quantidade inicial'} required error={fieldErrors.quantidade} hint={insumoParaEdicao ? 'Alterar o saldo registra um ajuste no histórico de estoque.' : 'Informe zero se ainda não houver estoque.'}><input inputMode="decimal" min="0" name="quantidade" onChange={update} onBlur={blur} placeholder="0" required step="0.000001" type="number" value={formData.quantidade} /></FormField>
        <p className="form-hint full-span">O saldo físico aceita até seis casas decimais. A quantidade já reservada em comandas não pode ser consumida por um ajuste.</p>
        <FormField label="Unidade de medida" required error={fieldErrors.unidade} hint={insumoParaEdicao ? 'A unidade não pode ser trocada para preservar o histórico.' : 'Exemplo: farinha em kg ou embalagens em unidades.'}><Select disabled={saving || Boolean(insumoParaEdicao)} name="unidade" onChange={update} required value={formData.unidade}><option value="">Selecione...</option>{listedUnits.map((unidade) => <option key={unidade.value} value={unidade.value}>{unidade.label}</option>)}</Select></FormField>
      </FormSection>
      {error && <div className="alert alert-error full-span" role="alert"><Icon name="alert" size={16} />{error}</div>}
      <div className="form-actions cadastro-form-actions">
        <button className="button" onClick={cancel} type="button">{onCancel ? 'Voltar' : insumoParaEdicao ? 'Cancelar edição' : 'Limpar campos'}</button>
        <button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : insumoParaEdicao ? 'Salvar alterações' : 'Cadastrar insumo'}</button>
      </div>
      </fieldset>
    </form>
  );
};

export default InsumoForm;

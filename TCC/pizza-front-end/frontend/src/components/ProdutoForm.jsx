import React, { useEffect, useRef, useState } from 'react';
import api from '../api/api';
import Icon from './Icon';
import { useToast } from './ToastProvider';
import { apiErrorMessage } from '../utils/apiError';
import FormField from './FormField';
import FormSection from './FormSection';
import { firstInvalidField, requiredText, validateDecimal } from '../utils/cadastroFields';

const initialData = { nome: '', preco: '', descricao: '' };
const validate = (data) => ({ nome: requiredText(data.nome, 'o nome do produto', 150), preco: validateDecimal(data.preco, 0.01, 'Informe um preço de venda a partir de R$ 0,01.'), descricao: data.descricao.length > 500 ? 'Use no máximo 500 caracteres.' : '' });

const ProdutoForm = ({ onCadastroSucesso, produtoParaEdicao, onEdicaoSucesso, onSavingChange, onCancel }) => {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const savingRef = useRef(false);
  const { notify } = useToast();

  useEffect(() => {
    setFormData(produtoParaEdicao ? {
      nome: produtoParaEdicao.nome || '',
      preco: produtoParaEdicao.preco ?? '',
      descricao: produtoParaEdicao.descricao || '',
    } : initialData);
    setError('');
    setFieldErrors({});
  }, [produtoParaEdicao]);

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
      const payload = { ...formData, nome: formData.nome.trim(), preco: Number(formData.preco) };
      const response = produtoParaEdicao
        ? await api.put(`/produtos/${produtoParaEdicao.id}`, payload)
        : await api.post('/produtos', payload);
      if (produtoParaEdicao) onEdicaoSucesso?.(response.data);
      else onCadastroSucesso?.(response.data);
      setFormData(initialData);
      setFieldErrors({});
      notify(produtoParaEdicao ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.', { type: 'success' });
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível salvar o produto.'));
    } finally {
      savingRef.current = false;
      setSaving(false); onSavingChange?.(false);
    }
  };

  const update = (event) => { const { name, value } = event.target; setFormData((current) => ({ ...current, [name]: value })); setFieldErrors((current) => ({ ...current, [name]: '' })); };
  const blur = (event) => { const { name } = event.target; setFieldErrors((current) => ({ ...current, [name]: validate(formData)[name] })); };
  const cancel = () => { if (savingRef.current) return; if (onCancel) onCancel(); else if (produtoParaEdicao) onEdicaoSucesso?.(null); else { setFormData(initialData); setError(''); setFieldErrors({}); } };

  return (
    <form className="cadastro-form" aria-label="Formulário de produto" aria-busy={saving} onSubmit={handleSubmit} noValidate>
      <fieldset className="form-fieldset" disabled={saving}>
      <FormSection title="Informações do produto" description="Defina como o item será identificado no cardápio." icon="products">
        <FormField className="full-span" label="Nome do produto" required error={fieldErrors.nome}><input name="nome" onChange={update} onBlur={blur} maxLength={150} placeholder="Ex.: Pizza Margherita" required value={formData.nome} /></FormField>
        <FormField className="full-span" label="Descrição" error={fieldErrors.descricao} hint="Até 500 caracteres para ingredientes ou detalhes importantes."><textarea name="descricao" onChange={update} onBlur={blur} maxLength={500} placeholder="Ex.: Molho de tomate, muçarela e manjericão" value={formData.descricao} /></FormField>
      </FormSection>
      <FormSection title="Valor de venda" description="Valor cobrado por uma unidade deste produto." icon="finance">
        <FormField className="full-span" label="Preço de venda" required error={fieldErrors.preco} hint="Valor em reais. Exemplo: 39,90."><input inputMode="decimal" min="0.01" name="preco" onChange={update} onBlur={blur} placeholder="0,00" required step="0.01" type="number" value={formData.preco} /></FormField>
      </FormSection>
      <div className="cadastro-form-note"><Icon name="inventory" size={17} /><span>As entradas de estoque do produto são registradas no módulo Estoque, separado do cadastro.</span></div>
      {error && <div className="alert alert-error full-span" role="alert"><Icon name="alert" size={16} />{error}</div>}
      <div className="form-actions cadastro-form-actions">
        <button className="button" onClick={cancel} type="button">{onCancel ? 'Voltar' : produtoParaEdicao ? 'Cancelar edição' : 'Limpar campos'}</button>
        <button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : produtoParaEdicao ? 'Salvar alterações' : 'Cadastrar produto'}</button>
      </div>
      </fieldset>
    </form>
  );
};

export default ProdutoForm;

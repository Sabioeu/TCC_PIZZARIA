import React, { useEffect, useState } from 'react';
import api from '../api/api';
import Icon from './Icon';

const initialData = { nome: '', quantidade: '', unidade: '' };
const unidades = [
  { value: 'g', label: 'Gramas (g)' },
  { value: 'kg', label: 'Quilogramas (kg)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'un', label: 'Unidades (un)' },
];

const InsumoForm = ({ onCadastroSucesso, insumoParaEdicao, onEdicaoSucesso }) => {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(insumoParaEdicao ? {
      nome: insumoParaEdicao.nome || '',
      quantidade: insumoParaEdicao.quantidade ?? '',
      unidade: insumoParaEdicao.unidade || '',
    } : initialData);
    setError('');
  }, [insumoParaEdicao]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.unidade) {
      setError('Selecione uma unidade de medida.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...formData, quantidade: Number(formData.quantidade) };
      const response = insumoParaEdicao
        ? await api.put(`/insumos/${insumoParaEdicao.id}`, payload)
        : await api.post('/insumos', payload);
      if (insumoParaEdicao) onEdicaoSucesso?.(response.data);
      else onCadastroSucesso?.(response.data);
      setFormData(initialData);
    } catch (err) {
      console.error('Erro ao processar insumo:', err);
      setError(err.response?.data?.message || 'Não foi possível salvar o insumo.');
    } finally {
      setSaving(false);
    }
  };

  const update = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <Field className="full-span" label="Nome do insumo"><input name="nome" onChange={update} placeholder="Ex.: Farinha de trigo" required value={formData.nome} /></Field>
      <Field label="Quantidade inicial"><input min="0" name="quantidade" onChange={update} placeholder="0" required step="0.01" type="number" value={formData.quantidade} /></Field>
      <Field label="Unidade de medida"><select name="unidade" onChange={update} required value={formData.unidade}><option value="">Selecione...</option>{unidades.map((unidade) => <option key={unidade.value} value={unidade.value}>{unidade.label}</option>)}</select></Field>
      {error && <div className="alert alert-error full-span"><Icon name="alert" size={16} />{error}</div>}
      <div className="form-actions">
        {insumoParaEdicao && <button className="button" onClick={() => onEdicaoSucesso?.(null)} type="button">Cancelar</button>}
        <button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : insumoParaEdicao ? 'Salvar alterações' : 'Cadastrar insumo'}</button>
      </div>
    </form>
  );
};

const Field = ({ children, className = '', label }) => <div className={`form-field ${className}`}><label className="form-label">{label}</label>{children}</div>;
export default InsumoForm;

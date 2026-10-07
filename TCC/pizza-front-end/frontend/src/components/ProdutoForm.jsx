import React, { useEffect, useState } from 'react';
import api from '../api/api';
import Icon from './Icon';

const initialData = { nome: '', preco: '', descricao: '' };

const ProdutoForm = ({ onCadastroSucesso, produtoParaEdicao, onEdicaoSucesso }) => {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(produtoParaEdicao ? {
      nome: produtoParaEdicao.nome || '',
      preco: produtoParaEdicao.preco ?? '',
      descricao: produtoParaEdicao.descricao || '',
    } : initialData);
    setError('');
  }, [produtoParaEdicao]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...formData, preco: Number(formData.preco) };
      const response = produtoParaEdicao
        ? await api.put(`/produtos/${produtoParaEdicao.id}`, payload)
        : await api.post('/produtos', payload);
      if (produtoParaEdicao) onEdicaoSucesso?.(response.data);
      else onCadastroSucesso?.(response.data);
      setFormData(initialData);
    } catch (err) {
      console.error('Erro ao processar produto:', err);
      setError(err.response?.data?.message || 'Não foi possível salvar o produto.');
    } finally {
      setSaving(false);
    }
  };

  const update = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <Field className="full-span" label="Nome do produto"><input name="nome" onChange={update} placeholder="Ex.: Pizza Margherita" required value={formData.nome} /></Field>
      <Field className="full-span" label="Preço de venda"><input min="0.01" name="preco" onChange={update} placeholder="0,00" required step="0.01" type="number" value={formData.preco} /></Field>
      <Field className="full-span" label="Descrição"><textarea name="descricao" onChange={update} placeholder="Ingredientes ou detalhes do item" value={formData.descricao} /></Field>
      {error && <div className="alert alert-error full-span"><Icon name="alert" size={16} />{error}</div>}
      <div className="form-actions">
        {produtoParaEdicao && <button className="button" onClick={() => onEdicaoSucesso?.(null)} type="button">Cancelar</button>}
        <button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : produtoParaEdicao ? 'Salvar alterações' : 'Cadastrar produto'}</button>
      </div>
    </form>
  );
};

const Field = ({ children, className = '', label }) => <div className={`form-field ${className}`}><label className="form-label">{label}</label>{children}</div>;
export default ProdutoForm;

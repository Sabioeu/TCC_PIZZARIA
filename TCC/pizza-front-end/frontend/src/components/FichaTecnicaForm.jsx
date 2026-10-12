import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/api';
import { apiErrorMessage } from '../utils/apiError';
import FormField from './FormField';
import FormSection from './FormSection';
import Select from './Select';
import Icon from './Icon';
import { useToast } from './ToastProvider';
import './FichaTecnicaForm.css';

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 });
const quantidade = (value) => Number(String(value ?? '').trim().replace(',', '.'));
const normalizar = (items = []) => items.map((item, index) => ({ ...item, key: `salvo-${index}`, insumoId: String(item.insumoId), quantidadePorUnidade: String(item.quantidadePorUnidade ?? '') }));

export default function FichaTecnicaForm({ produto, onCancel, onSavingChange, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [porIngredientes, setPorIngredientes] = useState(false);
  const [insumos, setInsumos] = useState([]);
  const [componentes, setComponentes] = useState([]);
  const [errors, setErrors] = useState({});
  const [tentativa, setTentativa] = useState(0);
  const saved = useRef([]);
  const savingRef = useRef(false);
  const nextKey = useRef(0);
  const addButton = useRef(null);
  const focusAfterRemoval = useRef(false);
  const form = useRef(null);
  const { notify } = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true); setLoadError(''); setError(''); setErrors({});
    Promise.all([api.get(`/produtos/${produto.id}/ficha-tecnica`), api.get('/insumos')])
      .then(([ficha, ingredientes]) => {
        if (!mounted) return;
        const rows = normalizar(ficha.data.componentes || []);
        saved.current = rows;
        setComponentes(rows); setPorIngredientes(Boolean(ficha.data.porIngredientes));
        setInsumos(ingredientes.data || []);
      })
      .catch((err) => { if (mounted) setLoadError(apiErrorMessage(err, 'Não foi possível carregar a ficha técnica. Tente novamente.')); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [produto.id, tentativa]);

  const insumoDe = useCallback((row) => insumos.find((item) => String(item.id) === row.insumoId), [insumos]);
  const rows = porIngredientes ? componentes : saved.current;
  useEffect(() => {
    if (focusAfterRemoval.current) {
      focusAfterRemoval.current = false;
      addButton.current?.focus();
    }
  }, [componentes]);
  const adicionar = () => {
    if (savingRef.current) return;
    const key = `novo-${nextKey.current++}`;
    setComponentes((current) => [...current, { key, insumoId: '', quantidadePorUnidade: '' }]);
    setErrors((current) => ({ ...current, lista: '' }));
  };
  const atualizar = (key, field, value) => {
    if (savingRef.current) return;
    setComponentes((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));
    setErrors((current) => ({ ...current, [`${key}-${field}`]: '', lista: '' }));
    setError('');
  };
  const remover = (key) => {
    if (savingRef.current) return;
    focusAfterRemoval.current = true;
    setComponentes((current) => current.filter((row) => row.key !== key));
    setErrors({}); setError('');
  };
  const validar = () => {
    const found = {};
    if (!porIngredientes) return found;
    if (!componentes.length) found.lista = 'Adicione pelo menos um insumo para ativar o preparo por ingredientes.';
    const used = new Set();
    componentes.forEach((row) => {
      if (!insumoDe(row)) found[`${row.key}-insumoId`] = 'Selecione um insumo cadastrado.';
      else if (used.has(row.insumoId)) found[`${row.key}-insumoId`] = 'Este insumo já foi adicionado. Ajuste a quantidade na linha existente.';
      used.add(row.insumoId);
      const text = row.quantidadePorUnidade.trim();
      if (!/^\d+(?:[.,]\d{1,6})?$/.test(text) || !Number.isFinite(quantidade(text)) || quantidade(text) <= 0) {
        found[`${row.key}-quantidadePorUnidade`] = 'Informe uma quantidade maior que zero, com até 6 casas decimais.';
      }
    });
    return found;
  };
  const submit = async (event) => {
    event.preventDefault();
    if (savingRef.current || loading || loadError) return;
    const invalid = validar();
    setErrors(invalid); setError('');
    if (Object.values(invalid).some(Boolean)) {
      if (invalid.lista) addButton.current?.focus();
      else form.current?.elements.namedItem(Object.keys(invalid)[0])?.focus();
      return;
    }
    savingRef.current = true; setSaving(true); onSavingChange?.(true);
    try {
      const payload = {
        porIngredientes,
        componentes: rows.map((row) => ({ insumoId: Number(row.insumoId), quantidadePorUnidade: quantidade(row.quantidadePorUnidade) })),
      };
      const response = await api.put(`/produtos/${produto.id}/ficha-tecnica`, payload);
      notify('Ficha técnica salva. O controle de estoque foi atualizado.', { type: 'success' });
      onSuccess?.(response.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível salvar a ficha técnica. Seus dados foram mantidos.'));
    } finally {
      savingRef.current = false; setSaving(false); onSavingChange?.(false);
    }
  };
  const cancelar = () => { if (!savingRef.current) onCancel?.(); };

  if (loading || loadError) return <div className="ficha-loading">
    {loading ? <div className="ficha-loading-message" role="status"><Icon name="ingredients" size={24} /><strong>Carregando ficha técnica…</strong><span>Buscando os insumos e a composição do produto.</span></div> : <div className="alert alert-error" role="alert">{loadError}</div>}
    <div className="form-actions"><button className="button" onClick={cancelar} type="button">Voltar</button>{loadError && <button className="button button-primary" onClick={() => setTentativa((current) => current + 1)} type="button"><Icon name="refresh" size={16} /> Tentar novamente</button>}</div>
  </div>;

  return <form ref={form} className="cadastro-form ficha-form" aria-label={`Ficha técnica de ${produto.nome}`} aria-busy={saving} onSubmit={submit} noValidate>
    <fieldset className="form-fieldset" disabled={saving}>
      <FormSection title="Como este produto usa o estoque?" description="Escolha o controle adequado para este item. Os demais produtos não serão alterados." icon="inventory">
        <FormField className="full-span" label="Controle de estoque" required hint="Ative ingredientes apenas depois de informar a composição real do produto.">
          <Select name="controleEstoque" disabled={saving} value={porIngredientes ? 'ingredientes' : 'produto'} onChange={(event) => { setPorIngredientes(event.target.value === 'ingredientes'); setErrors({}); setError(''); }}>
            <option value="produto" data-icon="products" data-description="Baixa unidades do próprio produto ao faturar.">Produto estocado</option>
            <option value="ingredientes" data-icon="ingredients" data-description="Reserva e baixa os insumos da ficha técnica.">Preparado por ingredientes</option>
          </Select>
        </FormField>
        <div className={`full-span ficha-mode-note ${porIngredientes ? 'is-active' : ''}`}>
          <Icon name={porIngredientes ? 'ingredients' : 'products'} size={20} />
          <div><strong>{porIngredientes ? 'A disponibilidade vem dos ingredientes' : 'A disponibilidade vem do saldo do produto'}</strong><p>{porIngredientes ? 'Ao abrir ou alterar uma comanda, os ingredientes ficam reservados. A baixa física ocorre no faturamento; cancelar libera a reserva.' : 'Este item mantém o controle de unidades prontas. A ficha já salva é preservada, mas não consome ingredientes neste modo.'}</p></div>
        </div>
      </FormSection>
      <FormSection title="Composição de uma unidade" description={`Informe o consumo para preparar 1 unidade de ${produto.nome}. Não some as quantidades de unidades diferentes.`} icon="ingredients">
        <div className="cadastro-form-note full-span"><Icon name="alert" size={17} /><span>Use a unidade cadastrada no insumo: <strong>0,2 kg = 200 g</strong>, mas se o cadastro está em kg, informe <strong>0,2</strong>. Não há conversão automática de unidades.</span></div>
        {!porIngredientes && <p className="form-hint full-span ficha-inactive-hint">{rows.length ? 'Composição salva abaixo, somente para consulta. Selecione “Preparado por ingredientes” para editar e ativar.' : 'Este produto ainda não tem uma composição. Selecione “Preparado por ingredientes” para configurar.'}</p>}
        {!rows.length && porIngredientes && <div className="ficha-empty full-span"><Icon name="ingredients" size={24} /><strong>Comece pela composição</strong><span>Adicione os insumos e o consumo de cada um para uma unidade.</span></div>}
        <div className="ficha-ingredient-list full-span">
          {rows.map((row, index) => {
            const insumo = insumoDe(row);
            const nome = insumo?.nome || row.nome || 'Insumo';
            const unidade = insumo?.unidade || row.unidade || 'unidade cadastrada';
            return <section className="ficha-ingredient" key={row.key} aria-label={`Ingrediente ${index + 1}`}>
              <div className="ficha-ingredient-top"><span className="ficha-ingredient-number">{index + 1}</span><strong>{insumo ? nome : 'Escolha um insumo'}</strong>{porIngredientes && <button className="icon-button" aria-label={`Remover ingrediente ${index + 1}`} title="Remover ingrediente" disabled={saving} onClick={() => remover(row.key)} type="button"><Icon name="trash" size={16} /></button>}</div>
              <div className="ficha-ingredient-fields">
                <FormField label={`Insumo ${index + 1}`} required error={errors[`${row.key}-insumoId`]}>
                  <Select name={`${row.key}-insumoId`} value={row.insumoId} disabled={saving || !porIngredientes} required searchable onChange={(event) => atualizar(row.key, 'insumoId', event.target.value)}>
                    <option value="">Selecione um insumo</option>
                    {insumos.map((item) => <option key={item.id} value={String(item.id)} disabled={componentes.some((other) => other.key !== row.key && other.insumoId === String(item.id))} data-description={`Unidade: ${item.unidade || 'não informada'}`}>{item.nome} · {item.unidade || '—'}</option>)}
                    {row.insumoId && !insumo && <option value={row.insumoId} disabled>{row.nome || 'Insumo indisponível'} · {row.unidade || '—'}</option>}
                  </Select>
                </FormField>
                <FormField label={`Quantidade por unidade ${index + 1}`} required error={errors[`${row.key}-quantidadePorUnidade`]} hint={`Em ${unidade}. Até 6 casas decimais.`}>
                  <input name={`${row.key}-quantidadePorUnidade`} value={row.quantidadePorUnidade} disabled={saving || !porIngredientes} inputMode="decimal" maxLength={24} placeholder="Ex.: 0,2" onChange={(event) => atualizar(row.key, 'quantidadePorUnidade', event.target.value)} />
                </FormField>
              </div>
            </section>;
          })}
        </div>
        {porIngredientes && <div className="full-span ficha-add-row"><button ref={addButton} className="button" disabled={saving || componentes.length >= insumos.length} type="button" onClick={adicionar}><Icon name="plus" size={16} /> Adicionar insumo</button><span className="form-hint">{insumos.length ? 'Cada insumo deve aparecer uma única vez.' : 'Cadastre os insumos no módulo Insumos antes de montar a ficha.'}</span></div>}
        {errors.lista && <small className="field-error full-span" role="alert">{errors.lista}</small>}
      </FormSection>
      {porIngredientes && rows.some((row) => insumoDe(row) && quantidade(row.quantidadePorUnidade) > 0) && <aside className="ficha-summary" aria-label="Resumo da composição">
        <div className="ficha-summary-heading"><Icon name="pizza" size={20} /><div><strong>Para preparar 1 unidade</strong><span>{produto.nome}</span></div></div>
        <ul>{rows.filter((row) => insumoDe(row) && quantidade(row.quantidadePorUnidade) > 0).map((row) => <li key={row.key}><span>{insumoDe(row).nome}</span><strong>{numberFormat.format(quantidade(row.quantidadePorUnidade))} {insumoDe(row).unidade}</strong></li>)}</ul>
        <p>Não altera o preço de venda. O custo da receita não é calculado nesta etapa.</p>
      </aside>}
      <div className="cadastro-form-note"><Icon name="shield" size={17} /><span>Para proteger as reservas, alterações da ficha ou do modo de estoque são bloqueadas enquanto este produto estiver em comandas abertas.</span></div>
      {error && <div className="alert alert-error" role="alert"><Icon name="alert" size={16} />{error}</div>}
      <div className="form-actions cadastro-form-actions"><button className="button" onClick={cancelar} type="button">Voltar</button><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando…' : 'Salvar ficha técnica'}</button></div>
    </fieldset>
  </form>;
}

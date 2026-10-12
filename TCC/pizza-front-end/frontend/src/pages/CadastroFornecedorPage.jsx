import Select from '../components/Select';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import CadastroDrawer from '../components/CadastroDrawer';
import FormField from '../components/FormField';
import FormSection from '../components/FormSection';
import { useToast } from '../components/ToastProvider';
import { apiErrorMessage } from '../utils/apiError';
import { firstInvalidField, maskCpfCnpj, maskPhone, onlyDigits, requiredText } from '../utils/cadastroFields';

const initialSupplier = { id: null, nome: '', cnpjCpf: '', telefone: '', email: '', endereco: '', ativo: true };

const CadastroFornecedorPage = () => {
  const [fornecedor, setFornecedor] = useState(initialSupplier);
  const [formOpen, setFormOpen] = useState(false);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const savingRef = useRef(false);
  const { notify } = useToast();

  const carregar = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get('/fornecedores'); setFornecedores(response.data || []); }
    catch (err) { setError(apiErrorMessage(err, 'Não foi possível carregar os fornecedores.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const update = (event) => {
    const { name, value } = event.target;
    const documentValue = /^[\d.\s/-]*$/.test(value) ? onlyDigits(value) : value;
    setFornecedor((current) => ({ ...current, [name]: name === 'ativo' ? value === 'true' : name === 'cnpjCpf' ? documentValue : value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setFormError('');
  };

  const abrirCadastro = (item = initialSupplier) => {
    if (savingRef.current) return;
    setFornecedor({ ...initialSupplier, ...item, nome: item.nome || '', cnpjCpf: item.cnpjCpf || '', telefone: item.telefone || '', email: item.email || '', endereco: item.endereco || '' }); setFormError(''); setFieldErrors({}); setFormOpen(true);
  };
  const fecharCadastro = () => {
    if (savingRef.current) return;
    setFormOpen(false); setFornecedor(initialSupplier); setFormError(''); setFieldErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    const email = fornecedor.email.trim();
    const errors = {
      nome: requiredText(fornecedor.nome, 'a razão social ou o nome', 255),
      cnpjCpf: requiredText(fornecedor.cnpjCpf, 'o CNPJ ou CPF', 255),
      telefone: fornecedor.telefone.length > 255 ? 'Use no máximo 255 caracteres.' : '',
      email: email && !/^[^\s@]+@[^\s@]+$/.test(email) ? 'Informe um e-mail válido, como contato@empresa.com.' : email.length > 255 ? 'Use no máximo 255 caracteres.' : '',
      endereco: fornecedor.endereco.length > 255 ? 'Use no máximo 255 caracteres.' : '',
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      setFormError('Revise os campos destacados antes de salvar.'); firstInvalidField(event.currentTarget, errors); return;
    }
    savingRef.current = true; setSaving(true); setFormError('');
    try {
      const payload = { ...fornecedor, nome: fornecedor.nome.trim(), email, endereco: fornecedor.endereco.trim() };
      const response = fornecedor.id
        ? await api.put(`/fornecedores/${fornecedor.id}`, payload)
        : await api.post('/fornecedores', payload);
      setFornecedores((atuais) => fornecedor.id
        ? atuais.map((item) => item.id === response.data.id ? response.data : item)
        : [...atuais, response.data]);
      notify(fornecedor.id ? 'Fornecedor atualizado com sucesso.' : 'Fornecedor cadastrado com sucesso.', { type: 'success' });
      setFornecedor(initialSupplier); setFormOpen(false); setFieldErrors({});
    } catch (err) { setFormError(apiErrorMessage(err, 'Não foi possível salvar o fornecedor.')); }
    finally { savingRef.current = false; setSaving(false); }
  };

  const columns = [
    { key: 'nome', label: 'Fornecedor', render: (item) => <><span className="cell-title">{item.nome}</span><span className="cell-subtitle">{maskCpfCnpj(item.cnpjCpf)}</span></> },
    { key: 'telefone', label: 'Contato', render: (item) => <><span className="cell-title">{item.telefone ? maskPhone(item.telefone) : '—'}</span><span className="cell-subtitle">{item.email || 'Sem e-mail'}</span></> },
    { key: 'ativo', label: 'Status', value: (item) => item.ativo ? 'Ativo' : 'Inativo', render: (item) => <span className={`status-badge ${item.ativo ? 'status-success' : 'status-neutral'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span> },
    { key: 'acoes', label: 'Ações', sortable: false, align: 'right', render: (item) => <div className="table-actions"><button aria-label={`Editar fornecedor ${item.nome}`} title="Editar fornecedor" className="icon-button" disabled={saving} onClick={() => abrirCadastro(item)} type="button"><Icon name="edit" size={15} /></button></div> },
  ];

  return <div className="page-stack">
    <PageHeader description="Centralize parceiros comerciais e defina quais estão disponíveis para novos lançamentos." eyebrow="Cadastros" title="Fornecedores" actions={<button className="button button-primary" disabled={saving} onClick={() => abrirCadastro()} type="button"><Icon name="plus" size={18} /> Novo fornecedor</button>} />
    <DataTable title="Fornecedores cadastrados" description="Edite os dados de contato ou desative um parceiro sem apagar seu histórico." rows={fornecedores} columns={columns} searchKeys={['nome', 'cnpjCpf', 'email', 'telefone', 'endereco', (item) => item.ativo ? 'ativo' : 'inativo', (item) => maskCpfCnpj(item.cnpjCpf), (item) => maskPhone(item.telefone), (item) => onlyDigits(item.cnpjCpf), (item) => onlyDigits(item.telefone)]} searchPlaceholder="Buscar fornecedor, documento ou contato" loading={loading} error={error} onRetry={carregar} defaultSort={{ key: 'nome', direction: 'asc' }} emptyTitle="Nenhum fornecedor cadastrado" emptyDescription="Clique em Novo fornecedor para cadastrar os parceiros utilizados nas contas a pagar." />
    {formOpen && <CadastroDrawer title={fornecedor.id ? 'Editar fornecedor' : 'Novo fornecedor'} subtitle={fornecedor.id ? `Atualize o parceiro comercial do registro #${fornecedor.id}.` : 'Cadastre um parceiro para utilizá-lo nos lançamentos financeiros.'} busy={saving} onClose={fecharCadastro}>
      <form aria-busy={saving} aria-label="Formulário de fornecedor" className="cadastro-form" noValidate onSubmit={handleSubmit}>
        <fieldset className="form-fieldset" disabled={saving}>
          <div className="cadastro-form-note"><Icon name="suppliers" size={18} /><span>Nome e documento identificam o parceiro. Os dados de contato são opcionais.</span></div>
          <FormSection title="Identificação" description="Dados utilizados para localizar o fornecedor." icon="suppliers">
            <FormField className="full-span" label="Razão social / nome" error={fieldErrors.nome} required><input autoComplete="organization" maxLength={255} name="nome" onChange={update} placeholder="Ex.: Distribuidora Central" required value={fornecedor.nome} /></FormField>
            <FormField className="full-span" label="CNPJ / CPF" error={fieldErrors.cnpjCpf} hint={fornecedor.id ? 'O documento deste cadastro é mantido na edição.' : 'Informe o documento usado para identificar o parceiro.'} required><input disabled={Boolean(fornecedor.id)} maxLength={255} name="cnpjCpf" onChange={update} placeholder="CNPJ ou CPF do fornecedor" required value={maskCpfCnpj(fornecedor.cnpjCpf)} /></FormField>
          </FormSection>
          <FormSection title="Contato e endereço" description="Facilite a comunicação com o parceiro comercial." icon="clients">
            <FormField label="Telefone" error={fieldErrors.telefone}><input autoComplete="tel" maxLength={255} name="telefone" onChange={update} placeholder="(00) 00000-0000" type="tel" value={maskPhone(fornecedor.telefone)} /></FormField>
            <FormField label="E-mail" error={fieldErrors.email}><input autoComplete="email" maxLength={255} name="email" onChange={update} placeholder="contato@fornecedor.com" type="email" value={fornecedor.email} /></FormField>
            <FormField className="full-span" label="Endereço" error={fieldErrors.endereco}><input autoComplete="street-address" maxLength={255} name="endereco" onChange={update} placeholder="Rua, número e bairro" value={fornecedor.endereco} /></FormField>
          </FormSection>
          <FormSection title="Disponibilidade" description="Defina se o parceiro pode ser usado em novos lançamentos." icon="check">
            <FormField className="full-span" label="Status" hint="Desativar mantém os dados e o histórico já registrado." required><Select disabled={saving} name="ativo" onChange={update} value={String(fornecedor.ativo)}><option value="true">Ativo — disponível no financeiro</option><option value="false">Inativo — oculto no financeiro</option></Select></FormField>
          </FormSection>
          {formError && <div className="alert alert-error" role="alert"><Icon name="alert" size={16} />{formError}</div>}
          <div className="form-actions cadastro-form-actions"><button className="button" onClick={fecharCadastro} type="button">Voltar</button><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : fornecedor.id ? 'Salvar alterações' : 'Cadastrar fornecedor'}</button></div>
        </fieldset>
      </form>
    </CadastroDrawer>}
  </div>;
};

export default CadastroFornecedorPage;

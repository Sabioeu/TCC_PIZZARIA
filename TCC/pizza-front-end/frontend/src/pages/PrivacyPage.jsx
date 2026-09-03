import { useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import { PageHeader } from '../components/UI';
import { useApp } from '../context/AppContext';

export default function PrivacyPage() {
  const { customers, notify, refresh, session } = useApp(); const [query, setQuery] = useState(''); const [busy, setBusy] = useState(null);
  const list = customers.filter(customer => `${customer.name} ${customer.phone || ''} ${customer.email || ''}`.toLowerCase().includes(query.toLowerCase()));
  const exportData = async customer => {
    setBusy(customer.id);
    try {
      const data = session?.demo ? { generatedAt: new Date().toISOString(), format: 'AURORA-LGPD-1', customer } : (await api.get(`/privacy/customers/${customer.id}/export`)).data;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `lgpd-cliente-${customer.id}.json`; anchor.click(); URL.revokeObjectURL(url); notify('Dados do cliente exportados com rastreabilidade');
    } catch { notify('Não foi possível exportar os dados'); } finally { setBusy(null); }
  };
  const anonymize = async customer => {
    if (!window.confirm(`Anonimizar permanentemente os dados pessoais de ${customer.name}? Os registros financeiros serão preservados.`)) return;
    setBusy(customer.id); try { if (!session?.demo) await api.post(`/privacy/customers/${customer.id}/anonymize`); notify('Cliente anonimizado conforme solicitação LGPD'); await refresh(); } catch { notify('Não foi possível anonimizar o cliente'); } finally { setBusy(null); }
  };
  return <div className="page-stack"><PageHeader eyebrow="Governança de dados" title="Privacidade & LGPD" description="Exportação, consentimento e anonimização com acesso exclusivo do administrador."><span className="secure-kicker"><Icon name="shield" /> Operação auditada</span></PageHeader><section className="audit-hero"><Icon name="shield" /><div><strong>Privacidade desde a arquitetura</strong><p>A anonimização remove dados identificáveis, preservando somente registros fiscais e financeiros necessários.</p></div><span>{customers.length} titulares</span></section><section className="panel"><div className="panel-header"><div><h3 className="panel-title">Solicitações de titulares</h3><p className="panel-subtitle">Localize o cliente e execute a solicitação adequada</p></div><div className="search-wrap"><Icon name="search" /><input className="search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, telefone ou e-mail" /></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Cliente</th><th>Contato</th><th>Marketing</th><th>Pedidos</th><th>Ações LGPD</th></tr></thead><tbody>{list.map(customer => <tr key={customer.id}><td><b>{customer.name}</b></td><td>{customer.phone || customer.email || 'Dados removidos'}</td><td>{customer.marketingOptIn === false ? 'Sem consentimento' : 'Consentimento ativo'}</td><td>{customer.ordersCount || 0}</td><td><div className="table-actions"><button disabled={busy === customer.id} className="button button-sm" onClick={() => exportData(customer)}>Exportar</button><button disabled={busy === customer.id || customer.phone == null} className="button button-sm" onClick={() => anonymize(customer)}>Anonimizar</button></div></td></tr>)}</tbody></table></div></section></div>;
}

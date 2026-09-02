import { useState } from 'react';
import Icon from '../components/Icon';
import { PageHeader } from '../components/UI';
import { useApp } from '../context/AppContext';

export default function AuditPage() {
  const { audit = [] } = useApp(); const [query, setQuery] = useState('');
  const list = audit.filter(item => `${item.actor} ${item.action} ${item.entityType} ${item.details}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack"><PageHeader eyebrow="Compliance & segurança" title="Trilha de auditoria" description="Rastreabilidade de alterações sensíveis, operadores e entidades do sistema."><span className="secure-kicker"><Icon name="shield" /> Somente administradores</span></PageHeader><section className="audit-hero"><Icon name="shield" /><div><strong>Integridade operacional protegida</strong><p>Os eventos são registrados pelo backend com data, usuário, ação e referência do registro afetado.</p></div><span>{audit.length} eventos</span></section><section className="panel"><div className="panel-header"><div><h3 className="panel-title">Eventos recentes</h3><p className="panel-subtitle">Últimas 200 alterações da unidade</p></div><div className="search-wrap"><Icon name="search" /><input className="search-input" placeholder="Buscar ator ou ação" value={query} onChange={e => setQuery(e.target.value)} /></div></div><div className="audit-timeline">{list.map(item => <article key={item.id}><span className="audit-dot" /><time>{new Date(item.createdAt).toLocaleString('pt-BR')}</time><div><strong>{item.action.replaceAll('_', ' ')}</strong><p>{item.entityType} #{item.entityId || '—'} · {item.details || 'Sem detalhes adicionais'}</p></div><b>{item.actor}</b></article>)}</div></section></div>;
}

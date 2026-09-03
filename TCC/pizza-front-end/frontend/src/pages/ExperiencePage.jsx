import { useEffect, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import { PageHeader } from '../components/UI';
import { useApp } from '../context/AppContext';

export default function ExperiencePage() {
  const { session, orders, notify } = useApp();
  const [summary, setSummary] = useState({ average: 0, total: 0, items: [] });
  useEffect(() => { if (!session?.demo) api.get('/experience/feedback').then(response => setSummary(response.data)).catch(() => notify('Não foi possível carregar avaliações agora')); }, [notify, session]);
  const copyLink = order => { const link = `${window.location.origin}/avaliar/${encodeURIComponent(order.code)}`; navigator.clipboard?.writeText(link); notify('Link de avaliação copiado'); };
  const completed = orders.filter(order => ['COMPLETED','DELIVERED'].includes(order.status)).slice(0, 8);
  return <div className="page-stack"><PageHeader eyebrow="Voz do cliente" title="Experiência & qualidade" description="Avaliações verificadas por pedido e ações para elevar a recorrência."><span className="secure-kicker"><Icon name="sparkles" /> Nota média {Number(summary.average || 0).toFixed(1)}</span></PageHeader>
    <div className="report-kpis"><article><span>Avaliações</span><strong>{summary.total || 0}</strong><small>Pedidos verificados</small></article><article><span>Nota média</span><strong>{Number(summary.average || 0).toFixed(1)} ★</strong><small>Meta: 4,7 ou mais</small></article><article><span>Promotores</span><strong>{summary.items.filter(item => item.rating >= 4).length}</strong><small>Notas 4 e 5</small></article><article><span>Atenção</span><strong>{summary.items.filter(item => item.rating <= 2).length}</strong><small>Recuperação prioritária</small></article></div>
    <div className="report-grid"><section className="panel"><div className="panel-header"><div><h3 className="panel-title">Avaliações recentes</h3><p className="panel-subtitle">Comentários enviados após a conclusão</p></div></div><div className="panel-body commerce-list">{summary.items.length ? summary.items.map(item => <div className="commerce-row" key={item.id}><div><strong>{'★'.repeat(item.rating)} · {item.customerName || 'Cliente'}</strong><small>{item.orderCode} · {item.comment || 'Sem comentário'}</small></div><span className={`status-badge ${item.rating >= 4 ? 'status-success' : item.rating <= 2 ? 'status-warning' : 'status-neutral'}`}>{item.rating}/5</span></div>) : <div className="automation-empty"><Icon name="sparkles" /><strong>Aguardando as primeiras avaliações</strong><span>Copie um link ao lado e envie ao cliente.</span></div>}</div></section><section className="panel"><div className="panel-header"><div><h3 className="panel-title">Solicitar avaliação</h3><p className="panel-subtitle">Links individuais vinculados ao pedido</p></div></div><div className="panel-body commerce-list">{completed.map(order => <div className="commerce-row" key={order.id}><div><strong>{order.code} · {order.customerName || 'Cliente'}</strong><small>Pedido concluído e elegível</small></div><button type="button" className="button button-sm" onClick={() => copyLink(order)}>Copiar link</button></div>)}</div></section></div>
  </div>;
}

import { useState } from 'react';
import Icon from '../components/Icon';
import { Modal, PageHeader, Status } from '../components/UI';
import { labels, money, useApp } from '../context/AppContext';

export default function CashPage() {
  const { cash = {}, openCash, cashMovement, closeCash } = useApp();
  const [modal, setModal] = useState(cash.status === 'OPEN' ? null : 'open');
  const [form, setForm] = useState({ openingAmount: 300, amount: '', countedAmount: cash.expectedCash || 0, description: '', type: 'SUPPLY', notes: '' });
  const session = cash.session || {}; const totals = cash.totals || {}; const movements = cash.movements || [];
  const action = async event => {
    event.preventDefault(); let result;
    if (modal === 'open') result = await openCash({ openingAmount: Number(form.openingAmount), notes: form.notes });
    if (modal === 'movement') result = await cashMovement({ type: form.type, amount: Number(form.amount), description: form.description, paymentMethod: 'Dinheiro' });
    if (modal === 'close') result = await closeCash({ countedAmount: Number(form.countedAmount), notes: form.notes });
    if (result) setModal(null);
  };
  return <div className="page-stack">
    <PageHeader eyebrow="Governança financeira" title="Caixa & conciliação" description="Abertura, sangrias, suprimentos e fechamento com conferência auditável.">
      {cash.status === 'OPEN' ? <><button className="button" onClick={() => { setForm({ ...form, type: 'WITHDRAWAL', description: '' }); setModal('movement'); }}><Icon name="cash" />Sangria / suprimento</button><button className="button button-primary" onClick={() => { setForm({ ...form, countedAmount: Number(cash.expectedCash || 0) }); setModal('close'); }}>Fechar caixa</button></> : <button className="button button-primary" onClick={() => setModal('open')}><Icon name="cash" />Abrir caixa</button>}
    </PageHeader>
    {cash.status === 'OPEN' ? <>
      <section className="cash-hero"><div><span className="live-indicator"><i /> TURNO ABERTO</span><small>Caixa #{session.id} · aberto por {session.openedBy || 'operador'}</small><strong>{money(cash.expectedCash)}</strong><p>Saldo esperado em dinheiro</p></div><div className="cash-session-time"><Icon name="clock" /><span>Aberto desde</span><b>{session.openedAt ? new Date(session.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</b></div></section>
      <div className="report-kpis"><article><span>Fundo inicial</span><strong>{money(session.openingAmount)}</strong><small>Base do turno</small></article><article><span>Vendas conciliadas</span><strong>{money(totals.sales)}</strong><small>Todos os meios</small></article><article><span>Suprimentos</span><strong className="positive">+ {money(totals.supplies)}</strong><small>Entrada em espécie</small></article><article><span>Sangrias / estornos</span><strong className="negative">− {money(totals.outflows)}</strong><small>Saídas do caixa</small></article></div>
      <section className="panel"><div className="panel-header"><div><h3 className="panel-title">Livro do caixa</h3><p className="panel-subtitle">Cada movimento registra operador, data e referência</p></div><span className="secure-kicker"><Icon name="shield" /> Auditável</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Horário</th><th>Movimento</th><th>Descrição</th><th>Operador</th><th>Valor</th></tr></thead><tbody>{movements.map(item => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td><Status value={item.type} /></td><td><b className="cell-title">{item.description}</b><span className="cell-subtitle">{item.paymentMethod || 'Operacional'}</span></td><td>{item.performedBy || 'Sistema'}</td><td><b className={['WITHDRAWAL', 'REFUND'].includes(item.type) ? 'negative' : 'positive'}>{['WITHDRAWAL', 'REFUND'].includes(item.type) ? '−' : '+'} {money(item.amount)}</b></td></tr>)}</tbody></table></div></section>
    </> : <section className="empty-premium"><span><Icon name="cash" /></span><h2>O caixa está fechado</h2><p>Abra um novo turno para registrar vendas e movimentações financeiras.</p><button className="button button-primary" onClick={() => setModal('open')}>Iniciar turno</button></section>}
    {modal && <Modal title={modal === 'open' ? 'Abrir caixa' : modal === 'close' ? 'Conferir e fechar' : 'Movimentar caixa'} subtitle={modal === 'close' ? `O sistema espera ${money(cash.expectedCash)} em espécie` : 'O registro ficará disponível na auditoria'} onClose={() => setModal(null)}><form className="form-grid" onSubmit={action}>
      {modal === 'open' && <label className="form-field full-span"><span className="form-label">Fundo de troco</span><input required type="number" min="0" step=".01" value={form.openingAmount} onChange={e => setForm({ ...form, openingAmount: e.target.value })} /></label>}
      {modal === 'movement' && <><label className="form-field"><span className="form-label">Tipo</span><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="SUPPLY">Suprimento</option><option value="WITHDRAWAL">Sangria</option><option value="REFUND">Estorno</option><option value="ADJUSTMENT">Ajuste</option></select></label><label className="form-field"><span className="form-label">Valor</span><input required type="number" min=".01" step=".01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label><label className="form-field full-span"><span className="form-label">Motivo</span><input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex.: retirada para cofre" /></label></>}
      {modal === 'close' && <><label className="form-field full-span"><span className="form-label">Valor contado em dinheiro</span><input required type="number" min="0" step=".01" value={form.countedAmount} onChange={e => setForm({ ...form, countedAmount: e.target.value })} /></label><div className={`cash-difference full-span ${Number(form.countedAmount) - Number(cash.expectedCash) === 0 ? 'matched' : ''}`}><span>Diferença apurada</span><strong>{money(Number(form.countedAmount) - Number(cash.expectedCash))}</strong></div></>}
      <label className="form-field full-span"><span className="form-label">Observações</span><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
      <div className="form-actions"><button type="button" className="button" onClick={() => setModal(null)}>Cancelar</button><button className="button button-primary">{modal === 'close' ? 'Confirmar fechamento' : 'Confirmar'}</button></div>
    </form></Modal>}
  </div>;
}

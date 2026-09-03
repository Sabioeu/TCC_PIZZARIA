import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import { PageHeader, Status } from '../components/UI';
import { useApp } from '../context/AppContext';

export default function WorkforcePage() {
  const { user, session, notify } = useApp();
  const canManage = ['ADMIN', 'MANAGER'].includes(user?.role);
  const [shifts, setShifts] = useState([]); const [current, setCurrent] = useState(null); const [notes, setNotes] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (session?.demo) return;
    try {
      const mine = await api.get('/workforce/my'); setCurrent(mine.data || null);
      if (canManage) setShifts((await api.get('/workforce/shifts')).data || []);
    } catch { /* API antiga ou offline: controles permanecem em demonstração */ }
  }, [canManage, session]);
  useEffect(() => { load(); }, [load]);
  const act = async type => {
    setBusy(true);
    try {
      if (session?.demo) {
        if (type === 'in') { const shift = { id: Date.now(), employeeName: user.name, userId: user.id, status: 'OPEN', startedAt: new Date().toISOString(), notes }; setCurrent(shift); setShifts(items => [shift, ...items]); }
        else { const closed = { ...current, status: 'CLOSED', endedAt: new Date().toISOString(), notes: notes || current.notes }; setCurrent(null); setShifts(items => items.map(item => item.id === closed.id ? closed : item)); }
      } else if (type === 'in') setCurrent((await api.post('/workforce/clock-in', { notes })).data);
      else { await api.post(`/workforce/shifts/${current.id}/clock-out`, { notes }); setCurrent(null); }
      setNotes(''); notify(type === 'in' ? 'Jornada iniciada e registrada' : 'Jornada encerrada com segurança'); await load();
    } catch (error) { notify(error?.response?.data?.detail || 'Não foi possível atualizar a jornada'); }
    finally { setBusy(false); }
  };
  const totalMinutes = useMemo(() => shifts.filter(item => item.status === 'CLOSED' && item.endedAt).reduce((sum, item) => sum + Math.max(0, (new Date(item.endedAt) - new Date(item.startedAt)) / 60000), 0), [shifts]);
  return <div className="page-stack"><PageHeader eyebrow="Pessoas & operação" title="Jornada da equipe" description="Ponto individual, turnos e histórico auditável por unidade."><span className="secure-kicker"><Icon name="clock" /> {current ? 'Turno em andamento' : 'Fora do turno'}</span></PageHeader>
    <div className="commerce-grid"><section className="panel"><div className="panel-header"><div><h3 className="panel-title">Meu turno</h3><p className="panel-subtitle">Registro associado ao seu usuário e unidade atual</p></div></div><div className="panel-body form-grid"><div className="security-score full-span"><span><Icon name="clock" /></span><div><small>Status atual</small><strong>{current ? 'Jornada iniciada' : 'Pronto para iniciar'}</strong><p>{current ? `Desde ${new Date(current.startedAt).toLocaleString('pt-BR')}` : 'O horário será registrado pelo servidor.'}</p></div><b>{current ? 'ON' : 'OFF'}</b></div><label className="form-field full-span"><span className="form-label">Observação do turno</span><textarea rows="3" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Opcional: posto, troca de equipe ou ocorrência" /></label><div className="form-actions"><button type="button" disabled={busy} className={`button ${current ? '' : 'button-primary'}`} onClick={() => act(current ? 'out' : 'in')}>{current ? 'Encerrar jornada' : 'Iniciar jornada'}</button></div></div></section><aside className="commerce-aside"><Icon name="shield" /><strong>Registro confiável</strong><p>Entradas e saídas ficam vinculadas ao colaborador autenticado e entram na trilha de auditoria.</p><span>{canManage ? `${Math.round(totalMinutes / 60)}h registradas no histórico carregado` : 'Seu gestor acompanha apenas os registros necessários.'}</span></aside></div>
    {canManage && <section className="panel"><div className="panel-header"><div><h3 className="panel-title">Histórico da unidade</h3><p className="panel-subtitle">Últimos registros de jornada da equipe</p></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Colaborador</th><th>Entrada</th><th>Saída</th><th>Duração</th><th>Status</th></tr></thead><tbody>{shifts.map(item => <tr key={item.id}><td><b>{item.employeeName}</b></td><td>{new Date(item.startedAt).toLocaleString('pt-BR')}</td><td>{item.endedAt ? new Date(item.endedAt).toLocaleString('pt-BR') : '—'}</td><td>{item.endedAt ? `${Math.round((new Date(item.endedAt) - new Date(item.startedAt)) / 60000)} min` : 'Em andamento'}</td><td><Status value={item.status} /></td></tr>)}</tbody></table></div></section>}
  </div>;
}

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api';
import Icon from '../components/Icon';

export default function FeedbackPage() {
  const { orderCode = '' } = useParams();
  const [rating, setRating] = useState(5); const [comment, setComment] = useState(''); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.post('/public/feedback', { orderCode, rating, comment }); setSent(true); }
    catch (exception) { if (!exception?.response) setSent(true); else setError(exception.response.data?.detail || 'Não foi possível registrar sua avaliação.'); }
    finally { setBusy(false); }
  };
  return <main className="feedback-page"><section className="feedback-card"><span className="brand-mark"><Icon name="pizza" /></span>{sent ? <div className="feedback-success"><Icon name="check" /><h1>Obrigado pela avaliação!</h1><p>Sua opinião chegou à equipe Aurora e ajuda a melhorar cada experiência.</p></div> : <><span className="page-eyebrow">Experiência Aurora</span><h1>Como foi seu pedido?</h1><p>Pedido <b>{orderCode || 'não informado'}</b> · leva menos de um minuto.</p><form onSubmit={submit}><div className="rating-picker" aria-label="Nota de 1 a 5">{[1,2,3,4,5].map(value => <button type="button" aria-label={`${value} estrela${value > 1 ? 's' : ''}`} className={value <= rating ? 'active' : ''} onClick={() => setRating(value)} key={value}>★</button>)}</div><label className="form-field"><span className="form-label">Conte como foi <small>opcional</small></span><textarea rows="4" maxLength="1500" value={comment} onChange={event => setComment(event.target.value)} placeholder="Atendimento, sabor, tempo de entrega…" /></label>{error && <div className="login-error"><Icon name="alert" />{error}</div>}<button disabled={busy || !orderCode} className="button button-primary button-lg">{busy ? 'Enviando…' : 'Enviar avaliação'}<Icon name="arrow" /></button></form></>}</section></main>;
}

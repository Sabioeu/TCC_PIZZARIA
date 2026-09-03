import Icon from '../components/Icon';
import { PageHeader, Status } from '../components/UI';
import { money, useApp } from '../context/AppContext';

export default function DeliveryPage() {
  const { orders, setOrderStatus } = useApp();
  const ready = orders.filter(order => order.type === 'DELIVERY' && order.status === 'READY');
  const onRoute = orders.filter(order => order.type === 'DELIVERY' && order.status === 'OUT_FOR_DELIVERY');
  return <div className="page-stack"><PageHeader eyebrow="Logística de última milha" title="Minhas entregas" description="Uma tela objetiva para retirar, navegar e confirmar cada entrega."><span className="secure-kicker"><Icon name="truck" /> {onRoute.length} em rota</span></PageHeader>
    <div className="summary-grid"><div className="summary-card warning"><small>Aguardando retirada</small><strong>{ready.length}</strong></div><div className="summary-card success"><small>Em rota</small><strong>{onRoute.length}</strong></div><div className="summary-card"><small>Prioridade</small><strong>{[...ready, ...onRoute].length ? 'Agora' : 'Livre'}</strong></div></div>
    <div className="delivery-board"><section><header><div><span className="delivery-dot ready" /> <b>Prontas para retirar</b></div><strong>{ready.length}</strong></header><div>{ready.length ? ready.map(order => <DeliveryCard key={order.id} order={order} action="Retirar pedido" onAction={() => setOrderStatus(order.id, 'OUT_FOR_DELIVERY')} />) : <Empty text="Nenhum pedido aguardando retirada." />}</div></section><section><header><div><span className="delivery-dot out_for_delivery" /> <b>Em rota</b></div><strong>{onRoute.length}</strong></header><div>{onRoute.length ? onRoute.map(order => <DeliveryCard key={order.id} order={order} action="Confirmar entrega" onAction={() => setOrderStatus(order.id, 'DELIVERED')} />) : <Empty text="Sem entregas em rota no momento." />}</div></section></div>
  </div>;
}

function DeliveryCard({ order, action, onAction }) {
  return <article><div className="delivery-code"><span>{order.code}</span><Status value={order.status} /></div><h3>{order.customerName}</h3><p><Icon name="truck" />{order.deliveryAddress || 'Endereço não informado'}</p><small>{order.customerPhone || 'Telefone não informado'} · {money(order.total)}</small><button type="button" className="button button-primary" onClick={onAction}>{action}<Icon name="arrow" /></button></article>;
}
function Empty({ text }) { return <div className="automation-empty"><Icon name="check" /><strong>Fila em dia</strong><span>{text}</span></div>; }

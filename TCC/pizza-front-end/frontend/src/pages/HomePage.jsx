import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import Icon from '../components/Icon';
import { formatCurrency, formatDate } from '../utils/formatters';

const emptyDashboard = {
  faturamentoHoje: 0,
  faturamentoMes: 0,
  comandasAbertas: 0,
  ticketMedioMes: 0,
  mesasDisponiveis: 0,
  mesasOcupadas: 0,
  produtosCadastrados: 0,
  clientesCadastrados: 0,
  itensEstoqueBaixo: 0,
  contasPendentes: 0,
  contasVencidas: 0,
  faturamentoSemanal: [],
  meiosPagamento: [],
  atividadesRecentes: [],
};

const paymentColors = ['#e86419', '#3578e5', '#169b62', '#c97b13', '#8b5cf6'];

const HomePage = () => {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregarDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/dashboard/resumo');
      setDashboard({ ...emptyDashboard, ...response.data });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError('Não foi possível atualizar os indicadores. Confirme se o servidor está em execução.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  const maxWeeklyValue = useMemo(() => Math.max(
    1,
    ...(dashboard.faturamentoSemanal || []).map((item) => Number(item.valor) || 0),
  ), [dashboard.faturamentoSemanal]);

  const paymentTotal = useMemo(() => (dashboard.meiosPagamento || [])
    .reduce((sum, item) => sum + (Number(item.valor) || 0), 0), [dashboard.meiosPagamento]);

  const donutBackground = useMemo(() => {
    if (!paymentTotal) return 'conic-gradient(#edf0f3 0 100%)';
    let accumulated = 0;
    const segments = dashboard.meiosPagamento.map((item, index) => {
      const start = accumulated;
      accumulated += ((Number(item.valor) || 0) / paymentTotal) * 100;
      return `${paymentColors[index % paymentColors.length]} ${start}% ${accumulated}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [dashboard.meiosPagamento, paymentTotal]);

  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const occupiedTotal = dashboard.mesasDisponiveis + dashboard.mesasOcupadas;

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="page-eyebrow">Central de operações</span>
          <h1>{greeting}, equipe!</h1>
          <p>Uma visão objetiva do salão, das vendas e dos compromissos financeiros da Modelos Pizza.</p>
        </div>
        <Link className="button button-primary button-lg" to="/pedidos">
          <Icon name="plus" size={17} />
          Iniciar novo pedido
        </Link>
      </section>

      {error && (
        <div className="alert alert-error">
          <Icon name="alert" size={17} />
          <span>{error}</span>
          <button className="button button-sm" onClick={carregarDashboard} type="button">Tentar novamente</button>
        </div>
      )}

      <section className="metrics-grid" aria-label="Indicadores principais">
        <MetricCard
          color="green"
          foot="Receita registrada hoje"
          icon="wallet"
          label="Faturamento de hoje"
          loading={loading}
          value={formatCurrency(dashboard.faturamentoHoje)}
        />
        <MetricCard
          color="brand"
          foot="Aguardando faturamento"
          icon="receipt"
          label="Comandas abertas"
          loading={loading}
          value={dashboard.comandasAbertas}
        />
        <MetricCard
          color="blue"
          foot="Média das vendas no mês"
          icon="trend"
          label="Ticket médio"
          loading={loading}
          value={formatCurrency(dashboard.ticketMedioMes)}
        />
        <MetricCard
          color="amber"
          foot={`${dashboard.mesasDisponiveis} mesas disponíveis`}
          icon="tables"
          label="Ocupação do salão"
          loading={loading}
          value={occupiedTotal ? `${dashboard.mesasOcupadas}/${occupiedTotal}` : '0'}
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Desempenho dos últimos 7 dias</h2>
              <p className="panel-subtitle">Receita confirmada por dia</p>
            </div>
            <span className="status-badge status-success">{formatCurrency(dashboard.faturamentoMes)} no mês</span>
          </div>
          <div className="panel-body">
            {loading ? <LoadingBlock /> : (
              <div className="bar-chart" aria-label="Gráfico de faturamento semanal">
                {(dashboard.faturamentoSemanal || []).map((item) => {
                  const percentage = Math.max(2, ((Number(item.valor) || 0) / maxWeeklyValue) * 100);
                  return (
                    <div className="bar-column" key={item.data}>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          data-value={formatCurrency(item.valor)}
                          style={{ height: `${percentage}%` }}
                        />
                      </div>
                      <span className="bar-label">{String(item.rotulo || '').replace('.', '')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Meios de pagamento</h2>
              <p className="panel-subtitle">Distribuição da receita mensal</p>
            </div>
          </div>
          <div className="panel-body">
            {loading ? <LoadingBlock /> : (
              <>
                <div className="donut-content">
                  <div className="donut" style={{ background: donutBackground }}>
                    <div className="donut-center">
                      <strong>{dashboard.meiosPagamento.reduce((sum, item) => sum + item.quantidade, 0)}</strong>
                      <span>recebimentos</span>
                    </div>
                  </div>
                </div>
                <div className="chart-legend">
                  {dashboard.meiosPagamento.length === 0 ? (
                    <span className="legend-item">Sem vendas registradas neste mês</span>
                  ) : dashboard.meiosPagamento.map((item, index) => (
                    <span className="legend-item" key={item.tipo}>
                      <i className="legend-dot" style={{ background: paymentColors[index % paymentColors.length] }} />
                      {paymentLabel(item.tipo)} · {paymentTotal ? Math.round((Number(item.valor) / paymentTotal) * 100) : 0}%
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Pulso da operação</h2>
              <p className="panel-subtitle">Pontos que merecem atenção agora</p>
            </div>
            <Link className="button button-ghost button-sm" to="/estoque">Ver estoque <Icon name="arrow" size={14} /></Link>
          </div>
          <div className="panel-body operation-list">
            <OperationItem
              color="var(--green-soft)"
              description="Mesas prontas para receber clientes"
              icon="tables"
              iconColor="var(--green)"
              label="Mesas disponíveis"
              value={dashboard.mesasDisponiveis}
            />
            <OperationItem
              color="var(--red-soft)"
              description="Produtos e insumos com até 5 unidades"
              icon="alert"
              iconColor="var(--red)"
              label="Itens com estoque baixo"
              value={dashboard.itensEstoqueBaixo}
            />
            <OperationItem
              color="var(--amber-soft)"
              description={`Vencido: ${formatCurrency(dashboard.contasVencidas)}`}
              icon="wallet"
              iconColor="var(--amber)"
              label="Contas pendentes"
              value={formatCurrency(dashboard.contasPendentes)}
            />
            <OperationItem
              color="var(--blue-soft)"
              description={`${dashboard.clientesCadastrados} clientes na base`}
              icon="products"
              iconColor="var(--blue)"
              label="Produtos no cardápio"
              value={dashboard.produtosCadastrados}
            />
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Atividades recentes</h2>
              <p className="panel-subtitle">Últimos recebimentos confirmados</p>
            </div>
            <button aria-label="Atualizar painel" className="icon-button" onClick={carregarDashboard} type="button">
              <Icon name="refresh" size={17} />
            </button>
          </div>
          <div className="panel-body activity-list">
            {dashboard.atividadesRecentes.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 170 }}>
                <div><strong>Nenhuma atividade recente</strong><p>Os novos faturamentos aparecerão aqui.</p></div>
              </div>
            ) : dashboard.atividadesRecentes.map((atividade) => (
              <div className="activity-item" key={atividade.id}>
                <div className="activity-icon" style={{ color: 'var(--green)', background: 'var(--green-soft)' }}>
                  <Icon name="check" size={17} />
                </div>
                <div className="activity-copy">
                  <strong>{atividade.descricao}</strong>
                  <span>{paymentLabel(atividade.tipo)} · {formatDate(atividade.dataHora, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <strong className="operation-value">{formatCurrency(atividade.valor)}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

const MetricCard = ({ color, foot, icon, label, loading, value }) => (
  <article className="metric-card">
    <div className="metric-top">
      <span className="metric-label">{label}</span>
      <span className={`metric-icon ${color}`}><Icon name={icon} size={18} /></span>
    </div>
    <div className="metric-value">{loading ? '—' : value}</div>
    <div className="metric-foot"><Icon name="activity" size={13} />{foot}</div>
  </article>
);

const OperationItem = ({ color, description, icon, iconColor, label, value }) => (
  <div className="operation-item">
    <div className="operation-icon" style={{ color: iconColor, background: color }}><Icon name={icon} size={17} /></div>
    <div className="operation-copy"><strong>{label}</strong><span>{description}</span></div>
    <strong className="operation-value">{value}</strong>
  </div>
);

const LoadingBlock = () => <div className="loading-state"><div><div className="spinner" /><span>Atualizando indicadores...</span></div></div>;

const paymentLabel = (type) => ({
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
}[type] || type || 'Outros');

export default HomePage;

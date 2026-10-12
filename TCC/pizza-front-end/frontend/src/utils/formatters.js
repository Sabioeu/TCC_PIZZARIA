export const formatCurrency = (value = 0) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(value) || 0);

export const formatDate = (value, options = {}) => {
  if (!value) return '—';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', options).format(date);
};

export const toNumber = (value) => Number(value) || 0;

export const localDate = (value = new Date()) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');

export const comandaNumber = (comanda) => comanda?.numeroDiario != null
  ? String(comanda.numeroDiario).padStart(3, '0') : String(comanda?.numero ?? '—');

export const comandaReference = (comanda) => {
  if (comanda?.referenciaExibicao) return comanda.referenciaExibicao;
  const dia = (comanda?.dataNumeracao || comanda?.dataHoraAbertura || '').slice(0, 10);
  const data = /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia.split('-').reverse().join('/') : '';
  return `${data ? `${data} · ` : ''}#${comandaNumber(comanda)}`;
};

import Icon from './Icon';
import { labels } from '../context/AppContext';

export function PageHeader({ eyebrow, title, description, children }) {
  return <div className="page-header"><div><span className="page-eyebrow">{eyebrow}</span><h1 className="page-title">{title}</h1><p className="page-description">{description}</p></div>{children && <div className="page-actions">{children}</div>}</div>;
}
export function Status({ value }) {
  const style = ['COMPLETED', 'PAID', 'AVAILABLE', 'READY'].includes(value) ? 'success' : ['CANCELED', 'OVERDUE', 'OCCUPIED'].includes(value) ? 'danger' : ['PENDING', 'RECEIVED', 'RESERVED', 'CLEANING'].includes(value) ? 'warning' : 'info';
  return <span className={`status-badge status-${style}`}>{labels[value] || value}</span>;
}
export function Empty({ title = 'Nada por aqui', text = 'Os novos registros aparecerão automaticamente.' }) {
  return <div className="empty-state"><div><span className="empty-state-icon"><Icon name="search" /></span><strong>{title}</strong><p>{text}</p></div></div>;
}
export function Modal({ title, subtitle, onClose, children, wide = false }) {
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className={`modal-card ${wide ? 'modal-wide' : ''}`}><div className="modal-header"><div><h2 className="modal-title">{title}</h2><p className="modal-subtitle">{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><Icon name="close" /></button></div>{children}</section></div>;
}

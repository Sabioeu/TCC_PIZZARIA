import React, { useId } from 'react';
import './Cadastros.css';

export default function FormField({ children, className = '', label, hint, error, required = false }) {
  const unique = useId();
  const id = children.props.id || `field-${unique}`;
  const describedBy = [children.props['aria-describedby'], hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return <div className={`form-field cadastro-field ${error ? 'has-error' : ''} ${className}`}>
    <div className="cadastro-label-row"><label className="form-label" htmlFor={id}>{label}</label><span className={`field-requirement ${required ? 'is-required' : ''}`} aria-hidden="true">{required ? 'Obrigatório' : 'Opcional'}</span></div>
    {React.cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : children.props['aria-invalid'] })}
    {hint && <small className="form-hint" id={`${id}-hint`}>{hint}</small>}
    {error && <small className="field-error" role="alert" id={`${id}-error`}>{error}</small>}
  </div>;
}

import React, { useId } from 'react';
import Icon from './Icon';
import './Cadastros.css';

export default function FormSection({ title, description, icon, children }) {
  const headingId = useId();
  return <section className="cadastro-form-section" aria-labelledby={headingId}>
    <div className="cadastro-section-heading">
      {icon && <span className="cadastro-section-icon"><Icon name={icon} size={18} /></span>}
      <div><h3 id={headingId}>{title}</h3>{description && <p>{description}</p>}</div>
    </div>
    <div className="form-grid cadastro-section-fields">{children}</div>
  </section>;
}

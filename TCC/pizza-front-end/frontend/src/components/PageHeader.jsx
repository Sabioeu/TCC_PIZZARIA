import React from 'react';

const PageHeader = ({ eyebrow = 'Gestão', title, description, actions }) => (
  <header className="page-header">
    <div>
      <span className="page-eyebrow">{eyebrow}</span>
      <h1 className="page-title">{title}</h1>
      {description && <p className="page-description">{description}</p>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>
);

export default PageHeader;

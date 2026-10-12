import React, { forwardRef, useRef, useState } from 'react';
import './Cadastros.css';

/** Campo de senha reutilizável: revelar não altera o conteúdo nem a política de senha. */
const PasswordInput = forwardRef(function PasswordInput({ disabled, className = '', ...props }, forwardedRef) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const assignRef = (node) => {
    inputRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };
  return <div className={`password-control ${className}`}>
    <input {...props} ref={assignRef} disabled={disabled} type={visible ? 'text' : 'password'} />
    <button className="password-toggle" type="button" disabled={disabled} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible}
      onClick={() => { if (!inputRef.current?.matches(':disabled')) setVisible((current) => !current); }}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
        {visible && <path d="m3 3 18 18" />}
      </svg>
    </button>
  </div>;
});

export default PasswordInput;

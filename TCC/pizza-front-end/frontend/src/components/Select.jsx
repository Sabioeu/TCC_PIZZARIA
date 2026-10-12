import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import './Select.css';

const texto = (node) => typeof node === 'string' || typeof node === 'number' ? String(node) : React.isValidElement(node) ? texto(node.props.children) : Array.isArray(node) ? node.map(texto).join('') : '';
const coletar = (children) => React.Children.toArray(children).flatMap((child) => {
  if (!React.isValidElement(child)) return [];
  if (child.type === 'option') return [{ value: String(child.props.value ?? texto(child.props.children)), label: texto(child.props.children), disabled: Boolean(child.props.disabled), description: child.props['data-description'], icon: child.props['data-icon'] }];
  return coletar(child.props.children);
});
const normalizar = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Mantém seleção, eventos, validação required e FormData dos formulários existentes. */
export default function Select({ children, value, defaultValue, onChange, disabled, required, name, id, className = '', style, searchable, ...props }) {
  const unique = useId(); const campoId = id || `select-${unique}`;
  const listId = `${campoId}-list`; const hintId = `${campoId}-hint`;
  const options = coletar(children);
  const [internal, setInternal] = useState(String(defaultValue ?? options[0]?.value ?? ''));
  const requestedValue = String(value ?? internal);
  const selected = options.find((o) => o.value === requestedValue);
  const selectedValue = selected?.value ?? '';
  const [open, setOpen] = useState(false); const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1); const [position, setPosition] = useState(null);
  const [label, setLabel] = useState(''); const [invalid, setInvalid] = useState(false);
  const root = useRef(null); const trigger = useRef(null); const native = useRef(null); const panel = useRef(null); const search = useRef(null);
  const canSearch = searchable ?? options.length > 6;
  const visible = options.filter((o) => normalizar(`${o.label} ${o.description || ''}`).includes(normalizar(query)));
  const updatePosition = () => {
    const box = trigger.current?.getBoundingClientRect(); if (!box) return;
    const down = window.innerHeight - box.bottom - 12; const up = box.top - 12;
    const height = Math.min(360, Math.max(down, up));
    setPosition({ left: Math.max(8, Math.min(box.left, window.innerWidth - box.width - 8)), width: Math.min(box.width, window.innerWidth - 16), maxHeight: Math.max(100, height), ...(down >= Math.min(260, up) ? { top: box.bottom + 7 } : { bottom: window.innerHeight - box.top + 7 }) });
  };
  useLayoutEffect(() => {
    setLabel(props['aria-label'] || native.current?.labels?.[0]?.textContent || root.current?.closest('.form-field')?.querySelector('.form-label')?.textContent || 'Selecionar opção');
  }, [props, children]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    const form = native.current?.form;
    const reset = () => { setInternal(String(defaultValue ?? options[0]?.value ?? '')); setInvalid(false); setOpen(false); };
    form?.addEventListener('reset', reset); return () => form?.removeEventListener('reset', reset);
  }, [defaultValue, options]);
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const outside = (e) => { if (!root.current?.contains(e.target) && !panel.current?.contains(e.target)) setOpen(false); };
    const reposition = (e) => { if (!panel.current?.contains(e.target)) updatePosition(); };
    document.addEventListener('pointerdown', outside); window.addEventListener('resize', updatePosition); window.addEventListener('scroll', reposition, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', reposition, true); };
  }, [open]);
  useEffect(() => { if (open && canSearch) search.current?.focus(); }, [open, canSearch]);
  useEffect(() => { if (open && active >= 0) panel.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' }); }, [active, open]);
  useEffect(() => { if (open && active >= visible.length) setActive(visible.length ? 0 : -1); }, [active, open, visible.length]);
  const abrir = () => { if (disabled || native.current?.matches(':disabled')) return; setQuery(''); setActive(options.findIndex((o) => o.value === selectedValue)); updatePosition(); setOpen(true); };
  const choose = (option) => {
    if (!option || option.disabled || disabled || native.current?.matches(':disabled')) return;
    setInternal(option.value); setInvalid(false); setOpen(false); setQuery('');
    if (native.current) native.current.value = option.value;
    onChange?.({ target: { name, value: option.value }, currentTarget: native.current });
    trigger.current?.focus();
  };
  const keyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); if (open) e.stopPropagation(); setOpen(false); trigger.current?.focus(); return; }
    if (e.key === 'Tab') { setOpen(false); if (e.target !== trigger.current) trigger.current?.focus(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); if (!open) { abrir(); return; }
      let index = e.key === 'Home' ? 0 : e.key === 'End' ? visible.length - 1 : active + (e.key === 'ArrowUp' ? -1 : 1);
      index = Math.min(visible.length - 1, Math.max(0, index));
      const direction = e.key === 'ArrowUp' || e.key === 'End' ? -1 : 1;
      while (visible[index]?.disabled) index += direction;
      if (visible[index]) setActive(index);
    } else if (e.key === 'Enter' || (e.key === ' ' && e.target === trigger.current)) {
      e.preventDefault(); if (!open) abrir(); else choose(visible[active]);
    } else if (e.target === trigger.current && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const match = options.find((o) => !o.disabled && normalizar(o.label).startsWith(normalizar(e.key))); if (match) choose(match);
    }
  };
  return <div className={`select-control ${className}`} style={style} ref={root}>
    <select {...props} id={campoId} name={name} ref={native} tabIndex={-1} aria-hidden="true" className="select-native" disabled={disabled} required={required} value={selectedValue}
      onFocus={() => trigger.current?.focus()} onInvalid={(e) => { e.preventDefault(); setInvalid(true); abrir(); trigger.current?.focus(); }}
      onChange={(e) => { setInternal(e.target.value); setInvalid(false); onChange?.(e); }}>
      {children}
      {!options.some((option) => option.value === '') && <option value="" disabled>Selecione uma opção</option>}
    </select>
    <button ref={trigger} type="button" className={`select-trigger ${invalid ? 'is-invalid' : ''} ${open ? 'is-open' : ''}`} disabled={disabled}
      role="combobox" aria-label={label} aria-expanded={open} aria-controls={open ? listId : undefined} aria-haspopup="listbox" aria-required={required || undefined} aria-invalid={invalid || props['aria-invalid'] || undefined} aria-describedby={invalid ? [hintId, props['aria-describedby']].filter(Boolean).join(' ') : props['aria-describedby']} aria-activedescendant={open && visible[active] ? `${listId}-${active}` : undefined}
      onClick={() => open ? setOpen(false) : abrir()} onKeyDown={keyDown}>
      {selected?.icon && <span className="select-leading"><Icon name={selected.icon} size={17} /></span>}
      <span className={`select-value ${!selectedValue ? 'is-placeholder' : ''}`}>{selected?.label || 'Selecione uma opção'}</span>
      <span className="select-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg></span>
    </button>
    {invalid && <small className="select-error" role="alert" id={hintId}>Selecione uma opção para continuar.</small>}
    {open && position && createPortal(<div className="select-popover" style={position} ref={panel} onKeyDown={keyDown}>
      <div className="select-menu-heading">{label}<span>{visible.length} opções</span></div>
      {canSearch && <div className="select-search"><Icon name="search" size={16} /><input ref={search} type="search" autoComplete="off" aria-label={`Buscar em ${label}`} role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined} value={query} onChange={(e) => { setQuery(e.target.value); setActive(-1); }} placeholder="Digite para buscar..." /></div>}
      <div role="listbox" id={listId} aria-label={label} className="select-options">
        {visible.map((option, index) => <div key={`${option.value}-${index}`} id={`${listId}-${index}`} role="option" aria-selected={option.value === selectedValue} aria-disabled={option.disabled || undefined}
          data-index={index} data-value={option.value} className={`select-option ${index === active ? 'is-active' : ''} ${option.value === selectedValue ? 'is-selected' : ''} ${option.disabled ? 'is-disabled' : ''}`}
          onPointerMove={() => !option.disabled && setActive(index)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(option)}>
          {option.icon && <span className="select-option-icon"><Icon name={option.icon} size={18} /></span>}
          <span className="select-option-copy"><span>{option.label}</span>{option.description && <small>{option.description}</small>}</span>
          {option.value === selectedValue && <Icon name="check" size={16} />}
        </div>)}
        {visible.length === 0 && <div className="select-empty"><Icon name="search" size={22} /><strong>Nenhuma opção encontrada</strong><span>Tente outro nome ou termo.</span></div>}
      </div>
    </div>, root.current?.closest('[role="dialog"]') || document.body)}
  </div>;
}

import React, { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Icon from './Icon';

export default function Modal({ children, onClose, subtitle, title, busy = false, error }) {
  const origin = useRef(document.activeElement);
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="modal-backdrop">
      <Dialog.Content className="modal-card" {...(!subtitle ? { 'aria-describedby': undefined } : {})}
        onCloseAutoFocus={(event) => { event.preventDefault(); (origin.current?.isConnected && origin.current !== document.body ? origin.current : document.getElementById('main-content'))?.focus(); }}
        onEscapeKeyDown={(event) => { if (busy || event.target.closest?.('[role="dialog"]')?.querySelector('.select-popover')) event.preventDefault(); }}
        onInteractOutside={(event) => { if (busy || event.target.closest?.('.select-popover')) event.preventDefault(); }}>
        <div className="modal-header"><div>
          <Dialog.Title className="modal-title">{title}</Dialog.Title>
          {subtitle && <Dialog.Description className="modal-subtitle">{subtitle}</Dialog.Description>}
        </div><Dialog.Close asChild><button aria-label="Fechar" className="icon-button" disabled={busy} type="button"><Icon name="close" size={17} /></button></Dialog.Close></div>
        {error && <div className="alert alert-error" role="alert"><Icon name="alert" size={17} /><span>{error}</span></div>}
        {children}
      </Dialog.Content>
    </Dialog.Overlay></Dialog.Portal>
  </Dialog.Root>;
}

import React, { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Icon from './Icon';
import './CadastroDrawer.css';

export default function CadastroDrawer({ title, subtitle, children, busy = false, onClose }) {
  const origin = useRef(document.activeElement);
  const content = useRef(null);

  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="cadastro-overlay" />
      <Dialog.Content ref={content} className="cadastro-drawer" aria-busy={busy}
        {...(!subtitle ? { 'aria-describedby': undefined } : {})}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const field = content.current?.querySelector('input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), button[role="combobox"]:not(:disabled)');
          (field || content.current)?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          (origin.current?.isConnected && origin.current !== document.body ? origin.current : document.getElementById('main-content'))?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (busy || content.current?.querySelector('.select-popover')) event.preventDefault();
        }}
        onInteractOutside={(event) => event.preventDefault()}>
        <header className="cadastro-drawer-header">
          <div>
            <span className="page-eyebrow">Cadastro</span>
            <Dialog.Title className="cadastro-drawer-title">{title}</Dialog.Title>
            {subtitle && <Dialog.Description className="cadastro-drawer-subtitle">{subtitle}</Dialog.Description>}
          </div>
          <Dialog.Close asChild><button aria-label="Fechar cadastro" className="icon-button" disabled={busy} type="button"><Icon name="close" size={18} /></button></Dialog.Close>
        </header>
        <div className="cadastro-drawer-body">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

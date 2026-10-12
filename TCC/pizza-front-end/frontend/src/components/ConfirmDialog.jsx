import React, { useRef } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import Icon from './Icon';

export default function ConfirmDialog({ title, description, onCancel, onConfirm, busy = false, error, confirmLabel = 'Confirmar', cancelLabel = 'Voltar' }) {
  const origin = useRef(document.activeElement);
  return <AlertDialog.Root open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
    <AlertDialog.Portal><AlertDialog.Overlay className="modal-backdrop">
      <AlertDialog.Content className="modal-card" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); (origin.current?.isConnected && origin.current !== document.body ? origin.current : document.getElementById('main-content'))?.focus(); }}>
        <div className="confirmation-icon"><Icon name="alert" size={24} /></div>
        <AlertDialog.Title className="modal-title">{title}</AlertDialog.Title>
        <AlertDialog.Description className="confirmation-description">{description}</AlertDialog.Description>
        {error && <div className="alert alert-error" role="alert"><Icon name="alert" size={17} /><span>{error}</span></div>}
        <div className="modal-actions">
          <AlertDialog.Cancel asChild><button className="button" disabled={busy} type="button">{cancelLabel}</button></AlertDialog.Cancel>
          <button className="button button-danger" disabled={busy} onClick={onConfirm} type="button">{busy ? 'Processando...' : confirmLabel}</button>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Overlay></AlertDialog.Portal>
  </AlertDialog.Root>;
}

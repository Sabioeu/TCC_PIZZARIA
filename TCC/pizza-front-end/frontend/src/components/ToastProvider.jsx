import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import * as Toast from '@radix-ui/react-toast';
import Icon from './Icon';
import './ToastProvider.css';

const ToastContext = createContext({ notify: () => {} });
const titles = { success: 'Tudo certo', error: 'Não foi possível concluir', info: 'Informação' };

export function ToastProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const sequence = useRef(0);
  const notify = useCallback((message, options = {}) => {
    if (!message) return;
    const type = titles[options.type] ? options.type : 'success';
    const item = { id: ++sequence.current, message, type };
    setMessages((current) => [...current.slice(-2), item]);
  }, []);
  const context = useMemo(() => ({ notify }), [notify]);
  return <ToastContext.Provider value={context}><Toast.Provider duration={6000} label="Aviso" swipeDirection="right">
    {children}
    {messages.map((item) => <Toast.Root className={`app-toast app-toast-${item.type}`} key={item.id} onOpenChange={(open) => { if (!open) setMessages((current) => current.filter((message) => message.id !== item.id)); }}>
      <span className="toast-icon"><Icon name={item.type === 'success' ? 'check' : item.type === 'error' ? 'alert' : 'activity'} size={20} /></span>
      <div className="toast-copy"><Toast.Title className="toast-title">{titles[item.type]}</Toast.Title><Toast.Description className="toast-description">{item.message}</Toast.Description></div>
      <Toast.Close asChild><button aria-label="Dispensar aviso" className="icon-button" type="button"><Icon name="close" size={16} /></button></Toast.Close>
    </Toast.Root>)}
    <Toast.Viewport className="toast-viewport" label="Avisos do sistema (F8)" />
  </Toast.Provider></ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);

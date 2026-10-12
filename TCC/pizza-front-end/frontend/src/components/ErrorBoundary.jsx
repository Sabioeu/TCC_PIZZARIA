import React from 'react';
import Icon from './Icon';

export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="app-error-screen"><section className="panel empty-state" role="alert"><div><div className="empty-state-icon"><Icon name="alert" /></div><h1>Não foi possível exibir esta tela</h1><p>Ocorreu um erro de interface. Recarregue a página para tentar novamente.<br />Dados que ainda não foram enviados terão que ser preenchidos novamente.</p><button className="button button-primary" type="button" onClick={() => window.location.reload()}>Recarregar página</button></div></section></div>;
  }
}

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';

const profiles = [
  ['Administrador', 'admin@aurora.pizza'], ['Gerente', 'gerente@aurora.pizza'],
  ['Cozinha', 'cozinha@aurora.pizza'], ['Caixa', 'caixa@aurora.pizza'],
];

export default function LoginPage() {
  const { authenticated, login, authLoading } = useApp();
  const [email, setEmail] = useState('admin@aurora.pizza');
  const [password, setPassword] = useState('Aurora@2026');
  const [error, setError] = useState('');
  if (authenticated) return <Navigate to="/" replace />;
  const submit = async event => {
    event.preventDefault(); setError('');
    try { await login(email, password); } catch (exception) { setError(exception.message); }
  };
  return <main className="login-page">
    <section className="login-story">
      <div className="login-brand"><span className="brand-mark"><Icon name="pizza" /></span><div><strong>Aurora Pizza</strong><span>Operating System</span></div></div>
      <div className="login-promise"><span className="page-eyebrow">Hospitalidade movida por dados</span><h1>Uma operação inteira.<br /><em>Em perfeita sintonia.</em></h1><p>Do primeiro pedido ao último fechamento, o Aurora conecta salão, cozinha, delivery e gestão em tempo real.</p></div>
      <div className="login-proof"><div><strong>99,9%</strong><span>disponibilidade</span></div><div><strong>−27%</strong><span>tempo de preparo</span></div><div><strong>+18%</strong><span>margem operacional</span></div></div>
      <div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" />
    </section>
    <section className="login-access"><form className="login-card" onSubmit={submit}>
      <div className="login-mobile-brand"><span className="brand-mark"><Icon name="pizza" /></span><strong>Aurora Pizza</strong></div>
      <span className="secure-kicker"><Icon name="shield" /> Acesso seguro</span><h2>Bem-vindo de volta</h2><p>Entre para comandar sua operação.</p>
      <label className="form-field"><span className="form-label">E-mail profissional</span><div className="input-with-icon"><Icon name="users" /><input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></div></label>
      <label className="form-field"><span className="form-label">Senha</span><div className="input-with-icon"><Icon name="lock" /><input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></div></label>
      {error && <div className="login-error"><Icon name="alert" />{error}</div>}
      <button className="button button-primary button-lg login-submit" disabled={authLoading}>{authLoading ? <><span className="spinner" />Autenticando</> : <>Entrar no Aurora<Icon name="arrow" /></>}</button>
      <div className="demo-access"><span>Perfis para demonstração</span><div>{profiles.map(([label, value]) => <button type="button" key={value} onClick={() => { setEmail(value); setPassword('Aurora@2026'); }}>{label}</button>)}</div><small>Senha de todos: <b>Aurora@2026</b></small></div>
    </form></section>
  </main>;
}

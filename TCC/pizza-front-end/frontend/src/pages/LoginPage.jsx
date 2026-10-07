import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import './LoginPage.css';
export default function LoginPage() {
  const { usuario, loading, erro: conexao, entrar, carregar } = useAuth();
  const [email, setEmail] = useState(''); const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(''); const [salvando, setSalvando] = useState(false);
  const [configurar, setConfigurar] = useState(false);
  const [cadastro, setCadastro] = useState(false);
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [sucesso, setSucesso] = useState('');
  useEffect(() => { let ativo = true; api.get('/auth/config').then(({ data }) => { if (ativo) setConfigurar(data.precisaAdministrador); }).catch(() => {}); return () => { ativo = false; }; }, []);
  if (usuario) return <Navigate to={usuario.perfil === 'ATENDENTE' ? '/pedidos' : '/'} replace />;
  const enviar = async (event) => {
    event.preventDefault(); setErro(''); setSucesso('');
    if (cadastro && senha !== confirmarSenha) { setErro('As senhas não coincidem.'); return; }
    setSalvando(true);
    try {
      if (cadastro) {
        await api.post('/auth/registro', { email: email.trim(), senha, confirmarSenha });
        setCadastro(false); setSenha(''); setConfirmarSenha('');
        setSucesso('Conta criada! Entre com seu e-mail e senha.');
      } else { await entrar(email.trim(), senha); setSenha(''); }
    }
    catch (error) { setErro(error.response?.data?.message || 'Não foi possível entrar. Verifique o servidor.'); }
    finally { setSalvando(false); }
  };
  return <div className="login-shell"><section className="panel login-card">
    <div className="login-brand"><span className="brand-mark"><Icon name="pizza" /></span><span>Modelos Pizza<small>Gestão inteligente</small></span></div>
    <span className="eyebrow">Bem-vindo</span><h1>{cadastro ? 'Crie sua conta' : 'Acesse sua operação'}</h1><p className="page-description">{cadastro ? 'Cadastre seu acesso de atendente. Outras permissões são definidas pelo administrador.' : 'Entre com o e-mail e a senha cadastrados. Seu perfil define as áreas disponíveis.'}</p>
    {configurar && <div className="alert">O administrador inicial ainda não foi criado. No terminal do backend, execute <code>.\start.ps1 -CriarAdministrador</code> e escolha as credenciais localmente.</div>}
    {(erro || conexao) && <div role="alert" className="alert alert-error">{erro || conexao}</div>}
    {sucesso && <div role="status" className="alert">{sucesso}</div>}
    <form className="form-grid" onSubmit={enviar}>
      <div className="form-field full-span"><label className="form-label" htmlFor="login-email">E-mail</label><input id="login-email" type="email" autoComplete="username" maxLength={100} required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="form-field full-span"><label className="form-label" htmlFor="login-senha">Senha</label><input id="login-senha" type="password" autoComplete={cadastro ? 'new-password' : 'current-password'} minLength={cadastro ? 8 : undefined} maxLength={72} required value={senha} onChange={(e) => setSenha(e.target.value)} />{cadastro && <small>Use pelo menos 8 caracteres.</small>}</div>
      {cadastro && <div className="form-field full-span"><label className="form-label" htmlFor="confirmar-senha">Repetir senha</label><input id="confirmar-senha" type="password" autoComplete="new-password" maxLength={72} required value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} /></div>}
      <button type="submit" className="button button-primary button-lg full-span" disabled={salvando || loading}>{salvando ? 'Aguarde...' : cadastro ? 'Criar conta' : 'Entrar no sistema'}<Icon name="arrow" size={16} /></button>
    </form>
    <button type="button" className="button full-span" disabled={salvando} onClick={() => { setCadastro(!cadastro); setErro(''); setSucesso(''); setSenha(''); setConfirmarSenha(''); }}>{cadastro ? 'Já tenho conta — entrar' : 'Criar meu login'}</button>
    {conexao && <button className="button" type="button" onClick={carregar}>Tentar conexão novamente</button>}
    <p className="login-footnote">Sessão protegida · Sua senha não fica salva neste navegador.</p>
  </section></div>;
}

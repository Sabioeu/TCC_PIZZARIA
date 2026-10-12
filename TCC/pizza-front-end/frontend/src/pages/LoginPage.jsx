import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import PasswordInput from '../components/PasswordInput';
import { apiErrorMessage } from '../utils/apiError';
import { validatePassword } from '../utils/cadastroFields';
import './LoginPage.css';

const validarCampos = (email, senha, confirmarSenha, cadastro) => {
  const erros = {};
  if (!email.trim()) erros.email = 'Informe seu e-mail.';
  else if (!/^[^\s@]+@[^\s@]+$/.test(email.trim()) || email.trim().length > 100) erros.email = 'Informe um e-mail válido.';
  if (!senha) erros.senha = 'Informe sua senha.';
  else if (cadastro && !senha.trim()) erros.senha = 'A senha não pode conter apenas espaços.';
  else if (cadastro) {
    const erroSenha = validatePassword(senha);
    if (erroSenha) erros.senha = erroSenha;
  }
  if (cadastro && !confirmarSenha) erros.confirmarSenha = 'Repita sua senha para confirmar.';
  else if (cadastro && senha !== confirmarSenha) erros.confirmarSenha = 'As senhas não coincidem.';
  return erros;
};

function Marca({ className = '' }) {
  return <div className={`login-brand ${className}`}><span className="brand-mark"><Icon name="pizza" /></span><span>Modelos Pizza<small>Gestão inteligente</small></span></div>;
}

export default function LoginPage() {
  const { usuario, loading, erro: conexao, entrar, carregar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [cadastro, setCadastro] = useState(false);
  const [configurar, setConfigurar] = useState(false);
  const [erro, setErro] = useState('');
  const [errosCampos, setErrosCampos] = useState({});
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const emailRef = useRef(null);
  const senhaRef = useRef(null);
  const confirmarRef = useRef(null);
  const ocupado = salvando || loading;

  useEffect(() => {
    let ativo = true;
    api.get('/auth/config').then(({ data }) => { if (ativo) setConfigurar(Boolean(data.precisaAdministrador)); }).catch(() => {});
    return () => { ativo = false; };
  }, []);

  useEffect(() => { document.title = `${cadastro ? 'Criar acesso' : 'Entrar'} · Modelos Pizza`; }, [cadastro]);

  const limparErroCampo = (campo) => {
    setErro('');
    setErrosCampos((atual) => {
      const proximo = { ...atual };
      delete proximo[campo];
      if (campo === 'senha') delete proximo.confirmarSenha;
      return proximo;
    });
  };

  const trocarModo = (novoCadastro) => {
    if (salvandoRef.current || loading || novoCadastro === cadastro) return;
    setCadastro(novoCadastro);
    setErro(''); setSucesso(''); setErrosCampos({});
    setSenha(''); setConfirmarSenha('');
    emailRef.current?.focus();
  };

  const enviar = async (event) => {
    event.preventDefault();
    if (salvandoRef.current || loading) return;
    setErro(''); setSucesso('');
    const validacao = validarCampos(email, senha, confirmarSenha, cadastro);
    setErrosCampos(validacao);
    const primeiroErro = Object.keys(validacao)[0];
    if (primeiroErro) {
      ({ email: emailRef, senha: senhaRef, confirmarSenha: confirmarRef })[primeiroErro].current?.focus();
      return;
    }
    salvandoRef.current = true;
    setSalvando(true);
    try {
      if (cadastro) {
        await api.post('/auth/registro', { email: email.trim(), senha, confirmarSenha });
        setCadastro(false); setSenha(''); setConfirmarSenha('');
        setSucesso('Conta criada! Aguarde a aprovação do administrador para entrar. Seu acesso será de atendente.');
      } else {
        await entrar(email.trim(), senha);
        setSenha('');
      }
    } catch (error) {
      setErro(!cadastro && error.response?.status === 401
        ? 'Não foi possível entrar. Confira o e-mail e a senha; contas novas precisam da aprovação do administrador.'
        : apiErrorMessage(error, cadastro ? 'Não foi possível criar sua conta. Tente novamente.' : 'Não foi possível entrar. Tente novamente.'));
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  };

  if (usuario) return <Navigate to={usuario.perfil === 'ATENDENTE' ? '/pedidos' : '/'} replace />;

  return <main className="login-shell">
    <div className="login-layout">
      <aside className="login-intro" aria-label="Sobre o Modelos Pizza">
        <Marca />
        <div className="login-intro-copy">
          <span className="login-intro-label">Do pedido ao controle</span>
          <h2>Sua operação,<br />em um só lugar.</h2>
          <p>Pedidos, estoque e financeiro conectados para facilitar o dia a dia da sua pizzaria.</p>
          <ul className="login-features">
            <li><span className="login-feature-icon"><Icon name="orders" /></span><span><strong>Atendimento conectado</strong><small>Presencial, delivery e retirada.</small></span></li>
            <li><span className="login-feature-icon"><Icon name="inventory" /></span><span><strong>Mais controle da operação</strong><small>Estoque e registros reunidos.</small></span></li>
            <li><span className="login-feature-icon"><Icon name="reports" /></span><span><strong>Informação para decidir</strong><small>Indicadores e relatórios para consulta.</small></span></li>
          </ul>
        </div>
        <div className="login-intro-footer"><span className="login-intro-dot" />Gestão simples. Trabalho organizado.</div>
      </aside>

      <section className="login-card" aria-labelledby="login-titulo">
        <Marca className="login-mobile-brand" />
        <div className="login-access-label"><Icon name="users" size={15} />Acesso da equipe</div>
        <div className="login-mode-switch" aria-label="Escolha como acessar">
          <button type="button" aria-pressed={!cadastro} disabled={ocupado} onClick={() => trocarModo(false)}>Entrar</button>
          <button type="button" aria-pressed={cadastro} disabled={ocupado} onClick={() => trocarModo(true)}>Criar meu login</button>
        </div>
        <h1 id="login-titulo">{cadastro ? 'Crie seu acesso' : 'Bem-vindo de volta'}</h1>
        <p className="login-description">{cadastro ? 'Informe seu e-mail e escolha uma senha para solicitar acesso à equipe.' : 'Entre com suas credenciais para continuar a operação.'}</p>

        {cadastro && <div className="login-approval"><Icon name="clock" size={18} /><p><strong>Seu acesso precisa de aprovação</strong>O cadastro cria uma conta de atendente. O administrador libera o primeiro acesso.</p></div>}
        {configurar && <div className="login-notice"><strong>Configuração inicial pendente</strong><p>O administrador inicial ainda não foi criado. No terminal do backend, execute:</p><code>.\start.ps1 -CriarAdministrador</code><p>Escolha as credenciais localmente.</p></div>}
        {(erro || conexao) && <div role="alert" className="login-feedback login-feedback-error"><Icon name="alert" size={18} /><span>{erro || conexao}</span></div>}
        {sucesso && <div role="status" className="login-feedback login-feedback-success"><Icon name="check" size={18} /><span>{sucesso}</span></div>}

        <form className="login-form" onSubmit={enviar} noValidate aria-label={cadastro ? 'Criar conta de atendente' : 'Entrar no sistema'} aria-busy={salvando}>
          <div className="form-field">
            <label className="form-label" htmlFor="login-email">E-mail</label>
            <input ref={emailRef} id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="voce@exemplo.com" maxLength={100} required disabled={ocupado} value={email} aria-invalid={Boolean(errosCampos.email)} aria-describedby={errosCampos.email ? 'login-email-erro' : undefined} onChange={(event) => { setEmail(event.target.value); limparErroCampo('email'); }} />
            {errosCampos.email && <p id="login-email-erro" className="login-field-error">{errosCampos.email}</p>}
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="login-senha">Senha</label>
            <PasswordInput ref={senhaRef} key={cadastro ? 'nova-senha' : 'senha-login'} id="login-senha" name="senha" autoComplete={cadastro ? 'new-password' : 'current-password'} placeholder={cadastro ? 'Crie uma senha' : 'Digite sua senha'} minLength={cadastro ? 8 : undefined} maxLength={72} required disabled={ocupado} value={senha} aria-invalid={Boolean(errosCampos.senha)} aria-describedby={[cadastro && 'login-senha-dica', errosCampos.senha && 'login-senha-erro'].filter(Boolean).join(' ') || undefined} onChange={(event) => { setSenha(event.target.value); limparErroCampo('senha'); }} />
            {cadastro && <p id="login-senha-dica" className="login-field-hint">Use pelo menos 8 caracteres. Misture letras, números e símbolos para criar uma senha mais forte.</p>}
            {errosCampos.senha && <p id="login-senha-erro" className="login-field-error">{errosCampos.senha}</p>}
          </div>
          {cadastro && <div className="form-field">
            <label className="form-label" htmlFor="confirmar-senha">Repetir senha</label>
            <PasswordInput ref={confirmarRef} id="confirmar-senha" name="confirmarSenha" autoComplete="new-password" placeholder="Digite a mesma senha" maxLength={72} required disabled={ocupado} value={confirmarSenha} aria-invalid={Boolean(errosCampos.confirmarSenha)} aria-describedby={errosCampos.confirmarSenha ? 'login-confirmacao-erro' : undefined} onChange={(event) => { setConfirmarSenha(event.target.value); limparErroCampo('confirmarSenha'); }} />
            {errosCampos.confirmarSenha && <p id="login-confirmacao-erro" className="login-field-error">{errosCampos.confirmarSenha}</p>}
          </div>}
          {Object.keys(errosCampos).length > 0 && <p role="alert" className="login-validation-summary">Confira os campos destacados antes de continuar.</p>}
          <button type="submit" className="button button-primary button-lg login-submit" disabled={ocupado}>{salvando ? (cadastro ? 'Criando sua conta...' : 'Entrando...') : cadastro ? 'Criar conta' : 'Entrar no sistema'}<Icon name={salvando ? 'refresh' : 'arrow'} size={18} className={salvando ? 'login-saving-icon' : ''} /></button>
        </form>
        {loading && <p role="status" className="login-loading">Verificando sua sessão...</p>}
        {conexao && <button className="button login-retry" type="button" disabled={ocupado} onClick={carregar}><Icon name="refresh" size={16} />Tentar conexão novamente</button>}
        <p className="login-footnote"><Icon name="lock" size={14} />{cadastro ? 'Já tem acesso? Selecione Entrar acima.' : 'Seu perfil define as áreas disponíveis no sistema.'}</p>
      </section>
    </div>
  </main>;
}

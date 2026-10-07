import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { limparCsrf } from '../api/api';

const AuthContext = createContext(null);
const gerenciais = ['/','/estoque','/relatorios','/transacoes-financeiras','/contas-a-pagar','/cadastro-produtos','/cadastro-insumo','/cadastro-fornecedores','/mesas'];
export const podeAcessar = (usuario, caminho) => Boolean(usuario) && (caminho === '/cadastro-usuario' ? usuario.perfil === 'ADMINISTRADOR' : gerenciais.includes(caminho) ? ['ADMINISTRADOR','GERENTE'].includes(usuario.perfil) : true);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const carregar = useCallback(async () => {
    setLoading(true); setErro('');
    try { const { data } = await api.get('/auth/me'); setUsuario(data); }
    catch (error) { setUsuario(null); if (error.response?.status !== 401) setErro('Não foi possível conectar ao servidor. Verifique o backend e tente novamente.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    carregar();
    const expirada = () => { setUsuario(null); limparCsrf(); };
    window.addEventListener('pizza:session-expired', expirada);
    return () => window.removeEventListener('pizza:session-expired', expirada);
  }, [carregar]);
  const entrar = async (email, senha) => {
    limparCsrf();
    await api.post('/auth/login', new URLSearchParams({ email, password: senha }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    limparCsrf();
    const { data } = await api.get('/auth/me'); setUsuario(data); setErro('');
  };
  const sair = async () => { await api.post('/auth/logout'); limparCsrf(); setUsuario(null); };
  return <AuthContext.Provider value={{ usuario, loading, erro, entrar, sair, carregar }}>{children}</AuthContext.Provider>;
}

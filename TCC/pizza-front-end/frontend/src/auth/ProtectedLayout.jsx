import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { podeAcessar, useAuth } from './AuthContext';
import MainLayout from '../layouts/MainLayout';
export default function ProtectedLayout() {
  const { usuario, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading-state"><div><div className="spinner" />Verificando acesso...</div></div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!podeAcessar(usuario, location.pathname)) return <div className="login-shell"><section className="panel login-card"><h1>Acesso restrito</h1><p>Seu perfil não possui acesso a esta área.</p><Link className="button button-primary" to="/pedidos">Ir para atendimento</Link></section></div>;
  return <MainLayout />;
}

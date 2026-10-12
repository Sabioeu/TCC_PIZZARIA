export function apiErrorMessage(error, fallback = 'Não foi possível concluir. Tente novamente.') {
  if (!error.response) return 'Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.';
  if (error.response.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (error.response.status === 403) return 'A ação não foi autorizada. Atualize a página; se persistir, confira suas permissões.';
  if (error.response.status >= 500) return 'O servidor não conseguiu concluir a operação. Tente novamente mais tarde.';
  const message = error.response.data?.message;
  return typeof message === 'string' && message.length < 500 ? message : fallback;
}

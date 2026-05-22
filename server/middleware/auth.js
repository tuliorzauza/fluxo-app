const { supabase } = require('../services/supabase');

async function autenticarUsuario(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      erro: 'Token de autenticação necessário',
      codigo: 'NO_TOKEN',
    });
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('[AUTH] Token recebido (primeiros 20 chars):', token?.slice(0, 20));

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('[AUTH] getUser resultado:', error ? `ERRO: ${error.message}` : `OK — userId: ${user?.id}`);

    if (error) {
      console.error('Erro de autenticação Supabase:', error.message);
      return res.status(401).json({
        erro: 'Token inválido ou expirado. Faça login novamente.',
        codigo: 'INVALID_TOKEN',
      });
    }

    if (!user) {
      return res.status(401).json({
        erro: 'Usuário não encontrado.',
        codigo: 'USER_NOT_FOUND',
      });
    }

    req.userId = user.id;
    req.user   = user;
    next();
  } catch (err) {
    console.error('Erro no middleware de auth:', err);
    return res.status(401).json({
      erro: 'Erro na autenticação. Tente novamente.',
      codigo: 'AUTH_ERROR',
    });
  }
}

module.exports = { autenticarUsuario };

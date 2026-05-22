const { supabase } = require('../services/supabase');

async function autenticarUsuario(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação necessário' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
    req.userId = user.id;
    req.user   = user;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Erro na autenticação' });
  }
}

module.exports = { autenticarUsuario };

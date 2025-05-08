import jwt from 'jsonwebtoken';
 //new
export function authToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  //if (!token) return res.status(401).json({ message: 'Token não fornecido!' });
  if (!token) return res.redirect('unauthorized.html');

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: 'Token inválido!' });
    req.user = user;
    next();
  });
}

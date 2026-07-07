// La guía estática (index.html) vive en otro origen (se abre con Live Server,
// file://, o cualquier hosting simple) — distinto del dominio de Vercel donde
// vive esta API. Sin CORS, el navegador bloquea esas llamadas.
//
// Como es una app privada de dos personas (no hay datos sensibles de terceros
// en juego, y las escrituras ya están protegidas por UPLOAD_PASSWORD), se
// permite cualquier origen. Si en algún momento querés restringirlo a un
// dominio puntual, cambiá el '*' de acá abajo.

export function applyCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true; // ya se respondió, el handler debe cortar acá
  }
  return false;
}

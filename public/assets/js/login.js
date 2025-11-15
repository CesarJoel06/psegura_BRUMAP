
document.addEventListener('DOMContentLoaded', () => {
  const msg = document.getElementById('msg');
  if (!msg) return;
  const q = new URLSearchParams(location.search);
  if (q.get('locked') === '1') {
    const w = parseInt(q.get('waitSec') || '0', 10);
    msg.textContent = w > 0
      ? `Cuenta bloqueada temporalmente. Intenta en ~${Math.ceil(w/60)} min.`
      : 'Cuenta bloqueada temporalmente. Intenta luego.';
  } else if (q.get('error') === '1') {
    const at = parseInt(q.get('attempts') || '0', 10);
    const rem = (3 - (at % 3)) % 3;
    msg.textContent = `Usuario o contraseña incorrectos. Intentos fallidos: ${at}` +
                      (rem ? ` | Próximo bloqueo en ${rem} intento(s).` : '');
  } else {
    msg.textContent = '';
  }
});

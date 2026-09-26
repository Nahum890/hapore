// Enlace de WhatsApp a partir del teléfono que cargó la persona. Los números
// paraguayos que empiezan con 0 (0981…) pasan a +595; si ya trae +código de
// país se respeta.
export function whatsappLink(phone) {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (String(phone).trim().startsWith('+')) return `https://wa.me/${digits}`;
  if (digits.startsWith('0')) digits = '595' + digits.slice(1);
  return `https://wa.me/${digits}`;
}

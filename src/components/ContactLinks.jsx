import { whatsappLink } from '../utils/contact.js';

// Teléfono, WhatsApp y correo de alguien de la misma clase, como enlaces que
// abren la app correspondiente del dispositivo.

export default function ContactLinks({ person }) {
  if (!person?.phone && !person?.email) return <small className="chat-contact-missing">Sin datos de contacto todavía.</small>;
  const wa = whatsappLink(person.phone);
  return <span className="chat-contact">
    {person.phone && <a href={`tel:${person.phone.replace(/[^\d+]/g, '')}`}>📞 {person.phone}</a>}
    {wa && <a href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
    {person.email && <a href={`mailto:${person.email}`}>✉ {person.email}</a>}
  </span>;
}

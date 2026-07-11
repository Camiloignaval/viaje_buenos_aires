// WhatsApp solo transporta el enlace: sin API oficial ni acceso a contactos.
// El texto incluye el inviteUrl que devolvió el backend.
export function whatsappShareText(inviteUrl: string): string {
  return `Quiero compartir contigo nuestra historia en Alaia.\n\nAntes de aceptar, inicia sesión con el correo al que envié esta invitación:\n\n${inviteUrl}`;
}

export function whatsappShareUrl(inviteUrl: string): string {
  return `https://wa.me/?text=${encodeURIComponent(whatsappShareText(inviteUrl))}`;
}

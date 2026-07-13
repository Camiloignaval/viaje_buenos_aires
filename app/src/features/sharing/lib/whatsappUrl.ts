// WhatsApp solo transporta el enlace: sin API oficial ni acceso a contactos.
// El texto incluye el inviteUrl absoluto que devolvió el backend.
export function whatsappShareText(inviteUrl: string): string {
  return `Te invito a compartir nuestra historia en Alaia.\n\nEsta invitación corresponde al correo al que fue enviada. Primero inicia sesión con ese correo y luego acepta la invitación aquí:\n\n${inviteUrl}`;
}

export function whatsappShareUrl(inviteUrl: string): string {
  return `https://wa.me/?text=${encodeURIComponent(whatsappShareText(inviteUrl))}`;
}

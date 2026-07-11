// Mensajes cálidos del modal de capítulo bloqueado. Copy portado VERBATIM de
// experienceView.js — parte de la identidad editorial de Aurora.

export interface LockedChapterNotice {
  line: string;
  detail: string;
  actionLabel: string;
  unlockLabel?: string;
}

const LOCKED_CHAPTER_MESSAGES = [
  { line: "Algunas historias no se apuran.", detail: "Este capítulo estará disponible el {fecha}." },
  { line: "Aurora todavía guarda algunas sorpresas.", detail: "Este capítulo se abrirá el {fecha}." },
  { line: "Todavía no es tiempo de pasar esta página.", detail: "Vuelve el {fecha}." },
  { line: "La espera también forma parte del viaje.", detail: "Este capítulo estará disponible el {fecha}." },
  { line: "Cada día merece vivirse en su momento.", detail: "Este capítulo se abrirá el {fecha}." },
  { line: "Algunas páginas prefieren esperar.", detail: "La siguiente se abrirá el {fecha}." },
  { line: "No todas las historias quieren contarse de inmediato.", detail: "Este capítulo estará listo el {fecha}." },
  { line: "Hay recuerdos que todavía no existen.", detail: "Este capítulo comenzará el {fecha}." },
  { line: "Los buenos libros también saben esperar.", detail: "La siguiente página llegará el {fecha}." },
  { line: "No adelantes la historia.", detail: "Todavía queda mucho por vivir antes de llegar aquí." },
  { line: "Cada recuerdo llega cuando tiene que llegar.", detail: "Nos vemos el {fecha}." },
  { line: "Buenos Aires todavía guarda algunas sorpresas.", detail: "Este capítulo estará disponible el {fecha}." },
  { line: "La ciudad aún no ha llegado hasta aquí.", detail: "Vuelve el {fecha}." },
  { line: "No hace falta correr.", detail: "Este capítulo se abrirá el {fecha}." },
  { line: "Cada amanecer trae una página nueva.", detail: "La próxima aparecerá el {fecha}." },
];

const LOCKED_CHAPTER_ACTIONS = [
  "Seguir explorando",
  "Volver",
  "Continuar",
  "De acuerdo",
  "Nos vemos pronto",
];

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function withUnlockDate(text: string, unlockLabel: string): string {
  return text.replaceAll("{fecha}", unlockLabel);
}

export function chooseLockedChapterNotice(unlockLabel: string): LockedChapterNotice {
  const message = randomFrom(LOCKED_CHAPTER_MESSAGES);
  return {
    line: withUnlockDate(message.line, unlockLabel),
    detail: withUnlockDate(message.detail, unlockLabel),
    actionLabel: randomFrom(LOCKED_CHAPTER_ACTIONS),
    unlockLabel,
  };
}

// Contenido estático de la app (no cambia por usuario).
// El estado del usuario (completed, note, imageUrl...) vive aparte, en storage.js.

export const CHECKLIST_CATEGORIES = [
  { key: "documentos", label: "Documentos", icon: "🛂" },
  { key: "equipaje", label: "Equipaje", icon: "🧳" },
  { key: "apps", label: "Apps instaladas", icon: "📱" },
  { key: "dinero", label: "Dinero", icon: "💳" },
  { key: "lugares", label: "Lugares visitados", icon: "📍" },
  { key: "momentos", label: "Momentos especiales", icon: "❤️" },
];

export const CHECKLIST_ITEMS = [
  // Documentos
  { id: "doc-1", category: "documentos", title: "Cédula o pasaporte vigente" },
  { id: "doc-2", category: "documentos", title: "Tarjetas de crédito" },
  { id: "doc-3", category: "documentos", title: "Tarjeta de débito" },
  { id: "doc-4", category: "documentos", title: "Seguro de viaje (si aplica)" },
  { id: "doc-5", category: "documentos", title: "Reserva del hotel a mano" },

  // Equipaje
  { id: "eq-1", category: "equipaje", title: "Cargador del celular" },
  { id: "eq-2", category: "equipaje", title: "Power bank" },
  { id: "eq-3", category: "equipaje", title: "Audífonos" },
  { id: "eq-4", category: "equipaje", title: "Adaptador (si fuera necesario)" },
  { id: "eq-5", category: "equipaje", title: "Medicamentos personales" },
  { id: "eq-6", category: "equipaje", title: "Chaqueta" },
  { id: "eq-7", category: "equipaje", title: "Zapatillas cómodas" },
  { id: "eq-8", category: "equipaje", title: "Lentes de sol" },
  { id: "eq-9", category: "equipaje", title: "Paraguas pequeño" },
  { id: "eq-10", category: "equipaje", title: "Mochila para recorrer la ciudad" },

  // Apps
  { id: "app-1", category: "apps", title: "Google Maps" },
  { id: "app-2", category: "apps", title: "Uber" },
  { id: "app-3", category: "apps", title: "Cabify" },
  { id: "app-4", category: "apps", title: "WhatsApp" },
  { id: "app-5", category: "apps", title: "Airalo (eSIM)" },
  { id: "app-6", category: "apps", title: "Google Lens" },
  { id: "app-7", category: "apps", title: "Mercado Pago" },

  // Dinero
  { id: "din-1", category: "dinero", title: "Avisar al banco del viaje" },
  { id: "din-2", category: "dinero", title: "Activar tarjetas para uso internacional" },
  { id: "din-3", category: "dinero", title: "Cambiar algo de efectivo (80% tarjeta / 20% efectivo)" },
  { id: "din-4", category: "dinero", title: "Guardar el efectivo en dos lugares distintos" },

  // Lugares visitados
  { id: "lug-1", category: "lugares", title: "El Cuartito" },
  { id: "lug-2", category: "lugares", title: "Teatro Colón y Obelisco" },
  { id: "lug-3", category: "lugares", title: "Floralis Genérica" },
  { id: "lug-4", category: "lugares", title: "Cementerio de Recoleta" },
  { id: "lug-5", category: "lugares", title: "La Cabrera" },
  { id: "lug-6", category: "lugares", title: "Rosedal de Palermo" },
  { id: "lug-7", category: "lugares", title: "Puerto Madero" },
  { id: "lug-8", category: "lugares", title: "Mercado de San Telmo" },
  { id: "lug-9", category: "lugares", title: "Mafalda" },
  { id: "lug-10", category: "lugares", title: "Caminito" },
  { id: "lug-11", category: "lugares", title: "Galerías Pacífico" },
  { id: "lug-12", category: "lugares", title: "El Ateneo Grand Splendid" },
  { id: "lug-13", category: "lugares", title: "Las Violetas" },

  // Momentos especiales
  { id: "mom-1", category: "momentos", title: "Helado caminando por Corrientes" },
  { id: "mom-2", category: "momentos", title: "Una hora en una cafetería sin mirar el reloj" },
  { id: "mom-3", category: "momentos", title: "Caminar sin rumbo por Palermo" },
  { id: "mom-4", category: "momentos", title: "Medialunas en un parque" },
  { id: "mom-5", category: "momentos", title: "Atardecer en Puerto Madero" },
  { id: "mom-6", category: "momentos", title: "Abrazo frente a la Floralis" },
  { id: "mom-7", category: "momentos", title: "Sentarse a conversar sin sacar fotos" },
  { id: "mom-8", category: "momentos", title: "Un rato en El Ateneo sin el celular" },
];

// Las 10 fotos obligatorias del álbum — id compartido con "categoría: fotos"
// en el checklist simple, así ambas vistas leen y escriben el mismo estado.
export const ALBUM_PHOTOS = [
  {
    id: "foto-1",
    emoji: "🗼",
    title: "Obelisco de día",
    day: 1,
    description: "El símbolo de la ciudad, con el movimiento de la 9 de Julio de fondo.",
    horario: "09:00 a 10:30",
    consejo: "Desde la esquina de Av. Corrientes con Av. 9 de Julio, para capturar el Obelisco completo.",
  },
  {
    id: "foto-2",
    emoji: "🌃",
    title: "Obelisco de noche",
    day: 1,
    description: "La misma postal, completamente distinta con la avenida iluminada.",
    horario: "20:30 a 22:00",
    consejo: "Esperar el cambio de luces del Obelisco y aprovechar la iluminación de la avenida.",
  },
  {
    id: "foto-3",
    emoji: "❤️",
    title: "Mafalda",
    day: 3,
    description: "La escultura más querida de San Telmo — un clásico infaltable en una primera visita.",
    horario: "Mañana, con poca fila",
    consejo: "Sentados junto a Mafalda en el banco, ángulo lateral para incluir la calle de fondo.",
  },
  {
    id: "foto-4",
    emoji: "🌸",
    title: "Floralis Genérica",
    day: 2,
    description: "Sus pétalos de acero reflejados en el agua, una de las postales más lindas del viaje.",
    horario: "10:00",
    consejo: "Desde el espejo de agua — abrazados, si es posible.",
  },
  {
    id: "foto-5",
    emoji: "📚",
    title: "El Ateneo Grand Splendid",
    day: 4,
    description: "Un teatro convertido en librería — hay que subir para verlo completo.",
    horario: "11:30",
    consejo: "Desde el segundo piso, mirando hacia el escenario.",
  },
  {
    id: "foto-6",
    emoji: "🌉",
    title: "Puente de la Mujer",
    day: 2,
    description: "El barrio más elegante de la ciudad, de noche.",
    horario: "20:30",
    consejo: "Caminando tomados de la mano, sin mirar a la cámara.",
  },
  {
    id: "foto-7",
    emoji: "🎨",
    title: "Caminito",
    day: 3,
    description: "Casas de colores que parecen pintadas para una foto.",
    horario: "13:00",
    consejo: "Buscar una pared colorida con poca gente alrededor.",
  },
  {
    id: "foto-8",
    emoji: "🌹",
    title: "Rosedal de Palermo",
    day: 2,
    description: "Miles de rosas y un puente blanco — el rincón más romántico del Día 2.",
    horario: "17:30",
    consejo: "En el puente blanco o junto al lago.",
  },
  {
    id: "foto-9",
    emoji: "✨",
    title: "Puerto Madero de noche",
    day: 2,
    description: "Los diques iluminados, un cierre elegante para el Día 2.",
    horario: "21:00",
    consejo: "Incluir el reflejo de las luces sobre el agua.",
  },
  {
    id: "foto-10",
    emoji: "☕",
    title: "Selfie juntos en una cafetería",
    day: 0,
    description: "No importa cuál. Lo importante es recordar ese momento.",
    horario: "Cuando surja",
    consejo: "Sin mirar el teléfono, sin posar demasiado — solo disfrutar.",
  },
];

// Los 10 videos — mismos IDs que usa la guía (index.html) para mostrarlos
// en modo solo-lectura una vez subidos acá.
export const VIDEO_MOMENTS = [
  { id: "video-1", emoji: "🎥", title: "Caminando por Av. Corrientes de noche", day: 1 },
  { id: "video-2", emoji: "🎥", title: "Los pétalos de la Floralis moviéndose", day: 2 },
  { id: "video-3", emoji: "🎥", title: "El tango bailándose en Plaza Dorrego", day: 3 },
  { id: "video-4", emoji: "🎥", title: "Un brindis en Puerto Madero", day: 2 },
  { id: "video-5", emoji: "🎥", title: "El primer corte del bife en La Cabrera", day: 2 },
  { id: "video-6", emoji: "🎥", title: "Kari probando una medialuna", day: 4 },
  { id: "video-7", emoji: "🎥", title: "Entrando a El Ateneo Grand Splendid", day: 4 },
  { id: "video-8", emoji: "🎥", title: "Caminando por Caminito", day: 3 },
  { id: "video-9", emoji: "🎥", title: "El helado de Rapanui", day: 1 },
  { id: "video-10", emoji: "🎥", title: "Un mensaje juntos antes de subir al avión de regreso", day: 4 },
];

export const VIDEO_LIMITS = {
  maxSizeMB: 60,
};

export const IMAGE_LIMITS = {
  maxSizeMB: 5,
  acceptedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
};

import { Children, type ReactNode } from "react";
import "./chapterActivitySequence.css";

type ChapterActivitySequenceProps = Readonly<{
  chapterTitle: string;
  children: ReactNode;
}>;

/**
 * Convierte el recorrido del día en una secuencia de lectura.
 *
 * No decide contenido ni reordena actividades: conserva la autoridad del Story
 * Package y sólo le da a la lista existente una jerarquía editorial explícita.
 */
export function ChapterActivitySequence({
  chapterTitle,
  children,
}: ChapterActivitySequenceProps) {
  if (Children.count(children) === 0) return null;

  return (
    <section className="chapter-reading-flow" aria-label={`Recorrido de ${chapterTitle}`}>
      <ol
        className="activities chapter-activity-sequence"
        aria-label="Páginas de este día"
      >
        {children}
      </ol>
    </section>
  );
}

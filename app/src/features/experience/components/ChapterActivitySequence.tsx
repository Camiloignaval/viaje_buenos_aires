import { Children, useId, type ReactNode } from "react";
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
  const headingId = useId();
  if (Children.count(children) === 0) return null;

  return (
    <section className="chapter-reading-flow" aria-labelledby={headingId}>
      <header className="chapter-reading-flow-heading">
        <p className="chapter-reading-flow-kicker">El recorrido</p>
        <h2 id={headingId}>El día, página a página</h2>
        <span className="chapter-reading-flow-rule" aria-hidden="true" />
      </header>
      <ol
        className="activities chapter-activity-sequence"
        aria-label={`Recorrido de ${chapterTitle}`}
      >
        {children}
      </ol>
    </section>
  );
}

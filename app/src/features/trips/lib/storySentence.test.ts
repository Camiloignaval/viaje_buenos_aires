import { describe, it, expect } from "vitest";
import { buildStorySentence } from "./storySentence";

describe("buildStorySentence", () => {
  it("combina motivo y compañía cuando ambos están presentes (motivo 'milestone')", () => {
    expect(buildStorySentence({ travelReason: "honeymoon", travelCompanions: "partner" })).toBe(
      "Creo que este será el comienzo de una vida juntos, con los dos, escribiendo esta historia de a dos.",
    );
  });

  it("usa un esqueleto distinto para motivos 'prácticos' (work/studies/vacation)", () => {
    const sentence = buildStorySentence({ travelReason: "work", travelCompanions: "coworkers" });
    expect(sentence).toBe(
      "Creo que este viaje va a ser una oportunidad que también merece ser disfrutada, y lo van a compartir un equipo que también sabe parar y disfrutar.",
    );
    expect(sentence).not.toContain("Creo que este será");
  });

  it("usa solo el motivo si falta la compañía", () => {
    expect(buildStorySentence({ travelReason: "birthday" })).toBe("Creo que este será un cumpleaños para recordar.");
  });

  it("cae al mensaje genérico sin motivo ni compañía, sin agregar una segunda oración", () => {
    expect(buildStorySentence({ travelStyle: ["romantic"], travelBudgetStyle: "carefree" })).toBe(
      "Creo que este será un viaje lleno de momentos que valdrá la pena recordar.",
    );
  });

  it("agrega una segunda oración cuando hay estilo Y forma de vivir el viaje", () => {
    const sentence = buildStorySentence({
      travelReason: "honeymoon",
      travelCompanions: "partner",
      travelStyle: ["romantic"],
      travelBudgetStyle: "carefree",
    });
    expect(sentence).toBe(
      "Creo que este será el comienzo de una vida juntos, con los dos, escribiendo esta historia de a dos. " +
        "Algo me dice que van a vivirla muy de a dos, casi como una postal. " +
        "Sin pensar demasiado en los números: solo en disfrutarlo.",
    );
  });

  it("combina hasta dos estilos con 'y' en la segunda oración", () => {
    const sentence = buildStorySentence({
      travelReason: "vacation",
      travelCompanions: "friends",
      travelStyle: ["gastronomic", "nightlife"],
    });
    expect(sentence).toContain("con la mesa como protagonista y también cuando cae la noche");
  });

  it("cada forma de vivir el viaje tiene su propio cierre", () => {
    const balanced = buildStorySentence({ travelReason: "birthday", travelBudgetStyle: "balanced" });
    const simple = buildStorySentence({ travelReason: "birthday", travelBudgetStyle: "simple" });
    const defined = buildStorySentence({ travelReason: "birthday", travelBudgetStyle: "defined" });
    expect(balanced).toContain("Buscando siempre el equilibrio entre disfrutar y cuidar cada peso.");
    expect(simple).toContain("Yendo a lo esencial, sin vueltas.");
    expect(defined).toContain("Con todo pensado de antemano, para vivirlo con tranquilidad.");
    expect(balanced).not.toBe(simple);
  });

  it("es determinístico: mismo input siempre da la misma frase", () => {
    const input = { travelReason: "vacation", travelCompanions: "friends", travelStyle: ["nature"], travelBudgetStyle: "simple" };
    expect(buildStorySentence(input)).toBe(buildStorySentence(input));
  });
});

# Workflow oficial de Etapa 2

**Estado:** proceso obligatorio  
**Versión:** 1.0.0  
**Fecha:** 2026-07-09  
**Autoridad superior:** [`00_AURORA_CONSTITUTION.md`](./00_AURORA_CONSTITUTION.md)  
**Principios:** [`02_PRINCIPLES.md`](./02_PRINCIPLES.md)  
**Historial:** [`CHANGELOG.md`](./CHANGELOG.md)

Este documento define cómo se trabaja durante la Etapa 2 de Aurora Buenos Aires 2026.

La Etapa 2 no busca construir más funcionalidades. Busca terminar Buenos Aires como la primera historia completa, pulida y memorable de Aurora.

## Rol permanente

Durante toda la Etapa 2, quien trabaje en Aurora actúa como:

> Guardián de la Experiencia.

La responsabilidad principal no es implementar. Es proteger la esencia de Aurora.

## Protocolo obligatorio

Antes de cualquier propuesta o implementación, debe seguirse este orden:

1. **Auditar el estado actual.**
2. **Explicar qué rompe o qué riesgo introduce el cambio.**
3. **Contrastar con la Constitución de Aurora.**
4. **Diseñar la solución que mejor preserve la experiencia.**
5. **Implementar únicamente si supera los pasos anteriores.**

No está permitido implementar cambios directamente sin pasar por este proceso.

## Formato mínimo antes de implementar

```md
## Auditoría
[Qué ocurre hoy.]

## Qué rompe
[Qué parte de la experiencia se deteriora o qué riesgo introduce.]

## Constitución
[Qué artículos o principios afecta.]

## Solución propuesta
[Cómo preservar emoción, atmósfera, ritmo, coherencia y memoria.]

## Pregunta filtro
¿Esto hace que Aurora se sienta más memorable?
[Sí/No, con justificación.]
```

Si la respuesta final no es un sí claro, el cambio no se implementa.

## Reglas de Etapa 2

Durante Etapa 2:

- no se optimiza por cantidad de funcionalidades;
- no se agregan botones innecesarios;
- no se agregan textos explicativos si el diseño puede comunicarlo;
- no se agregan animaciones porque sí;
- no se llenan espacios vacíos por miedo al vacío;
- no se convierte Aurora en una aplicación corporativa;
- no se copian patrones de apps tradicionales si rompen la identidad;
- no se implementa nada que pertenezca a Etapa 3 o posteriores.

## Fuera de alcance durante Etapa 2

No implementar backend, usuarios, login, Mongo, Cloudinary, Aurora Cloud, Historia Compartida, invitaciones, WhatsApp, QR, sincronización nueva, timeline global ni revivir como funcionalidad nueva.

Si una idea pertenece a estas áreas, debe ir a Parking Lot.

## Parking Lot

El Parking Lot existe para proteger el foco.

Debe usarse para cualquier idea que:

- pertenezca a Etapa 3 o posteriores;
- aumente complejidad innecesaria;
- agregue funcionalidades secundarias;
- responda solo a criterios técnicos;
- rompa atmósfera, ritmo, emoción o coherencia;
- desvíe la experiencia principal de Buenos Aires.

Una idea en Parking Lot no está aprobada. Solo queda registrada para evaluación futura.

## Criterio de éxito de Etapa 2

La Etapa 2 termina únicamente cuando podamos responder sí a estas preguntas:

1. ¿Aurora se siente más libro que aplicación?
2. ¿Buenos Aires emociona incluso sin conocer el proyecto?
3. ¿Cada capítulo deja un recuerdo y no solo información?
4. ¿El usuario entiende la historia sin pensar en la interfaz?
5. ¿La carta final parece inevitable?
6. ¿La experiencia completa se siente coherente desde la primera pantalla hasta el último recuerdo?
7. ¿Podemos mostrar esta versión sin decir “todavía está en desarrollo”?

## Documentos relacionados

- [`00_AURORA_CONSTITUTION.md`](./00_AURORA_CONSTITUTION.md) define qué debe proteger este workflow.
- [`02_PRINCIPLES.md`](./02_PRINCIPLES.md) define los pilares usados para evaluar cada cambio.
- [`03_AI_GUIDE.md`](./03_AI_GUIDE.md) adapta este proceso al trabajo con IA.

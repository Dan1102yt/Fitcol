# Plan de 90 días — resumen

Ver el documento completo en [[fitcol_analisis_codigo_y_estrategia]] (Parte 3) y [[fitcol_fase2_beta_cerrada]] para la Fase 2 en detalle.

| Fase | Qué es | Cuándo |
|---|---|---|
| Fase 1 | Terminar la base, arreglar bugs críticos | días 1–20 |
| **Fase 1.5 (nueva)** | Dogfooding personal — uso diario propio | 2 semanas, antes de reclutar |
| Fase 2 | Beta cerrada (30–80 testers colombianos) | días 20–45 |
| Fase 3 | Construir monetización | días 40–60 |
| Fase 4 | Beta abierta / soft launch Colombia | días 55–75 |
| Fase 5 | Lanzamiento público | días 75–90 |

## Estado actual (13 sep 2026)

- ✅ Fase 1 completa — ver [[Bugs resueltos]]
- 🟡 Fase 1.5 (dogfooding) — pasando de facto desde finales de agosto: el uso diario real fue el que sacó a la luz el bug de fecha retroactiva y el catálogo de comida incompleto, y motivó directamente el dropset y el registro de Cardio. Nunca se llenó la bitácora formal — [[Bitacora dogfooding]] sigue con solo la plantilla vacía, vale la pena ponerse al día ahí aunque sea con lo ya vivido.
- 🆕 Fase 1.5-B (nueva, propuesta 13 sep) — antes de reclutar los 30–80 testers externos de la Fase 2, correr una mini-beta de ~12 personas elegidas a mano por Oscar, con acceso "founder" gratis a lo que sea premium cuando exista. 12 y no 10 porque es también el mínimo de testers cerrados que exige Google Play para publicar ahí más adelante — dos pájaros de un tiro. Pendiente de ejecutar.
- 🔜 Fase 2 (beta cerrada 30–80) — contenido de reclutamiento, consultas SQL y guía de entrevistas ya listos en [[fitcol_fase2_beta_cerrada]], falta ejecutar.
- 🔜 Fase 3 (monetización) — confirmado en el código que sigue sin existir ninguna infraestructura de pago (no hay Stripe/RevenueCat ni gate de pago en ninguna vista) — cuando se construya, hay que marcar ahí mismo a los testers "founder" de la Fase 1.5-B para que no les cobre.

**Mejoras de producto desde la última actualización (sesión 12–13 sep):** dropset, reordenar ejercicios de una rutina personalizada, importador de historial de gimnasio desde Excel, fix del bug de fecha retroactiva en Entrenamiento, registro de Cardio, y catálogo de alimentos ampliado (Bimbo/Ramo/Noel/sándwiches/comida rápida). Ya publicado en fitcol.fit. Detalle completo en [[Bugs resueltos]].

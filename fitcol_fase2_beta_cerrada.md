# Fitcol — Fase 2: Beta cerrada real (días 20–45)

Piezas para ejecutar esta fase: una recomendación sobre dogfooding personal antes de reclutar a nadie, contenido para reclutar 30–80 testers colombianos reales, las consultas para medir su comportamiento en Supabase, la guía para las entrevistas de la semana 4, y la respuesta sobre Play Store.

---

## 0. Fase 1.5 — Dogfooding personal (2 semanas, antes de reclutar a nadie)

Me preguntaste qué opino de meter 2 semanas donde tú mismo uses la app cada día antes de abrir la beta a extraños. Me parece una muy buena idea, y la agregaría como una "Fase 1.5" corriendo justo antes de la Fase 2 (empujando el resto del cronograma de 90 días unas dos semanas, sin drama — es tiempo bien gastado).

Por qué vale la pena:

- Los bugs más obvios (los que matarían la confianza de un tester nuevo en el primer minuto) los vas a encontrar tú solo, sin gastar la buena voluntad de 30-80 personas que reclutaste con esfuerzo.
- Vas a poder hablar del producto desde experiencia real cuando reclutes ("llevo dos semanas usándola todos los días y...") en vez de vendiendo algo que ni tú has probado a fondo — eso se nota en los posts de reclutamiento.
- Es la prueba real de que el fix del Service Worker y el de sincronización de esta sesión aguantan el uso diario real, no solo una sesión de pruebas puntual.

Cómo aprovecharla (sin armar un sistema paralelo — usa la app misma para todo):

- Registra tu entrenamiento y tu comida real todos los días, no datos de prueba.
- Presta atención especial a si el análisis de fotos acierta con TU comida real del día a día — vas a anticipar exactamente lo que vas a preguntarles a los testers en la semana 4.
- Anota (en una nota aparte, en el vault de Obsidian que armamos más abajo es buen lugar) cualquier fricción, por chiquita que sea — esas notas se vuelven directamente parte de lo que arreglas antes de reclutar.
- Al final de las 2 semanas, revisa las consultas SQL de la sección 2 con tus propios datos — es la primera vez que las corres con datos reales, así confirmas que funcionan antes de necesitarlas con 80 usuarios.

---

## 1. Contenido para reclutar testers

### Perfil de tester que buscas

Prioriza gente que ya entrena o cuida su dieta de alguna forma (gimnasio, calistenia, running, o simplemente cuidando qué come) — no necesitan ser expertos, pero sí necesitan tener un hábito real que la app pueda acompañar. Evita reclutar solo amigos cercanos: sus respuestas tienden a ser más generosas de lo que sería un usuario nuevo sin ningún compromiso contigo.

### Post para grupos de Facebook / WhatsApp de gimnasios

> 🦅 **Busco 30 personas para probar Fitcol antes de lanzarla al público**
>
> Soy [tu nombre], estoy construyendo Fitcol — una app gratis para entrenar, llevar tu dieta y resolver dudas con un asistente de IA que entiende comida colombiana (le tomas foto a tu almuerzo y te calcula las calorías y macros).
>
> Busco gente que ya entrene o cuide su alimentación, para probarla 2-3 semanas y decirme sin filtro qué funciona y qué no. A cambio: acceso gratis de por vida a las funciones premium cuando las lancemos, y tu opinión literalmente va a definir cómo queda la app.
>
> Si te interesa, escríbeme o llena esto: [link al formulario]
>
> No es venta de nada — es una app real, gratis, hecha en Colombia. 🇨🇴

### Post para subreddits / foros fitness colombianos

Ajusta el tono a cada comunidad (Reddit valora más la transparencia sobre quién eres y qué pides a cambio; los foros más tradicionales aceptan un tono más directo).

> **[Beta abierta] Fitcol — app de entrenamiento + dieta + IA, hecha en Colombia, busco testers reales**
>
> Hola — soy el desarrollador de Fitcol, una PWA (funciona en cualquier celular sin instalar nada desde una tienda) para llevar rutina de entrenamiento, dieta con comida típica colombiana, y un asistente de IA al que le puedes tomar foto a tu comida y te calcula kcal/macros automáticamente.
>
> Está en fase beta y busco 30-80 personas que la usen de verdad por unas semanas — no busco elogios, busco que me digan qué está mal. Es gratis, sin tarjeta, sin catch.
>
> Si entrenás o cuidás lo que comés y te interesa probarla, comenta o mandame mensaje. Voy a hacer un par de entrevistas cortas (15 min) a quienes la usen más, con algo de agradecimiento a cambio de su tiempo.
>
> Link: fitcol.fit

### Mensaje directo para micro-influencers de fitness (IG/TikTok Colombia)

> Hola [nombre] 👋 Soy [tu nombre], desarrollador de Fitcol — una app colombiana de entrenamiento + dieta con un asistente de IA que analiza fotos de comida (funciona muy bien con comida típica, que es justo lo que casi ninguna app gringa hace bien).
>
> Estoy en beta cerrada antes del lanzamiento público y me encantaría que la probaras. No te estoy pidiendo que la promociones todavía — solo que la uses una o dos semanas y me des tu opinión honesta, buena o mala. Si te gusta y en algún momento quieres mostrarla a tu audiencia, hablamos de una colaboración con código de acceso propio.
>
> Te dejo el link: fitcol.fit — cualquier duda me escribes por acá directamente.

### Formulario de inscripción (recomendado antes de mandar tráfico)

Antes de publicar los posts, arma un formulario corto para no perder el rastro de quién entra a la beta — lo vas a necesitar para elegir a quién entrevistar en la semana 4.

**Cómo armarlo (2 minutos, sin cuentas nuevas):** ve a [forms.google.com](https://forms.google.com), "Formulario en blanco", y copia los campos de abajo tal cual, uno por pregunta. Las respuestas caen solas en una hoja de Google Sheets (botón "Respuestas" → ícono de Sheets) donde ya puedes filtrar y cruzar con Supabase por correo. No necesitas conectar nada — es la ruta más rápida.

*Alternativa: si prefieres que te arme el formulario yo mismo desde aquí en vez de crearlo tú a mano, puedo hacerlo conectando Jotform (un formulario/encuestas dentro de Claude) — dime y lo conectamos.*

Campos sugeridos:

- Nombre
- Correo (el mismo que va a usar para crear su cuenta en Fitcol — así puedes cruzarlo con Supabase)
- WhatsApp o Instagram (para poder contactar más fácil que por correo)
- Ciudad
- ¿Entrenas en gimnasio, en casa, o ninguno de los dos todavía?
- Sistema operativo del celular (Android / iPhone) — te sirve para saber si tienes cobertura de pruebas en ambos

---

## 2. Medición en Supabase (sin código nuevo)

Estas consultas van directo en **Supabase → SQL Editor → + New query**. No necesitas tocar la app — todo esto lee las tablas que ya existen.

### Usuarios registrados vs. onboarding completado

```sql
select
  (select count(*) from auth.users) as usuarios_registrados,
  (select count(*) from perfiles where nombre is not null and edad is not null) as onboarding_completado;
```

### % que registró al menos una comida en su primera semana

```sql
select
  count(distinct u.id) as usuarios_con_comida_semana1,
  (select count(*) from auth.users) as total_usuarios,
  round(100.0 * count(distinct u.id) / nullif((select count(*) from auth.users), 0), 1) as porcentaje
from auth.users u
join comidas c on c.user_id = u.id
where c.created_at <= u.created_at + interval '7 days';
```

### % que registró al menos un set de entrenamiento en su primera semana

```sql
select
  count(distinct u.id) as usuarios_con_entreno_semana1,
  (select count(*) from auth.users) as total_usuarios,
  round(100.0 * count(distinct u.id) / nullif((select count(*) from auth.users), 0), 1) as porcentaje
from auth.users u
join entrenamientos e on e.user_id = u.id
where e.created_at <= u.created_at + interval '7 days';
```

### Retención D7 (actividad de cualquier tipo, 7+ días después de registrarse)

```sql
with actividad as (
  select user_id, created_at from comidas
  union all
  select user_id, created_at from entrenamientos
  union all
  select user_id, created_at from registros_peso
)
select
  count(distinct u.id) as usuarios_activos_dia7_o_mas,
  round(100.0 * count(distinct u.id) / nullif((select count(*) from auth.users), 0), 1) as porcentaje
from auth.users u
join actividad a on a.user_id = u.id
where a.created_at >= u.created_at + interval '7 days';
```

### Ranking por usuario (útil para elegir a quién entrevistar)

Corre esto la semana 4 para identificar tanto a tus usuarios más comprometidos como a los que probaron poco y se fueron — quieres entrevistar a ambos grupos, no solo a los fans.

```sql
select
  u.email,
  p.nombre,
  u.created_at as fecha_registro,
  (select count(*) from comidas c where c.user_id = u.id) as comidas_totales,
  (select count(*) from entrenamientos e where e.user_id = u.id) as sets_totales,
  (select count(*) from registros_peso r where r.user_id = u.id) as pesos_registrados,
  (select max(c.created_at) from comidas c where c.user_id = u.id) as ultima_comida_registrada
from auth.users u
left join perfiles p on p.id = u.id
order by (comidas_totales + sets_totales) desc;
```

### Uso del Asistente IA (ya corregido — ver más abajo)

El hueco que había encontrado ("no hay forma de medir cuántos usan el chat") ya está resuelto: `ai.js`/`cloud-sync.js` ahora registran un evento en una tabla nueva, `chat_events`, cada vez que un mensaje de chat o un análisis de foto termina con éxito (nunca se guarda el contenido, solo que pasó). Antes de que esto sirva, tienes que correr el SQL de `chat_events` en Supabase — está en `SETUP.md`, sección "Paso 3", bloque nuevo al final — y publicar (`git push`) los cambios en `ai.js` y `cloud-sync.js`.

Con la tabla creada, esta consulta te da el desglose:

```sql
select
  tipo,
  count(*) as eventos_totales,
  count(distinct user_id) as usuarios_unicos
from chat_events
group by tipo;
```

Y esta versión ampliada del ranking por usuario ya incluye si usó el asistente — la puedes usar en vez de la de arriba para elegir a quién entrevistar:

```sql
select
  u.email,
  p.nombre,
  u.created_at as fecha_registro,
  (select count(*) from comidas c where c.user_id = u.id) as comidas_totales,
  (select count(*) from entrenamientos e where e.user_id = u.id) as sets_totales,
  (select count(*) from chat_events ce where ce.user_id = u.id and ce.tipo = 'chat') as mensajes_chat,
  (select count(*) from chat_events ce where ce.user_id = u.id and ce.tipo = 'foto') as fotos_analizadas
from auth.users u
left join perfiles p on p.id = u.id
order by (comidas_totales + sets_totales) desc;
```

---

## 3. Guía de entrevistas — semana 4

### A quién entrevistar

10–15 personas, mezclando dos grupos usando el ranking de la consulta anterior: 7–10 de tus usuarios más activos (para entender qué los engancha) y 3–5 que probaron poco o dejaron de usarla (para entender por qué se fueron — esa señal vale más que diez elogios).

### Logística

Llamadas de 15–20 minutos por WhatsApp (video si aceptan, si no audio). Agenda con al menos un día de anticipación. Ofrece algo pequeño a cambio del tiempo — no tiene que ser dinero: acceso premium extendido cuando lances la suscripción es suficiente y además te sirve como beta de esa función más adelante.

### Preguntas de calentamiento

- ¿Hace cuánto entrenas o cuidas tu alimentación, y con qué la comparas hoy — otra app, papel, nada?
- Cuéntame la primera vez que abriste Fitcol: ¿qué esperabas encontrar?

### Núcleo: análisis de fotos de comida (la función más nueva y más riesgosa)

Pídeles que tengan a mano su celular durante la llamada — es mucho mejor si revisan casos reales en vivo contigo que si responden de memoria.

- Muéstrame una foto de comida que hayas subido — ¿qué tan cerca estuvo el cálculo de calorías/macros de lo que en verdad comiste?
- ¿Hubo algún plato colombiano específico donde la IA se equivocara o no lo reconociera bien? (bandeja paisa, sancocho, arepa con algo, etc. — anota el plato exacto, esto es oro para mejorar los prompts)
- Cuando la IA se equivocó, ¿qué hiciste — corregiste el dato a mano, lo dejaste así, o dejaste de usar esa función?

### UX general

- ¿Hubo algún momento en que no supiste qué hacer o algo no se sintió claro?
- ¿Llegaste a usar el campo de lesiones/restricciones en Perfil? Si sí, ¿la rutina que te generó tuvo sentido para ti?
- Si dejaste de entrar por unos días, ¿qué te hizo volver — o qué te habría hecho volver?
- ¿Le preguntaste algo al asistente de IA? ¿Qué tan útil fue comparado con lo que esperabas?

### Señal de monetización (solo investigación, no le pidas que decida por ti)

- Si mañana el asistente de IA (chat + análisis de fotos) tuviera un límite gratis al mes y de ahí en adelante fuera de pago, ¿seguirías usando la app igual, o eso te haría dejarla?
- ¿Hay alguna otra app similar por la que ya pagues o hayas pagado? ¿Cuánto?

### Cierre

- Del 0 al 10, ¿qué tan probable es que le recomiendes Fitcol a alguien que entrena? ¿Por qué ese número y no uno más alto?
- ¿Algo más que no te haya preguntado y que debería saber?

Anota las respuestas por escrito inmediatamente después de cada llamada, mientras las recuerdas bien — no dejes esto para el final de la semana.

---

## 4. ¿Se puede descargar Fitcol desde Play Store?

Sí se puede, pero vale la pena que sepas el costo y el proceso real antes de decidir si lo haces ahora o más adelante.

**Costo:** Google cobra un pago único de **25 USD** por la cuenta de desarrollador (no es anual, se paga una sola vez). Aparte de eso, empaquetar la PWA como app de Android es gratis — se usa una herramienta llamada Bubblewrap (o su versión con interfaz, PWABuilder), ambas gratuitas, que convierten tu web app en un paquete instalable sin que tengas que reescribir nada del código.

**El detalle que cambia el plan:** desde noviembre de 2023, las cuentas de desarrollador individuales nuevas están obligadas a correr una **prueba cerrada con al menos 12 testers durante 14 días seguidos** antes de que Google te deje publicar en producción. Esto en realidad te conviene — es básicamente lo que ya vas a hacer en la Fase 2 con tus 30-80 beta testers. Si quieres, cuando arranques el reclutamiento registras la cuenta de Play Console, metes a tus primeros testers ahí como "testers cerrados" oficiales de Google, y cuando termines esas 2 semanas ya cumpliste el requisito para publicar — dos pájaros de un tiro.

Mi recomendación: no lo hagas ahora mismo. Espera a tener la Fase 2 corriendo (ya vas a tener testers reales) y ahí sí vale los 25 dólares y el trámite. Publicar en Play Store antes de tener nada probado es gastar dinero y tiempo en distribución para un producto que todavía estás afinando.

### Mientras tanto: cómo reinstalar Fitcol gratis, sin Play Store

Fitcol ya es instalable como PWA — no necesitas la tienda para tenerla como app en tu celular:

- **Android (Chrome):** abre fitcol.fit, te va a aparecer un banner "Instala Fitcol en tu celular" (lo vimos en tus capturas) — tócalo, o si no aparece, toca los tres puntos del navegador → "Instalar app" / "Añadir a pantalla de inicio".
- **iPhone (Safari):** abre fitcol.fit, toca el ícono de compartir (el cuadrado con la flecha hacia arriba), y elige "Añadir a pantalla de inicio".

En ambos casos queda un ícono normal en tu pantalla de inicio, abre en pantalla completa sin la barra del navegador, y funciona offline gracias al Service Worker — es, en la práctica, una app real, solo que no pasó por una tienda. Si alguna vez la desinstalas, repites estos mismos pasos y vuelves a tenerla, sin costo ni cuenta de por medio.

Sources:
- [Google Play Developer Fee 2026: $25 + 12-Tester Rule | IconikAI](https://www.iconikai.com/blog/google-play-developer-account-fee-2026)
- [Can You Publish a PWA to the App Store and Google Play? What Works (And What Doesn't) in 2026](https://www.mobiloud.com/blog/publishing-pwa-app-store)

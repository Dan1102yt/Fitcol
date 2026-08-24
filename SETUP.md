# Setup de Fitcol

Guía completa para dejar Fitcol funcionando con autenticación de usuarios, base de datos en la nube y asistente IA.

Componentes que tienes que configurar:
1. **Cloudflare Worker** (proxy IA) — ya está hecho. URL: `https://fitcol-api.davidroa1102.workers.dev`
2. **Supabase** (auth + base de datos) — falta configurar
3. **GitHub Pages** (hosting) — ya está hecho. URL: `https://dan1102yt.github.io/Fitcol/`

---

## Paso 1 — Crear proyecto en Supabase

1. Ve a https://supabase.com/ y crea cuenta gratuita.
2. **New Project**. Nombre: `fitcol`. Region: la más cercana (São Paulo si estás en Colombia). Password: guárdala bien.
3. Espera ~2 minutos a que termine el provisioning.

## Paso 2 — Copiar credenciales

En el dashboard de Supabase:

1. **Settings → API**
2. Copia:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon public** key (un JWT largo)

Abre `supabase-config.js` en tu repo Fitcol y reemplaza:

```js
const SUPABASE_URL      = "REPLACE_SUPABASE_URL";       // pega aquí Project URL
const SUPABASE_ANON_KEY = "REPLACE_SUPABASE_ANON_KEY";  // pega aquí anon public key
```

La anon key es **segura de publicar en GitHub**. La seguridad real la dan las políticas RLS que activamos a continuación.

## Paso 3 — Crear tablas y políticas RLS

En Supabase → **SQL Editor → + New query**, pega y ejecuta todo este bloque:

```sql
-- ============ PERFILES ============
CREATE TABLE perfiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  nombre TEXT,
  edad INT,
  peso_inicial NUMERIC,
  altura NUMERIC,
  objetivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo el dueño" ON perfiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ REGISTROS DE PESO ============
CREATE TABLE registros_peso (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  fecha DATE NOT NULL,
  peso NUMERIC NOT NULL,
  porcentaje_grasa NUMERIC,
  pecho NUMERIC,
  cintura NUMERIC,
  cadera NUMERIC,
  bicep NUMERIC,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, fecha)
);
ALTER TABLE registros_peso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo el dueño" ON registros_peso
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ENTRENAMIENTOS ============
CREATE TABLE entrenamientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  fecha DATE NOT NULL,
  ejercicio TEXT NOT NULL,
  series INT,
  repeticiones INT,
  peso_kg NUMERIC,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE entrenamientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo el dueño" ON entrenamientos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ COMIDAS ============
CREATE TABLE comidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  fecha DATE NOT NULL,
  nombre TEXT NOT NULL,
  calorias NUMERIC,
  proteina NUMERIC,
  carbohidratos NUMERIC,
  grasas NUMERIC,
  porcion_gramos NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE comidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo el dueño" ON comidas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ CHAT EVENTS (medir uso del Asistente IA) ============
-- Solo registra "hubo un mensaje de chat" o "hubo un análisis de foto" — nunca el
-- contenido. Sirve para medir en la beta cuántos testers usan el asistente al menos
-- una vez, algo que antes no quedaba registrado en ningún lado.
CREATE TABLE chat_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('chat', 'foto')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo el dueño" ON chat_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ÍNDICES ÚTILES ============
CREATE INDEX idx_peso_user_fecha ON registros_peso (user_id, fecha DESC);
CREATE INDEX idx_entren_user_fecha ON entrenamientos (user_id, fecha DESC);
CREATE INDEX idx_comidas_user_fecha ON comidas (user_id, fecha DESC);
CREATE INDEX idx_chatev_user_fecha ON chat_events (user_id, created_at DESC);
```

**Si ya tienes las otras 4 tablas creadas y solo necesitas agregar `chat_events`**, corre únicamente el bloque de arriba de `chat_events` (desde `CREATE TABLE chat_events` hasta su índice) — no hace falta rehacer las demás.

Verifica en **Table Editor**: deben aparecer las 4 tablas con un candado (RLS habilitado).

## Paso 4 — Activar autenticación con email/password

En Supabase → **Authentication → Providers → Email**:
- Que esté **Enabled**.
- Para uso simple, desactiva **Confirm email** mientras pruebas (vuelve a activarlo en producción).

## Paso 5 — Activar Google OAuth (opcional pero recomendado)

1. **Authentication → Providers → Google**.
2. Necesitas un Client ID y Secret de Google Cloud Console:
   - Ve a https://console.cloud.google.com/apis/credentials
   - **Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://dan1102yt.github.io`
   - Authorized redirect URIs: `https://<TU_PROYECTO>.supabase.co/auth/v1/callback`
   - Crea, copia Client ID y Client Secret.
3. Pega en Supabase y guarda.

## Paso 6 — Configurar URL de redirección (Site URL)

En Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://dan1102yt.github.io/Fitcol/`
- **Redirect URLs**: añade `https://dan1102yt.github.io/Fitcol/` y `http://localhost/` (para tests locales).

## Paso 7 — Commit del `supabase-config.js`

Una vez pegadas las credenciales, súbelas a GitHub:

```bash
cd C:\Users\VICTUS\CLAUDE\Fitcol
git add supabase-config.js
git commit -m "Configure Supabase credentials"
git push
```

GitHub Pages reconstruye en 1-2 min. La app empezará a pedir login automáticamente.

---

## Verificación rápida

1. Abre https://dan1102yt.github.io/Fitcol/ con `Ctrl+Shift+R`.
2. Debe aparecer **pantalla de login** con botón Google + formulario email/contraseña.
3. Crea una cuenta.
4. Tras iniciar sesión, el onboarding pide tus datos. Al guardar, deben aparecer en Supabase → Table Editor → `perfiles`.
5. Registra un peso desde **+ Registrar peso**: aparece el modal con campos opcionales. Verifica en `registros_peso`.
6. Marca un set en Entrenamiento: aparece en `entrenamientos`.
7. Agrega una comida desde el buscador de Open Food Facts: aparece en `comidas`.
8. Importa un Excel desde Entrenamiento → Mis rutinas → "Importar historial Excel". Las filas aparecen en `entrenamientos`.
9. Manda un mensaje al Asistente IA (o analiza una foto de comida): aparece una fila en `chat_events` con `tipo` "chat" o "foto".

---

## Mantenimiento

| Acción | Cómo |
|---|---|
| Ver datos por usuario | Supabase → Table Editor → filtra por `user_id` |
| Ver / borrar usuarios | Authentication → Users |
| Logs del Worker | `npx wrangler tail` (desde `fitcol-api/`) |
| Cambiar API key de Anthropic | `npx wrangler secret put ANTHROPIC_API_KEY` |
| Cambiar políticas RLS | Database → Policies |

## Notas

- **Multi-dispositivo**: como toda la data crítica vive en Supabase, el mismo usuario puede entrar desde celular y PC y verá lo mismo. La hidratación al login sobreescribe `localStorage` con los datos de la nube.
- **Plan gratuito Supabase**: 500 MB storage, 50k usuarios mensuales activos. Suficiente para uso personal o pequeñas comunidades.
- **Costos**: solo Claude API consume saldo. El resto (Supabase free, Cloudflare Workers free, GitHub Pages free, Open Food Facts free) no cobra.

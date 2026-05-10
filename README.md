# Quiniela Mundial 2026

App web para organizar quiniela por fases del Mundial con React + TanStack Start + Tailwind + TypeScript.

## Incluye en este MVP

- Registro por correo + frase secreta + PIN numerico de 6 digitos
- Login por correo + PIN
- Onboarding de 3 pantallas (solo primera vez)
- Pantalla principal con accesos a:
  - Resultados del dia
  - Posiciones
  - Montar quiniela
- Flujo de fases: Grupos -> 16vos -> 8vos -> 4tos -> Semis -> Final
- Bloqueo de fase al iniciar el primer partido
- Confirmacion manual de fase y auto-confirmacion al cierre si habia borrador
- Puntaje:
  - +1 por acertar ganador/empate
  - +3 por marcador exacto
  - En eliminatorias, +1 por clasificado final
- Ranking con desempate por exactos y luego timestamp de confirmacion
- Panel admin para:
  - Cargar/editar resultados manuales
  - Ajustar ventanas de fase
  - Resetear PIN de usuarios

## Stack

- TypeScript
- React
- TanStack Start
- Tailwind CSS
- shadcn-style UI components locales
- Supabase (cliente y esquema incluidos)

## Desarrollo

```bash
npm install
npm run dev
```

App: `http://localhost:3000`

## Variables de entorno

Copia `.env.example` a `.env` y define:

- `VITE_REGISTRATION_SECRET`
- `VITE_ADMIN_EMAILS`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase

- Esquema SQL: `supabase/schema.sql`
- Edge Function stub scraping SofaScore: `supabase/functions/scrape-sofascore/index.ts`

## Verificacion

```bash
npm test
npm run build
```

# ⚽ Fulbo Jubilados

Una aplicación web para organizar partidos de fútbol 5v5 los domingos. Permite a los usuarios marcar su disponibilidad mensual, organizar equipos automáticamente y llevar un historial de partidos con resultados.

## Características

- ✅ **Autenticación con Google** (Clerk)
- 📅 **Calendario mensual** para marcar disponibilidad
- 👥 **Organización automática de equipos** cuando hay 10 jugadores
- 📊 **Historial de partidos** con resultados y estadísticas
- 🔧 **Panel de administración** para gestionar usuarios
- 📱 **Diseño responsivo** con Tailwind CSS

## Tecnologías

- **Next.js 15** con TypeScript
- **Clerk** para autenticación
- **Tailwind CSS** para estilos
- **LocalStorage** para persistencia de datos (fácil migración a base de datos)

## Instalación Local

1. Instala las dependencias:
```bash
npm install
```

2. Configura las variables de entorno en `.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=tu_clerk_publishable_key
CLERK_SECRET_KEY=tu_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

3. Ve a [Clerk](https://clerk.com) y crea una nueva aplicación:
   - Configura Google como proveedor de autenticación
   - Copia las claves y pégalas en `.env.local`

4. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

## Despliegue en Vercel

### Opción 1: Despliegue directo desde GitHub

1. Sube tu código a GitHub
2. Ve a [Vercel](https://vercel.com) y conecta tu repositorio
3. Configura las variables de entorno en Vercel:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`

### Opción 2: Usando Vercel CLI

1. Instala Vercel CLI:
```bash
npm i -g vercel
```

2. Despliega:
```bash
vercel
```

3. Configura las variables de entorno cuando se te solicite

## Configuración de Clerk

1. Ve a tu dashboard de Clerk
2. En **Social Connections**, habilita Google
3. Configura los dominios permitidos:
   - Para desarrollo: `http://localhost:3000`
   - Para producción: `https://tu-dominio.vercel.app`
4. En **Webhooks** (opcional), configura webhooks para sincronizar usuarios

## Uso de la Aplicación

### Para Usuarios Regulares:
1. Inicia sesión con Google
2. Marca tu disponibilidad en el calendario mensual
3. Ve la sección "Partidos" para ver partidos confirmados
4. Revisa el historial de partidos y estadísticas

### Para Administradores:
1. Ve al panel de Admin para gestionar usuarios
2. Otorga permisos de administrador a otros usuarios
3. Confirma partidos cuando hay 10+ jugadores disponibles
4. Organiza equipos automáticamente
5. Agrega información de reserva (cancha, horario, costo)
6. Registra resultados de partidos completados

## Estructura del Proyecto

```
src/
├── app/
│   ├── dashboard/           # Dashboard principal
│   │   ├── admin/          # Panel de administración
│   │   ├── games/          # Gestión de partidos
│   │   └── history/        # Historial y resultados
│   ├── layout.tsx          # Layout principal con Clerk
│   └── page.tsx            # Página de inicio
├── lib/
│   ├── store.ts            # Gestión de LocalStorage
│   └── utils.ts            # Utilidades y helpers
└── types/
    └── index.ts            # Tipos TypeScript
```

## Migración a Base de Datos

El proyecto está diseñado para migrar fácilmente de LocalStorage a una base de datos:

1. Reemplaza `LocalStorage` en `src/lib/store.ts` con tu ORM preferido
2. Las interfaces en `src/types/index.ts` están listas para usar con bases de datos
3. Considera usar:
   - **Supabase** (PostgreSQL)
   - **PlanetScale** (MySQL)
   - **Prisma** + cualquier base de datos

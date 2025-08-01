# ⚽ Fulbo Jubilados

Una aplicación web completa para organizar partidos de fútbol 5v5 los domingos. Sistema automatizado que permite a los usuarios votar su disponibilidad mensual, crea partidos automáticamente cuando hay suficientes jugadores, y gestiona todo el ciclo de vida de los partidos con notificaciones por email.

## 🚀 Características Principales

### 👤 **Gestión de Usuarios**
- ✅ **Autenticación con Clerk** (Google, email, etc.)
- 👥 **Sistema de roles**: Usuarios regulares, administradores, lista blanca
- 🏷️ **Nicknames obligatorios** (máximo 10 caracteres)
- 🔐 **Control de acceso** con permisos granulares

### 📅 **Sistema de Votación Mensual**
- 🗳️ **Votación por domingos**: Los usuarios marcan qué domingos pueden jugar
- 📊 **Ventana de 3 meses**: Votación hasta 3 meses en el futuro
- ❌ **Opción "No puedo ningún día"**: Para usuarios no disponibles
- 🚫 **Protección de meses pasados**: No se puede votar en meses anteriores
- 📱 **Interfaz visual intuitiva** con calendario interactivo

### ⚽ **Gestión Automática de Partidos**
- 🎯 **Creación automática**: Partidos se crean cuando 10+ jugadores votan el mismo domingo
- 📈 **Estados de partido**: Programado → Confirmado → Completado → Cancelado
- 👥 **Equipos automáticos**: Generación aleatoria de equipos 5v5
- 🔄 **Ajuste manual**: Los admins pueden reorganizar equipos
- 🚫 **Bloqueo de días**: Días con partidos confirmados no permiten más votos

### 🔧 **Panel de Administración Avanzado**
- 👥 **Gestión de usuarios**: Habilitar/deshabilitar, otorgar permisos de admin
- 📅 **Control de mes activo**: Configurar qué mes está disponible para votación
- 📧 **Sistema de emails**: Envío manual de recordatorios y confirmaciones
- 🎮 **Gestión de partidos**: Crear, editar, confirmar partidos
- 📊 **Registro de resultados**: Seguimiento de marcadores y notas
- 👁️ **Vista previa de emails**: Ver cómo se ven los emails antes de enviar

### 📧 **Sistema de Notificaciones por Email**
- 🗳️ **Recordatorios de votación**: Enviados manualmente a usuarios específicos
- 🚨 **Alertas automáticas para admins**: Cuando un partido alcanza 10 jugadores  
- ⚽ **Confirmaciones de partido**: Enviados manualmente con detalles completos
- 📬 **Integración con Resend**: Emails profesionales y confiables

### 📈 **Historial y Resultados**
- 🏆 **Historial completo**: Todos los partidos pasados con participantes
- 📊 **Seguimiento de resultados**: Marcadores, notas, equipos
- 💰 **Gestión de reservas**: Ubicación, horario, costo, responsable
- 📱 **Vista responsive**: Optimizado para móviles y desktop

## 🔧 Tecnologías

### **Frontend**
- **Next.js 15.4.4** con App Router
- **React 19.1.0** con TypeScript
- **Tailwind CSS 4** para estilos
- **Lucide React** para iconos
- **Server-side rendering** optimizado

### **Backend & Base de Datos**
- **Neon PostgreSQL** (base de datos serverless)
- **Drizzle ORM** para operaciones de base de datos
- **Next.js API Routes** para backend
- **Drizzle Kit** para migraciones

### **Servicios Externos**
- **Clerk** para autenticación y gestión de usuarios
- **Resend** para envío de emails
- **Svix** para webhooks de Clerk

### **Herramientas de Desarrollo**
- **TypeScript 5** para tipado estático
- **ESLint** y **Next.js ESLint Config** para linting
- **Tailwind Merge** para gestión de clases CSS

## 📦 Instalación y Configuración

### **1. Prerequisitos**
- Node.js 18+ 
- npm o yarn
- Cuenta en [Clerk](https://clerk.com)
- Cuenta en [Neon](https://neon.tech) (PostgreSQL)
- Cuenta en [Resend](https://resend.com) (opcional, para emails)

### **2. Clonar e Instalar**
```bash
git clone <repository-url>
cd futbol-organizer
npm install
```

### **3. Variables de Entorno**
Crea un archivo `.env.local` con las siguientes variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Email Service (Resend)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@tudominio.com

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Cambiar en producción
```

### **4. Configurar Base de Datos**
```bash
# Generar migraciones
npm run db:generate

# Aplicar migraciones
npm run db:migrate

# (Opcional) Abrir Drizzle Studio
npm run db:studio
```

### **5. Configurar Clerk**
1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. Crea una nueva aplicación
3. Configura proveedores de autenticación (Google recomendado)
4. En **Webhooks**, agrega: `https://tu-dominio.com/api/webhooks/clerk`
5. Copia las claves y pégalas en `.env.local`

### **6. Configurar Resend (Opcional)**
1. Ve a [Resend Dashboard](https://resend.com/dashboard)
2. Crea una API key
3. Verifica tu dominio para envío de emails
4. Agrega las credenciales a `.env.local`

### **7. Ejecutar Aplicación**
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm run start
```

## 🚀 Despliegue

### **Vercel (Recomendado)**
1. Conecta tu repositorio a [Vercel](https://vercel.com)
2. Configura todas las variables de entorno
3. Despliega automáticamente con cada push

### **Otras Plataformas**
Compatible con cualquier plataforma que soporte Next.js:
- **Netlify**
- **Railway** 
- **DigitalOcean App Platform**
- **AWS Amplify**

## 📖 Guía de Uso

### **Para Usuarios Regulares:**

1. **Registro y Configuración**
   - Iniciar sesión con Clerk
   - Configurar nickname (obligatorio)
   - Esperar habilitación por admin (si hay lista blanca)

2. **Votación Mensual**
   - Ir a Dashboard principal
   - Seleccionar domingos disponibles en el calendario
   - O marcar "No puedo ningún día" si no hay disponibilidad
   - Votar hasta 3 meses en el futuro

3. **Participación en Partidos**
   - Ver partidos confirmados en la sección "Partidos"
   - Recibir emails de confirmación con detalles
   - Consultar historial de partidos pasados

### **Para Administradores:**

1. **Gestión de Usuarios**
   - Acceder al panel de Admin
   - Habilitar/deshabilitar usuarios
   - Otorgar permisos de administrador
   - Gestionar lista blanca

2. **Configuración del Sistema**
   - Establecer mes activo para votación
   - Monitorear participación de usuarios
   - Gestionar configuraciones generales

3. **Gestión de Partidos**
   - Recibir alertas automáticas cuando partidos alcanzan 10 jugadores
   - Confirmar partidos con información de reserva
   - Organizar equipos automática o manualmente
   - Registrar resultados post-partido

4. **Comunicaciones**
   - Enviar recordatorios de votación individuales
   - Enviar confirmaciones de partido masivas
   - Vista previa de emails antes del envío

## 🏗️ Arquitectura del Proyecto

```
src/
├── app/
│   ├── api/                     # API Routes de Next.js
│   │   ├── availability/        # Gestión de votaciones
│   │   ├── games/              # CRUD de partidos
│   │   ├── users/              # Gestión de usuarios
│   │   ├── settings/           # Configuración del sistema
│   │   ├── send-*/             # Endpoints de envío de emails
│   │   └── webhooks/           # Webhooks de servicios externos
│   ├── dashboard/              # Páginas principales de la app
│   │   ├── admin/              # Panel de administración
│   │   ├── games/              # Vista de partidos
│   │   ├── history/            # Historial de partidos
│   │   ├── profile/            # Perfil de usuario
│   │   └── layout.tsx          # Layout del dashboard
│   ├── setup-nickname/         # Configuración inicial
│   ├── layout.tsx              # Layout raíz con Clerk
│   └── page.tsx                # Página de inicio
├── components/
│   └── ui/                     # Componentes UI reutilizables
│       ├── toast.tsx           # Sistema de notificaciones
│       └── confirm-dialog.tsx   # Diálogos de confirmación
├── lib/
│   ├── db/                     # Capa de base de datos
│   │   ├── connection.ts       # Conexión a PostgreSQL
│   │   ├── schema.ts           # Esquemas de Drizzle
│   │   └── service.ts          # Servicios de base de datos
│   ├── email.ts                # Servicio de emails con Resend
│   ├── notifications.ts        # Sistema de notificaciones
│   ├── calendar.ts             # Utilidades de calendario
│   └── utils.ts                # Utilidades generales
└── types/
    └── index.ts                # Definiciones de tipos TypeScript
```

## 🗄️ Esquema de Base de Datos

### **Tablas Principales:**

- **`users`**: Perfiles de usuario con roles y permisos
- **`games`**: Registro completo de partidos con participantes y resultados  
- **`monthlyAvailability`**: Votos de disponibilidad por usuario y mes
- **`reminderStatus`**: Seguimiento de recordatorios enviados
- **`settings`**: Configuración del sistema (mes activo, etc.)
- **`adminNotifications`**: Gestión de notificaciones para administradores

### **Relaciones:**
- Un usuario puede tener múltiples registros de disponibilidad
- Un partido puede tener múltiples participantes
- Los recordatorios están vinculados a usuarios específicos
- Las notificaciones admin se asocian con partidos

## 📧 Sistema de Emails

### **Tipos de Email:**

1. **🗳️ Recordatorio de Votación**
   - **Trigger**: Manual desde panel admin
   - **Destinatarios**: Usuarios que no han votado
   - **API**: `POST /api/send-voting-reminder`

2. **🚨 Alerta para Administradores** 
   - **Trigger**: Automático cuando partido alcanza 10 jugadores
   - **Destinatarios**: Todos los administradores
   - **API**: Automático en `DatabaseService.addUserToGame()`

3. **⚽ Confirmación de Partido**
   - **Trigger**: Manual desde panel admin
   - **Destinatarios**: Jugadores confirmados
   - **API**: `POST /api/send-match-confirmation`

### **Características:**
- Plantillas HTML responsive
- Contenido dinámico con datos reales
- Vista previa antes del envío
- Seguimiento de entrega con Resend

## 🔐 Seguridad y Permisos

### **Niveles de Acceso:**
- **Usuario Regular**: Votar, ver partidos propios, historial
- **Usuario en Lista Blanca**: Acceso completo a votaciones
- **Administrador**: Acceso completo al sistema

### **Medidas de Seguridad:**
- Autenticación con Clerk (OAuth, MFA disponible)
- Validación server-side en todas las APIs
- Variables de entorno para credenciales sensibles
- Sanitización de inputs de usuario
- Rate limiting en endpoints críticos

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para detalles.

## 🆘 Soporte

Para reportar bugs o solicitar nuevas funcionalidades:
- Abrir un [Issue](../../issues) en GitHub
- Contactar al equipo de desarrollo

---

**Desarrollado con ❤️ para la comunidad de Fulbo Jubilados** ⚽
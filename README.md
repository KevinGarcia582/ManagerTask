# ManagerTask - Sistema de Gestión de Tareas

Aplicación multiplataforma de gestión de horarios académicos y tareas, desarrollada con Expo y React Native.

## 🎯 Características

- **Autenticación**: Login y registro con datos académicos
- **Gestión de Horario**: Visualiza tu horario semanal con materias organizadas
- **Selector de Semestre**: Cambia entre semestres académicos
- **Lista de Materias**: Visualiza materias con información de créditos
- **Interfaz Intuitiva**: Diseño limpio y responsive
- **Multiplataforma**: iOS, Android y Web

## 📱 Instalación y Ejecución

### Requisitos
- Node.js v16+
- npm o yarn

### Instalación
```bash
npm install
```

### Iniciar con Expo
```bash
npm start
```

### 🔲 Usando Expo Go (Móvil)
1. En la terminal, ejecuta: `npm start`
2. Aparecerá un **código QR** en la consola
3. **Android**: Abre Expo Go y escanea el QR
4. **iOS**: Abre la Cámara y escanea el QR, luego toca la notificación

### Otras opciones
```bash
npm run web              # Abrir en navegador
npm run android          # Emulador Android
npm run ios              # Simulador iOS (solo Mac)
```

## 📁 Estructura

```
app/                    # Rutas (Expo Router)
├── _layout.tsx        # Layout principal
├── login.tsx          # Pantalla Login
├── register.tsx       # Pantalla Registro
└── dashboard.tsx      # Pantalla Principal

src/
├── screens/           # Componentes
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   └── DashboardScreen.tsx
└── context/
    └── AuthContext.tsx
```

## 📺 Pantallas

**Login**: Usuario y contraseña con enlace a registro
**Registro**: Crear cuenta con programa y semestre
**Dashboard**: Horario semanal, materias y opciones

## 🧪 Datos de Prueba

- Usuario: cualquier texto
- Contraseña: mín. 6 caracteres
- Programa: Ingeniería en Sistemas
- Semestre: 3°

## 🔧 Tecnologías

- React Native + Expo
- Expo Router
- AsyncStorage
- Context API
- Material Community Icons

## 📝 Notas

- Auth es mock (sin backend)
- Datos almacenados localmente
- Horario y materias son ejemplos
"# MANAGERTASK"  

# ManagerTask - Guía Rápida

## 🚀 Iniciar la App

### 1. Instalar dependencias (primera vez)

```bash
npm install
```

### 2. Iniciar servidor Expo

```bash
npm start
```

Verás algo como esto en la terminal:

```
┌─────────────────────────────────────┐
│  Expo Go                            │
│  Scan the QR code above with Expo Go│
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                │
│  ▓  ▓  ▓▓▓ ▓    ▓  ▓  ▓            │
│  ▓ ▓▓  ▓   ▓▓▓▓ ▓▓▓▓ ▓ ▓            │
│  ▓  ▓  ▓   ▓    ▓  ▓ ▓ ▓            │
│  ▓▓▓▓▓ ▓▓▓ ▓    ▓  ▓  ▓            │
└─────────────────────────────────────┘
```

### 3. Abrir en tu dispositivo

#### 📱 Android

1. Abre la app **Expo Go**
2. Escanea el código QR que ves en la terminal
3. ¡Listo! La app se abrirá en tu teléfono

#### 📱 iOS

1. Abre la **Cámara**
2. Apunta al código QR
3. Toca la notificación que aparece
4. Abre en Expo Go

### 4. Otras opciones

```bash
# Web (en navegador)
npm run web

# Android emulador
npm run android

# iOS (solo en Mac)
npm run ios
```

## 🧪 Probar la App

### Login

- Usuario: `estudiante1` (o cualquier texto)
- Contraseña: `123456` (mín. 6 caracteres)

### Registro

- Crea un nuevo usuario con cualquier dato
- Selecciona programa académico
- Elige semestre
- Se guardará localmente

## 📱 Pantallas

1. **Login** - Inicia sesión
2. **Registro** - Crear nueva cuenta
3. **Dashboard** - Ver horario, materias y opciones

## 🛑 Detener la App

En la terminal: `Ctrl + C`

## 📞 Soporte

Si tienes problemas:

- Verifica que tengas Node.js instalado: `node --version`
- Reinstala dependencias: `rm -rf node_modules && npm install`
- Cierra y abre Expo Go nuevamente

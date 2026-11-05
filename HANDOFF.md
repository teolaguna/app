# Bit-Track Rover — Guía de entrega del APK

Esta carpeta contiene el proyecto **listo para compilar un APK de prueba** para Android.
El proceso completo lo puede hacer OpenCode sin conocimientos previos de Expo.

---

## 📦 Qué hay en esta carpeta

| Ruta | Qué es |
|---|---|
| `BitTrackRover/` | **Proyecto Expo** (React Native) — esto es lo que compila |
| `BitTrackRover/App.js` | Código de la app: pantalla de bienvenida + panel de control BLE |
| `BitTrackRover/app.json` | Configuración (nombre, paquete Android, permisos Bluetooth) |
| `BitTrackRover/eas.json` | Receta de compilación (perfil `preview` = APK instalable) |
| `bittrackrover.jsx` | Versión **web** original — solo referencia, NO se compila ni se toca |
| `prompt-para-opencode.txt` | Prompt listo para pegar en OpenCode |

**Qué hace la app:** pantalla de bienvenida → panel de control que se conecta por
Bluetooth (BLE) al rover ESP32 y envía las órdenes **Encender (ON)**, **Apagar (OFF)**
y **Llamar (CALL)**. Sin login, sin base de datos, sin guardar datos.

---

## ✅ Requisitos (una sola vez)

1. **Node.js 18 o superior** → verificar en terminal: `node -v`
   (si no está: https://nodejs.org — descargar LTS)
2. **Cuenta gratis en expo.dev** → https://expo.dev/signup (1 minuto, con tu email)
3. **OpenCode instalado** → https://opencode.ai

---

## 🚀 Pasos

### 1. Clonar el repositorio
```bash
git clone <URL-DEL-REPOSITORIO>
cd <nombre-de-la-carpeta>
```

### 2. Entrar a Expo (terminal, una sola vez)
```bash
npx eas-cli login
```
Ingresar el email y contraseña de expo.dev. Si la cuenta es nueva, crearla antes en
https://expo.dev/signup.

### 3. Darle esto a OpenCode

Abrir la carpeta en OpenCode y pegar el contenido de
**`prompt-para-opencode.txt`** (Ctrl+V). OpenCode se encarga de todo.

Si OpenCode pregunta algo, las respuestas correctas son:
- *"Create a new project?"* → **Sí / crear**
- Si pide confirmar el perfil → **preview**

### 4. Esperar
La compilación ocurre en la nube de Expo y tarda **15-25 minutos**.
Al finalizar, OpenCode imprime un link de descarga tipo:

```
https://expo.dev/artifacts/eas/<hash>.apk
```

Descargar ese `.apk` y pasarlo por WhatsApp/Drive. Listo para instalar en el celular
(activar "Instalar apps de orígenes desconocidos" en Android).

---

## 📐 Datos de la compilación

- **Perfil:** `preview` (build de **release**: minimizado y firmado → APK liviano)
- **Tamaño esperado del APK:** 15-30 MB (si pesa cientos de MB, avisar: sería un build de debug)
- **Nombre de paquete:** `com.bittrack.rover`
- **Permisos:** Bluetooth (scan/connect) + ubicación solo en Android ≤ 11

---

## ⚠️ Notas importantes

- **NO usar Expo Go** para probar esta app: usa Bluetooth nativo, que Expo Go no
  incluye. La prueba real es con el APK generado.
- **No modificar** `bittrackrover.jsx` (es la referencia web).
- Si el rover no se conecta: verificar que esté **encendido** y que el ESP32 corra
  el firmware con el servicio **Nordic UART** (UUIDs `6E400001-B5A3-...`).
- Los comandos enviados por la app son texto plano: `ON`, `OFF`, `CALL`.

## 🔧 Solución de problemas

| Problema | Solución |
|---|---|
| `node no se reconoce` | Instalar Node LTS y reiniciar la terminal |
| `eas: not logged in` | Correr `npx eas-cli login` de nuevo |
| Build falla por permisos | Revisar que `app.json` tenga el plugin `react-native-ble-plx` |
| Link del APK expirado | Volver a correr el build (los links duran 30 días) |

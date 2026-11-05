/**
 * Bit-Track Rover — React Native (Expo)
 *
 * Flujo: Bienvenida -> Panel de Control (BLE)
 *   - Conectar al rover ESP32 (servicio Nordic UART)
 *   - Enviar comandos: ON / OFF / CALL
 *   - Sin login, sin base de datos, sin persistencia de datos
 *
 * La versión web de referencia está en ../bittrackrover.jsx (no se modifica).
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  StatusBar,
  Switch,
  StyleSheet,
} from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { BleManager, State } from "react-native-ble-plx";
import { encode as b64encode, decode as b64decode } from "base-64";
import { IMG1 } from "./src/img1";

/* ------------------------------------------------------------------ */
/*  PALETA (tema oscuro por defecto)                                   */
/* ------------------------------------------------------------------ */
const PALETTE = {
  dark: {
    bg: "#0b0f19", card: "#141b2d", text: "#ffffff", muted: "#94a3b8",
    border: "rgba(255,255,255,0.07)", divider: "rgba(255,255,255,0.08)",
    inputBg: "#1e293b", inputBorder: "#334155",
    accent: "#00b4d8", accentText: "#38bdf8", primary: "#0066ff",
    tabInactive: "#8a93a8", tabActive: "#00d4ff",
    itemText: "#cfe3ea", logoutBorder: "rgba(255,255,255,0.14)", logoutText: "#94a3b8",
    switchOff: "#334155", switchOn: "#00b4d8",
    statusPill: "rgba(0,180,216,0.12)",
  },
  light: {
    bg: "#f5f7fb", card: "#ffffff", text: "#0f172a", muted: "#64748b",
    border: "#e2e8f0", divider: "#e2e8f0",
    inputBg: "#f5f7fb", inputBorder: "#e2e8f0",
    accent: "#00b4d8", accentText: "#0066ff", primary: "#0066ff",
    tabInactive: "#94a3b8", tabActive: "#0066ff",
    itemText: "#334155", logoutBorder: "#e2e8f0", logoutText: "#64748b",
    switchOff: "#cbd5e1", switchOn: "#0066ff",
    statusPill: "rgba(0,102,255,0.08)",
  },
};

const GRADIENT = ["#0066ff", "#00b4d8"];
const GRADIENT_DANGER = ["#e11d48", "#be123c"];
const GRADIENT_OK = ["#22c55e", "#16a34a"];

/* ------------------------------------------------------------------ */
/*  CONFIGURACIÓN BLE (ESP32 — Nordic UART Service)                    */
/*   RX: la app ESCRIBE comandos al rover                             */
/*   TX: el rover NOTIFICA a la app                                   */
/* ------------------------------------------------------------------ */
const BLE = {
  SERVICE: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E",
  RX: "6E400002-B5A3-F393-E0A9-E50E24DCCA9E",
  TX: "6E400003-B5A3-F393-E0A9-E50E24DCCA9E",
  SCAN_TIMEOUT_MS: 15000,
  CONNECT_TIMEOUT_MS: 10000,
};
const CMD = { ON: "ON", OFF: "OFF", CALL: "CALL" };

/* Permisos de Bluetooth (Android 12+ usa SCAN/CONNECT, antes ubicación) */
async function pedirPermisosBluetooth() {
  if (Platform.OS !== "android") return true;
  const P = PermissionsAndroid.PERMISSIONS;
  if (Platform.Version >= 31) {
    const r = await PermissionsAndroid.requestMultiple([P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT]);
    return Object.values(r).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  }
  const r = await PermissionsAndroid.request(P.ACCESS_FINE_LOCATION);
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

const withTimeout = (promise, ms, msg) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);

const horaAhora = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/* ------------------------------------------------------------------ */
/*  LOGO (dibujado con react-native-svg — versión vector del sitio)    */
/* ------------------------------------------------------------------ */
function LogoIcon({ size = 34, color = "#FFB030" }) {
  return (
    <Svg width={size} height={size} viewBox="10 0 90 100" fill="none">
      <Path
        d="M 56.9 19.7 L 52.5 19.1 L 48.2 19.1 L 43.8 19.6 L 39.6 20.7 L 35.5 22.3 L 31.7 24.5 L 28.3 27.2 L 25.2 30.3 L 22.5 33.7 L 20.3 37.5 L 18.7 41.6 L 17.6 45.8 L 17.1 50.2 L 17.1 54.5 L 17.7 58.9 L 18.9 63.1 L 20.6 67.1 L 22.9 70.8 L 25.6 74.3 L 28.8 77.3 L 32.3 79.9 L 36.2 82.0 L 40.2 83.5 L 44.5 84.5 L 48.8 85.0 L 53.2 84.8 L 57.5 84.1 L 61.7 82.8 L 65.7 81.0 L 69.4 78.7 L 72.8 75.9 L 75.7 72.7 L 78.2 69.1 L 80.2 65.2 L 81.7 61.1 L 82.6 56.8 L 83.0 52.5 L 82.8 48.1 L 82.0 43.8 L 80.6 39.6"
        stroke={color} strokeWidth="6" strokeLinecap="round" fill="none"
      />
      <Path
        d="M 54.8 29.5 L 51.8 29.1 L 48.7 29.0 L 45.7 29.4 L 42.7 30.2 L 39.9 31.3 L 37.3 32.8 L 34.9 34.7 L 32.7 36.9 L 30.8 39.3 L 29.3 41.9 L 28.2 44.7 L 27.4 47.7 L 27.0 50.7 L 27.1 53.8 L 27.5 56.8 L 28.3 59.7 L 29.5 62.5 L 31.1 65.1 L 33.0 67.5 L 35.2 69.6 L 37.7 71.4 L 40.4 72.9 L 43.2 74.0 L 46.2 74.7 L 49.2 75.0 L 52.2 74.9 L 55.3 74.4 L 58.2 73.5 L 60.9 72.2 L 63.5 70.6 L 65.9 68.7 L 67.9 66.4 L 69.7 63.9 L 71.1 61.2 L 72.1 58.3 L 72.8 55.4 L 73.0 52.3 L 72.8 49.3 L 72.3 46.3 L 71.3 43.4"
        stroke={color} strokeWidth="6" strokeLinecap="round" fill="none"
      />
      <Path d="M 30.7 75.0 L 73.14 23.32" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
      <Polygon points="86,8 79.82,25.01 70.32,17.04" fill={color} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  APP PRINCIPAL                                                      */
/* ------------------------------------------------------------------ */
export default function App() {
  const [page, setPage] = useState("welcome"); // welcome | control
  const [theme, setTheme] = useState("dark");
  const t = PALETTE[theme];

  const toggleTheme = () => setTheme((x) => (x === "dark" ? "light" : "dark"));

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      {page === "welcome" ? (
        <WelcomePage t={t} theme={theme} toggleTheme={toggleTheme} onStart={() => setPage("control")} />
      ) : (
        <ControlPage t={t} theme={theme} toggleTheme={toggleTheme} onBack={() => setPage("welcome")} />
      )}
    </SafeAreaProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  BIENVENIDA                                                         */
/* ------------------------------------------------------------------ */
function WelcomePage({ t, theme, toggleTheme, onStart }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.flex, { backgroundColor: t.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={s.header}>
        <View style={s.brandRow}>
          <LogoIcon size={26} />
          <Text style={[s.brand, { color: t.text }]}>Bit-track rover</Text>
        </View>
        <ThemeSwitch theme={theme} toggleTheme={toggleTheme} t={t} />
      </View>

      <ScrollView contentContainerStyle={s.welcomeBody} contentInsetAdjustmentBehavior="never">
        <View style={[s.welcomeCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <LogoIcon size={72} />
          <Text style={[s.h1, { color: t.text }]}>Bit-Track Rover</Text>
          <Text style={[s.p, { color: t.muted }]}>Automatizá el transporte interno sin errores.</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={onStart} style={s.btnFull}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
              <Text style={s.btnText}>Iniciar</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={[s.hint, { color: t.muted }]}>
            Conexión Bluetooth con tu rover ESP32
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  PANEL DE CONTROL (BLE)                                             */
/* ------------------------------------------------------------------ */
function ControlPage({ t, theme, toggleTheme, onBack }) {
  const insets = useSafeAreaInsets();
  const managerRef = useRef(null);
  const deviceRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const txSubRef = useRef(null);
  const discSubRef = useRef(null);

  const [bleState, setBleState] = useState("unknown"); // unknown | on | off
  const [conn, setConn] = useState("idle");            // idle | scanning | connecting | connected
  const [deviceName, setDeviceName] = useState("");
  const [sending, setSending] = useState(null);        // null | CMD
  const [log, setLog] = useState([]);

  const addLog = useCallback((texto, tipo = "info") => {
    setLog((prev) => [{ id: `${Date.now()}-${Math.random()}`, hora: horaAhora(), texto, tipo }, ...prev].slice(0, 30));
  }, []);

  /* --- ciclo de vida: manager BLE + limpieza --- */
  useEffect(() => {
    const manager = new BleManager();
    managerRef.current = manager;
    const sub = manager.onStateChange((state) => {
      if (state === State.PoweredOn) setBleState("on");
      else if (state === State.PoweredOff) setBleState("off");
      else setBleState("unknown");
    }, true);

    return () => {
      sub.remove();
      clearTimeout(scanTimeoutRef.current);
      try { manager.stopDeviceScan(); } catch (e) {}
      try { txSubRef.current?.remove(); } catch (e) {}
      try { discSubRef.current?.remove(); } catch (e) {}
      try { manager.destroy(); } catch (e) {}
      managerRef.current = null;
      deviceRef.current = null;
    };
  }, []);

  const buscarRover = (manager) =>
    new Promise((resolve, reject) => {
      let encontrado = false;
      manager.startDeviceScan(null, null, (error, device) => {
        if (error) { if (!encontrado) { encontrado = true; reject(error); } return; }
        if (!device || encontrado) return;
        const uuids = (device.serviceUUIDs || []).map((u) => String(u).toUpperCase());
        const nombre = `${device.name || ""} ${device.localName || ""}`.toUpperCase();
        const match = uuids.includes(BLE.SERVICE) || /(UART|ESP|ROVER|BIT|NIMBLE)/.test(nombre);
        if (match) {
          encontrado = true;
          clearTimeout(scanTimeoutRef.current);
          try { manager.stopDeviceScan(); } catch (e) {}
          resolve(device);
        }
      });
      scanTimeoutRef.current = setTimeout(() => {
        if (encontrado) return;
        encontrado = true;
        try { manager.stopDeviceScan(); } catch (e) {}
        reject(new Error("scan-timeout"));
      }, BLE.SCAN_TIMEOUT_MS);
    });

  const conectar = async () => {
    const manager = managerRef.current;
    if (!manager || conn !== "idle") return;

    try {
      const ok = await pedirPermisosBluetooth();
      if (!ok) {
        Alert.alert("Permisos necesarios", "Autorizá el acceso a Bluetooth para encontrar el rover.");
        return;
      }

      setConn("scanning");
      addLog("Buscando rover cercano…");

      const device = await buscarRover(manager);

      setConn("connecting");
      addLog(`Encontrado: ${device.name || device.id}`, "ok");
      await withTimeout(device.connect(), BLE.CONNECT_TIMEOUT_MS, "connect-timeout");
      await withTimeout(device.discoverAllServicesAndCharacteristics(), BLE.CONNECT_TIMEOUT_MS, "discover-timeout");

      // ¿expone el servicio Nordic UART?
      const services = await device.services();
      const tieneServicio = services.some((sv) => String(sv.uuid).toUpperCase() === BLE.SERVICE);
      if (!tieneServicio) throw new Error("no-uart");

      deviceRef.current = device;
      discSubRef.current = device.onDisconnected(() => {
        if (deviceRef.current === device) {
          deviceRef.current = null;
          setConn("idle");
          setDeviceName("");
          addLog("Se perdió la conexión", "err");
        }
      });
      txSubRef.current = device.monitorCharacteristicForService(BLE.SERVICE, BLE.TX, (error, ch) => {
        if (error || !ch || !ch.value) return;
        try { addLog(`Rover: ${b64decode(ch.value)}`, "rx"); } catch (e) {}
      });

      setDeviceName(device.name || device.id);
      setConn("connected");
      addLog("Conectado al rover ✓", "ok");
    } catch (e) {
      setConn("idle");
      const msg = e && e.message;
      if (msg === "scan-timeout") {
        addLog("No se encontró el rover", "err");
        Alert.alert("Sin rover", "No se encontró ningún rover cercano. Revisá que esté encendido.");
      } else if (msg === "connect-timeout" || msg === "discover-timeout") {
        addLog("Tiempo agotado al conectar", "err");
        Alert.alert("Sin respuesta", "El rover no respondió a tiempo. Revisá que esté encendido.");
      } else if (msg === "no-uart") {
        addLog("El dispositivo no expone el servicio UART", "err");
        Alert.alert("Servicio no encontrado", "El dispositivo encontrado no tiene el servicio UART del rover.");
      } else {
        addLog(`Error: ${msg || "desconocido"}`, "err");
        Alert.alert("Error de conexión", String(msg || "No se pudo conectar."));
      }
    }
  };

  const desconectar = async () => {
    const device = deviceRef.current;
    setConn("idle");
    deviceRef.current = null;
    setDeviceName("");
    try { txSubRef.current?.remove(); } catch (e) {}
    try { discSubRef.current?.remove(); } catch (e) {}
    txSubRef.current = null;
    discSubRef.current = null;
    if (device) {
      try { await device.cancelConnection(); } catch (e) {}
      addLog("Desconectado", "info");
    }
  };

  const enviar = async (cmd) => {
    const device = deviceRef.current;
    if (!device || conn !== "connected") {
      Alert.alert("Sin conexión", "Conectate al rover antes de enviar una orden.");
      return;
    }
    if (sending) return;
    setSending(cmd);
    try {
      await withTimeout(
        device.writeCharacteristicWithResponseForDevice(BLE.SERVICE, BLE.RX, b64encode(cmd)),
        5000,
        "write-timeout"
      );
      addLog(`Orden enviada: ${cmd}`, "tx");
    } catch (e) {
      addLog(`Error al enviar ${cmd}`, "err");
      Alert.alert("Error", "No se pudo enviar la orden al rover.");
    } finally {
      setSending(null);
    }
  };

  /* --- UI --- */
  const conectado = conn === "connected";
  const ocupado = conn === "scanning" || conn === "connecting";
  const estadoTexto =
    conectado ? "Conectado" :
    conn === "scanning" ? "Escaneando…" :
    conn === "connecting" ? "Conectando…" :
    bleState === "off" ? "Bluetooth apagado" : "Sin conectar";
  const estadoColor = conectado ? "#22c55e" : conn === "idle" && bleState === "off" ? "#ef4444" : "#f59e0b";

  return (
    <View style={[s.flex, { backgroundColor: t.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
      {/* header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7}>
          <Text style={[s.backText, { color: t.accentText }]}>‹ Atrás</Text>
        </TouchableOpacity>
        <View style={s.brandRow}>
          <LogoIcon size={22} />
          <Text style={[s.brand, { color: t.text }]}>Bit-track rover</Text>
        </View>
        <ThemeSwitch theme={theme} toggleTheme={toggleTheme} t={t} />
      </View>

      <ScrollView contentContainerStyle={[s.controlBody, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={[s.pageTitle, { color: t.muted }]}>PANEL DE CONTROL</Text>

        {/* --- tarjeta de estado --- */}
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={s.rowBetween}>
            <View style={s.rowCenter}>
              <View style={[s.dot, { backgroundColor: estadoColor }]} />
              <View>
                <Text style={[s.cardLabel, { color: t.muted }]}>Estado actual</Text>
                <Text style={[s.estadoValor, { color: t.text }]}>{estadoTexto}</Text>
              </View>
            </View>
            {conectado && (
              <View style={[s.pill, { backgroundColor: t.statusPill }]}>
                <Text style={[s.pillText, { color: t.accentText }]} numberOfLines={1}>
                  {deviceName}
                </Text>
              </View>
            )}
          </View>

          {conectado ? (
            <TouchableOpacity activeOpacity={0.8} onPress={desconectar} style={s.btnFull}>
              <View style={[s.btnOutline, { borderColor: t.logoutBorder }]}>
                <Text style={[s.btnOutlineText, { color: t.logoutText }]}>Desconectar</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.8} onPress={conectar} disabled={ocupado} style={s.btnFull}>
              <LinearGradient
                colors={GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.btn, ocupado && { opacity: 0.7 }]}
              >
                {ocupado && <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />}
                <Text style={s.btnText}>
                  {conn === "scanning" ? "Buscando rover…" : conn === "connecting" ? "Conectando…" : "Conectar rover"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* --- órdenes --- */}
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[s.cardLabel, { color: t.muted, marginBottom: 14 }]}>ÓRDENES AL ROVER</Text>

          <View style={s.rowBetween}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!conectado || !!sending}
              onPress={() => enviar(CMD.ON)}
              style={[s.halfBtn, (!conectado || sending) && s.disabled]}
            >
              <LinearGradient colors={GRADIENT_OK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
                {sending === CMD.ON ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Encender</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!conectado || !!sending}
              onPress={() => enviar(CMD.OFF)}
              style={[s.halfBtn, (!conectado || sending) && s.disabled]}
            >
              <LinearGradient colors={GRADIENT_DANGER} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
                {sending === CMD.OFF ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Apagar</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!conectado || !!sending}
            onPress={() => enviar(CMD.CALL)}
            style={[s.btnFull, { marginTop: 12 }, (!conectado || sending) && s.disabled]}
          >
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.btn, s.btnCall]}>
              {sending === CMD.CALL ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Llamar al rover</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {!conectado && (
            <Text style={[s.hint, { color: t.muted, marginTop: 12 }]}>
              Conectate al rover para habilitar los controles.
            </Text>
          )}
        </View>

        {/* --- imagen rover --- */}
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.border, padding: 0, overflow: "hidden" }]}>
          <Image source={{ uri: IMG1 }} style={s.roverImg} resizeMode="cover" />
        </View>

        {/* --- actividad --- */}
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[s.cardLabel, { color: t.muted, marginBottom: 8 }]}>ACTIVIDAD</Text>
          {log.length === 0 ? (
            <Text style={[s.hint, { color: t.muted, marginTop: 0 }]}>Todavía no hay movimiento.</Text>
          ) : (
            log.map((item) => (
              <View key={item.id} style={[s.logRow, { borderBottomColor: t.divider }]}>
                <View
                  style={[
                    s.logDot,
                    {
                      backgroundColor:
                        item.tipo === "err" ? "#ef4444" :
                        item.tipo === "ok" ? "#22c55e" :
                        item.tipo === "tx" ? "#00b4d8" :
                        item.tipo === "rx" ? "#a855f7" : t.muted,
                    },
                  ]}
                />
                <Text style={[s.logTexto, { color: t.itemText }]} numberOfLines={2}>{item.texto}</Text>
                <Text style={[s.logHora, { color: t.muted }]}>{item.hora}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  SWITCH DE TEMA                                                     */
/* ------------------------------------------------------------------ */
function ThemeSwitch({ theme, toggleTheme, t }) {
  return (
    <View style={s.switchRow}>
      <Text style={[s.switchLabel, { color: t.muted }]}>
        {theme === "dark" ? "Oscuro" : "Claro"}
      </Text>
      <Switch
        value={theme === "dark"}
        onValueChange={toggleTheme}
        trackColor={{ false: t.switchOff, true: t.switchOn }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  ESTILOS                                                            */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { fontSize: 15, fontWeight: "700" },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { fontSize: 16, fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  switchLabel: { fontSize: 12, fontWeight: "600" },

  /* bienvenida */
  welcomeBody: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  welcomeCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    paddingVertical: 44,
    paddingHorizontal: 28,
    alignItems: "center",
    borderWidth: 1,
  },
  h1: { fontSize: 27, fontWeight: "800", marginTop: 20, marginBottom: 8, letterSpacing: -0.5, textAlign: "center" },
  p: { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 28 },
  hint: { fontSize: 12.5, textAlign: "center", marginTop: 16, opacity: 0.8 },

  /* botones */
  btnFull: { width: "100%" },
  btn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCall: { height: 56 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15.5 },
  btnOutline: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  btnOutlineText: { fontWeight: "600", fontSize: 15 },
  halfBtn: { flex: 1, marginRight: 8 },
  disabled: { opacity: 0.45 },

  /* control */
  controlBody: { paddingHorizontal: 16, gap: 14 },
  pageTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 1.5, marginTop: 4 },
  card: { borderRadius: 18, padding: 18, borderWidth: 1 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  cardLabel: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.8 },
  estadoValor: { fontSize: 18, fontWeight: "700", marginTop: 3 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, maxWidth: "48%" },
  pillText: { fontSize: 12, fontWeight: "700" },
  roverImg: { width: "100%", height: 170 },

  /* actividad */
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logTexto: { flex: 1, fontSize: 13.5 },
  logHora: { fontSize: 11.5, fontVariant: ["tabular-nums"] },
});

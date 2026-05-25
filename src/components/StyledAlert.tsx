import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type AlertVariant = "success" | "error" | "confirm" | "info";

interface AlertOptions {
  variant: AlertVariant;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function useStyledAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useStyledAlert must be used within AlertProvider");
  return ctx.showAlert;
}

const ICONS: Record<AlertVariant, any> = {
  success: "check-circle",
  error: "close-circle",
  confirm: "help-circle",
  info: "information",
};

const COLORS: Record<AlertVariant, string> = {
  success: "#08A045",
  error: "#D62839",
  confirm: "#003B82",
  info: "#3498DB",
};

function AlertModal({
  visible,
  options,
  onClose,
}: {
  visible: boolean;
  options: AlertOptions;
  onClose: () => void;
}) {
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 250 });
      cardOpacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 14, stiffness: 150 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      cardOpacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
    }
  }, [visible, backdropOpacity, cardOpacity, scale]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const color = COLORS[options.variant];

  const handleConfirm = () => {
    onClose();
    setTimeout(() => options.onConfirm?.(), 200);
  };

  const handleCancel = () => {
    onClose();
    setTimeout(() => options.onCancel?.(), 200);
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleCancel}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={[styles.iconCircle, { backgroundColor: color + "14" }]}>
            <MaterialCommunityIcons name={ICONS[options.variant]} size={30} color={color} />
          </View>

          <Text style={styles.title}>{options.title}</Text>

          {options.message ? (
            <Text style={styles.message}>{options.message}</Text>
          ) : null}

          <View style={styles.buttonsRow}>
            {options.variant === "confirm" ? (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnCancelText}>
                    {options.cancelText || "Cancelar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnConfirm, { backgroundColor: "#D62839" }]}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnConfirmText}>
                    {options.confirmText || "Aceptar"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : options.variant === "info" && options.onConfirm ? (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnCancelText}>
                    {options.cancelText || "Cancelar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnConfirm, { backgroundColor: color }]}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnConfirmText}>
                    {options.confirmText || "Aceptar"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.btn, styles.btnFull, { backgroundColor: color }]}
                onPress={handleConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.btnConfirmText}>
                  {options.confirmText || "Entendido"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const queueRef = useRef<AlertOptions[]>([]);
  const processingRef = useRef(false);

  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) {
      if (queueRef.current.length === 0) processingRef.current = false;
      return;
    }
    processingRef.current = true;
    const next = queueRef.current.shift()!;
    setOptions(next);
    setVisible(true);
  }, []);

  const showAlert = useCallback((opts: AlertOptions) => {
    if (visible) {
      queueRef.current.push(opts);
    } else {
      queueRef.current.push(opts);
      processQueue();
    }
  }, [visible, processQueue]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => processQueue(), 300);
  }, [processQueue]);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {options && (
        <AlertModal visible={visible} options={options} onClose={handleClose} />
      )}
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 11, 45, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 28,
    width: SCREEN_WIDTH - 64,
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B356C",
    textAlign: "center",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnFull: {
    flex: 2,
  },
  btnCancel: {
    backgroundColor: "#F3F4F6",
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },
  btnConfirm: {},
  btnConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
});

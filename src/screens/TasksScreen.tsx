import { View, Text, StyleSheet } from "react-native";

const COLORS = { dark: "#003D66", light: "#f5f5f5", gray: "#666666" };

export default function TasksScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tareas</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>Próximamente</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  header: {
    backgroundColor: COLORS.dark,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 16, color: COLORS.gray },
});

import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.eyebrow}>CUSTOMER MOBILE</Text>
        <Text style={styles.title}>BookFlow in your pocket.</Text>
        <Text style={styles.description}>
          Expo Router is ready for discovery, booking, signed QR and realtime
          queue features.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },
  title: {
    color: "#0f172a",
    fontSize: 46,
    fontWeight: "700",
    lineHeight: 50,
    marginTop: 16,
  },
  description: {
    color: "#475569",
    fontSize: 18,
    lineHeight: 28,
    marginTop: 20,
  },
});

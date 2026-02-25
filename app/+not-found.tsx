import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found", headerStyle: { backgroundColor: '#07071a' }, headerTintColor: '#00ffcc' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Return to game</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: '#07071a',
  },
  title: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: '#e0e0ff',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: "#00ffcc",
  },
});

import React, { useEffect, useState } from "react";
import { View, StyleSheet, Share } from "react-native";
import { Card, List, IconButton, Text, Snackbar } from "react-native-paper";
import { loadPins, savePins } from "../storage";

export default function PinsScreen() {
  const [pins, setPins] = useState([]);
  const [snack, setSnack] = useState("");

  useEffect(() => {
    // TODO(5): Load saved pins into state on mount
    const fetchPins = async () => {
      const savedPins = await loadPins();
      setPins(savedPins);
    };
    fetchPins();
  }, []);

  const remove = async (id) => {
    // TODO(6): Delete pin by id and persist via savePins(next)
    const next = pins.filter((p) => p.id !== id);
    setPins(next);
    setSnack("TODO: delete pin");
  };

  const sharePin = async (p) => {
    // TODO(7): Share pin location nicely (include timestamp if you like)
    const message = `Pin Location:\nLatitude: ${Number(p.lat).toFixed(
      6
    )}\nLongitude: ${Number(p.lon).toFixed(6)}\nTimestamp: ${new Date(
      p.ts
    ).toLocaleString()}`;
    await Share.share({ message });

    setSnack("TODO: share pin");
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Saved Pins" />
        <Card.Content>
          {pins.length === 0 ? (
            <Text>No pins yet. Drop one from Compass.</Text>
          ) : (
            <List.Section>
              {pins.map((p) => (
                <List.Item
                  key={p.id}
                  title={`${Number(p.lat).toFixed(6)}, ${Number(p.lon).toFixed(
                    6
                  )}`}
                  description={new Date(p.ts).toLocaleString()}
                  left={(props) => <List.Icon {...props} icon="map-marker" />}
                  right={() => (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <IconButton
                        icon="share-variant"
                        onPress={() => sharePin(p)}
                      />
                      <IconButton icon="delete" onPress={() => remove(p.id)} />
                    </View>
                  )}
                />
              ))}
            </List.Section>
          )}
        </Card.Content>
      </Card>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack("")}
        duration={1200}
      >
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 16 },
});

import React, { useEffect, useState } from "react";
import { View, StyleSheet, Share, Animated, Easing } from "react-native";
import {
  Appbar,
  Card,
  Text,
  Button,
  Snackbar,
  IconButton,
  Chip,
} from "react-native-paper";
import * as Location from "expo-location";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { fmt, toCardinal, nowISO } from "../utils/geo";
import { loadPins, savePins } from "../storage";

export default function CompassScreen({ navigation }) {
  const [heading, setHeading] = useState(null);
  const [coords, setCoords] = useState(null);
  const [pins, setPins] = useState([]);
  const [snack, setSnack] = useState("");
  const [bob] = useState(() => new Animated.Value(0)); // given

  // TODO(1): Ask for location permission, get initial position, and start heading watcher
  useEffect(() => {
    let headingSub = null;
    let mounted = true;

    const askForPermission = async () => {
      // TODO a) Ask for location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted"){
        console.log('the permission is denied');
        return;
      }

      // TODO b) Get One-time position and save the coordinates

      const position = await Location.getCurrentPositionAsync({})
      if (mounted) {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      }
       headingSub = await Location.watchHeadingAsync(({ trueHeading }) => {
        if (!mounted) return;
        if (typeof trueHeading === "number") setHeading(trueHeading);
      });

      // TODO c) Load saved pins

      const saved = await loadPins();
      if (mounted){
        setPins(saved)
      }
    };

    askForPermission();

     return () => {
      mounted = false;
      headingSub?.remove?.();
    };
  }, []);

   useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

   const pointsForHeading = (deg = 0) => {
    const rad = (deg * Math.PI) / 180;
    const vx = Math.sin(rad);
    const vy = -Math.cos(rad);
    const k = 0.45;
    const sx = 0.5 - k * vx;
    const sy = 0.5 - k * vy;
    const ex = 0.5 + k * vx;
    const ey = 0.5 + k * vy;
    const clamp = (v) => Math.max(0, Math.min(1, v));
    return {
      start: { x: clamp(sx), y: clamp(sy) },
      end: { x: clamp(ex), y: clamp(ey) },
    };
  };

  const dropPin = async () => {
    if (!coords) {
      setSnack("No GPS fix yet");
      return;
    }
    // TODO(2): push new pin {id, lat, lon, heading, ts} to state and savePins(next)
    const newPin = {
      id : Date.now().toString(),
      lat: coords.latitude,
      lon: coords.longitude,
      heading: heading,
      ts: nowISO(),
    }
    const nextPins = [newPin,...pins];
    setPins(nextPins)
    await savePins(nextPins);
    setSnack("the pin is saved");
  };

  const copyCoords = async () => {
    if (!coords) {
      setSnack("TODO: copy coords");
      return;
    }
    // TODO(3): Clipboard.setStringAsync("lat, lon") then snackbar
    const lat = coords.latitude.toFixed(6) 
    const lon = coords.longitude.toFixed(6)
    const formattedCoords =  `${lat}, ${lon}`;

    await Clipboard.setStringAsync(formattedCoords)
    setSnack("Coordinates are copied to clipboard");
  };

  const shareCoords = async () => {
    if (!coords) {
      setSnack("TODO: share");
      return;
    }
    // TODO(4): Share.share with message including coords + heading + cardinal
    const lat = coords.latitude.toFixed(6)
    const lon = coords.longitude.toFixed(6)
    const cardinal = toCardinal(heading ?? 0);
    const degrees = heading != null ? `${Math.round(heading)}°` : "—";

    const message = `I am here: ${lat},${lon} (${cardinal} at ${degrees})`;

    try {
      await Share.share({
        message: message,
      })
      setSnack("Share Initiated");
    } catch (error) {
      setSnack("Error sharing coordinates")
      console.log({message: error.message});
    }

  };

   const { start, end } = pointsForHeading(((heading ?? 0) + 180) % 360);
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <>
      <Appbar.Header>
        <Appbar.Content title="Gradient Compass" />
        <Appbar.Action
          icon="map-marker"
          onPress={() => navigation.navigate("Pins")}
        />
      </Appbar.Header>

      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content style={styles.center}>
            <Animated.View
              style={[styles.gradWrap, { transform: [{ translateY: bobY }] }]}
            >
              <LinearGradient
                start={start}
                end={end}
                colors={["#00D2FF", "#3A7BD5", "#1E3C72"]}
                style={styles.gradient}
              />
            </Animated.View>

            <Text variant="displaySmall" style={styles.headingText}>
              {heading != null ? `${Math.round(heading)}°` : "—"}
            </Text>
            <Chip>{toCardinal(heading ?? 0)}</Chip>

            <View style={styles.actionsRow}>
              <Button onPress={dropPin}>Save</Button>
              <Button onPress={copyCoords}>Copy</Button>
              <IconButton icon="share-variant" onPress={shareCoords} />
            </View>
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack("")}
        duration={1200}
      >
        {snack}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 16 },
  center: { alignItems: "center", gap: 12, paddingVertical: 20 },
  gradWrap: {
    width: 180,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
  },
  gradient: { flex: 1 },
  headingText: { fontWeight: "700" },
  coords: { opacity: 0.8, marginTop: 6, letterSpacing: 0.5 },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    alignItems: "center",
  },
});
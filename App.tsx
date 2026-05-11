import { Text, View, Button, Image, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { supabase } from "./lib/supabase";

export default function App() {
  const [image, setImage] = useState<string | null>(null);

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission is required!");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery permission is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const saveToSupabase = async () => {
    if (!image) {
      Alert.alert("No image!", "Please take or pick an image first.");
      return;
    }

    try {
      // Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission is required!");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const latitude = location.coords.latitude.toString();
      const longitude = location.coords.longitude.toString();

      // Upload image to Supabase Storage
      const fileName = `photo-${Date.now()}.jpeg`;
      const response = await fetch(image);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(`camera/${fileName}`, arrayBuffer, {
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(`camera/${fileName}`);

      const image_url = urlData.publicUrl;

      // Insert to photo table
      const { error: insertError } = await supabase
        .from("photo")
        .insert([{ latitude, longitude, image_url }]);

      if (insertError) throw insertError;

      Alert.alert("Berhasil!", "Foto dan lokasi berhasil disimpan ke Supabase!");
    } catch (error: any) {
      Alert.alert("Gagal!", error?.message ?? "Terjadi kesalahan.");
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Meylani - 00000098358</Text>

      <View style={styles.button}>
        <Button title="OPEN CAMERA" onPress={openCamera} />
      </View>

      <View style={styles.button}>
        <Button title="OPEN GALLERY" onPress={openGallery} />
      </View>

      {image && (
        <View style={styles.button}>
          <Button title="SAVE TO SUPABASE" onPress={saveToSupabase} color="green" />
        </View>
      )}

      {image && (
        <Image source={{ uri: image }} style={styles.image} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginBottom: 10,
  },
  button: {
    marginVertical: 5,
    width: 200,
  },
  image: {
    width: 250,
    height: 200,
    marginTop: 20,
  },
});
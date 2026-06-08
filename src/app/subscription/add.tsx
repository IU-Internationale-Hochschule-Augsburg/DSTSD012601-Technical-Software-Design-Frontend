import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, useTheme, SegmentedButtons, Text, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import {CATEGORY_LABELS, SubscriptionCategory} from '../../types';
import { generateId } from '../../utils/formatters';
import {AutocompleteDropdown} from "react-native-autocomplete-dropdown";
import HomeScreen from "@/app";

export default function AddSubscriptionScreen() {
  const { addSubscription } = useSubscriptions();
  const theme = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<SubscriptionCategory>(SubscriptionCategory.OTHER);
  const [amount, setAmount] = useState('');
  const [paymentDay, setPaymentDay] = useState('1');
  const [cancellationPeriod, setCancellationPeriod] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name || !amount || !paymentDay) {
      setError('Bitte alle Pflichtfelder (Name, Betrag, Zahltag) ausfüllen.');
      return;
    }

    setLoading(true);
    try {
      await addSubscription({
        id: generateId(),
        name,
        category,
        cancellationPeriod: cancellationPeriod || 'Nicht angegeben',
        paymentDay: parseInt(paymentDay, 10),
        amount: parseFloat(amount.replace(',', '.')),
        currency: 'EUR',
        isTrialPeriod: false,
        nextPaymentDate: new Date().toISOString(), // Mock value
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      router.navigate('/(tabs)',{});
    } catch (e) {
      setError('Fehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
         <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
           Neues Abo hinzufügen
         </Text>

         <TextInput
            mode="outlined"
            label="Name des Abos *"
            value={name}
            onChangeText={setName}
            style={styles.input}
         />

         <TextInput
            mode="outlined"
            label="Betrag (€) *"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={styles.input}
         />

         <TextInput
            mode="outlined"
            label="Zahltag (1-31) *"
            value={paymentDay}
            onChangeText={setPaymentDay}
            keyboardType="number-pad"
            style={styles.input}
         />

         <TextInput
            mode="outlined"
            label="Kündigungsfrist (z.B. 1 Monat)"
            value={cancellationPeriod}
            onChangeText={setCancellationPeriod}
            style={styles.input}
         />

         {/* Simplistic Category Selection */}
         <Text variant="labelMedium" style={{ marginBottom: 8, marginTop: 8, width: ' 100%' }}>Kategorie</Text>
             <AutocompleteDropdown
                 clearOnFocus={false}
                 closeOnBlur={true}
                 closeOnSubmit={false}
                 initialValue={{ id: '2' }} // Example initial value
                 onSelectItem={(val: any) => setCategory(val as SubscriptionCategory)}
                 dataSet={[
                     { id: '1', title: CATEGORY_LABELS[SubscriptionCategory.STREAMING] },
                     { id: '2', title: CATEGORY_LABELS[SubscriptionCategory.MUSIC] },
                     { id: '3', title: CATEGORY_LABELS[SubscriptionCategory.SOFTWARE] },
                     { id: '4', title: CATEGORY_LABELS[SubscriptionCategory.FITNESS] },
                     { id: '5', title: CATEGORY_LABELS[SubscriptionCategory.FOOD] },
                     { id: '6', title: CATEGORY_LABELS[SubscriptionCategory.INSURANCE] },
                     { id: '7', title: CATEGORY_LABELS[SubscriptionCategory.PHONE] },
                     { id: '8', title: CATEGORY_LABELS[SubscriptionCategory.INTERNET] },
                     { id: '9', title: CATEGORY_LABELS[SubscriptionCategory.CLOUD] },
                     { id: '10', title: CATEGORY_LABELS[SubscriptionCategory.GAMING] },
                     { id: '11', title: CATEGORY_LABELS[SubscriptionCategory.NEWS] },
                     { id: '12', title: CATEGORY_LABELS[SubscriptionCategory.OTHER] },
                 ]}
             />

         <View style={styles.buttonRow}>
            <Button mode="text" onPress={() => router.back()} style={styles.button}>
               Abbrechen
            </Button>
            <Button mode="contained" onPress={handleSave} loading={loading} style={styles.button}>
               Speichern
            </Button>
         </View>

         <Snackbar visible={!!error} onDismiss={() => setError(null)}>
           {error}
         </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    marginLeft: 16,
  }
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, useTheme, SegmentedButtons, Text, Snackbar } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import {CATEGORY_LABELS, SubscriptionCategory} from '../../types';
import {AutocompleteDropdown} from "react-native-autocomplete-dropdown";

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subscriptions, updateSubscription, deleteSubscription } = useSubscriptions();
  const theme = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<SubscriptionCategory>(SubscriptionCategory.OTHER);
  const [amount, setAmount] = useState('');
  const [paymentDay, setPaymentDay] = useState('');
  const [cancellationPeriod, setCancellationPeriod] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sub = subscriptions.find(s => s.id === id);
    if (sub) {
      setName(sub.name);
      setCategory(sub.category);
      setAmount(sub.amount.toString());
      setPaymentDay(sub.paymentDay.toString());
      setCancellationPeriod(sub.cancellationPeriod);
    }
  }, [id, subscriptions]);

  const handleUpdate = async () => {
    if (!name || !amount || !paymentDay) {
      setError('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }

    setLoading(true);
    try {
      await updateSubscription(id, {
        name,
        category,
        cancellationPeriod: cancellationPeriod,
        paymentDay: parseInt(paymentDay, 10),
        amount: parseFloat(amount.replace(',', '.')),
      });
      router.back();
    } catch (e) {
      setError('Fehler beim Aktualisieren.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
     try {
       await deleteSubscription(id);
       router.back();
     } catch (e) {
       setError('Fehler beim Löschen.');
     }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
         <View style={styles.header}>
           <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
             Abo bearbeiten
           </Text>
           <Button icon="delete" textColor={theme.colors.error} onPress={handleDelete}>
             Löschen
           </Button>
         </View>

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
            label="Kündigungsfrist"
            value={cancellationPeriod}
            onChangeText={setCancellationPeriod}
            style={styles.input}
         />

         <Text variant="labelMedium" style={{ marginBottom: 8, marginTop: 8 }}>Kategorie</Text>
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
            <Button mode="contained" onPress={handleUpdate} loading={loading} style={styles.button}>
               Aktualisieren
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

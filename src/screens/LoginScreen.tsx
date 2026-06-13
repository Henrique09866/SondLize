import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS, SIZES, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

export const LoginScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuthStore();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não conferem.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e: any) {
      const msg =
        e?.code === 'auth/user-not-found'
          ? 'Usuário não encontrado.'
          : e?.code === 'auth/wrong-password'
            ? 'Senha incorreta.'
            : e?.code === 'auth/email-already-in-use'
              ? 'Este email já está cadastrado.'
              : e?.code === 'auth/invalid-credential'
                ? 'Email ou senha inválidos.'
                : e?.message ?? 'Erro desconhecido.';
      Alert.alert('Erro', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Image
          source={require('../../assets/images/sondlize-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>
          {isSignUp ? 'Criar conta' : 'Entrar'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.text.tertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={COLORS.text.tertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="Confirmar senha"
            placeholderTextColor={COLORS.text.tertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? 'Cadastrar' : 'Entrar'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setIsSignUp(!isSignUp);
            setConfirmPassword('');
          }}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Já tem conta? Entrar'
              : 'Não tem conta? Cadastre-se'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.base,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  logo: {
    width: '100%',
    height: 120,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.display,
    color: COLORS.accent.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  input: {
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.bg.input,
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  button: {
    backgroundColor: COLORS.accent.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.heightMd,
    marginTop: SPACING.sm,
  },
  buttonText: {
    ...TYPOGRAPHY.title,
    color: COLORS.text.inverse,
    fontWeight: '700',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  toggleText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
});

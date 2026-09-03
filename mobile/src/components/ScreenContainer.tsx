import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  withTopInset?: boolean;
  withBottomInset?: boolean;
  keyboardAvoiding?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  withTopInset = true,
  withBottomInset = true,
  keyboardAvoiding = false,
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: withTopInset ? insets.top : 0,
    paddingBottom: withBottomInset ? insets.bottom : 0,
  };

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={[styles.base, containerStyle, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        {children}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.base, containerStyle, style]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});

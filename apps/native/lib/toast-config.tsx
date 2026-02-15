import React from 'react';
import {
  BaseToast,
  ErrorToast,
  InfoToast,
  ToastConfig,
} from 'react-native-toast-message';

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#20A885', // green-1
        backgroundColor: '#1F1F1F', // black-2
        borderLeftWidth: 5,
        height: 60,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
      }}
      text2Style={{
        fontSize: 13,
        color: '#D1D5DB',
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#EF4444', // destructive red
        backgroundColor: '#1F1F1F', // black-2
        borderLeftWidth: 5,
        height: 60,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
      }}
      text2Style={{
        fontSize: 13,
        color: '#D1D5DB',
      }}
    />
  ),
  info: (props) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: '#2E7FD6', // blue-1
        backgroundColor: '#1F1F1F', // black-2
        borderLeftWidth: 5,
        height: 60,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
      }}
      text2Style={{
        fontSize: 13,
        color: '#D1D5DB',
      }}
    />
  ),
};

import React from 'react';
import {
  BaseToast,
  ErrorToast,
  InfoToast,
  ToastConfig,
} from 'react-native-toast-message';
import { AntDesign } from '@expo/vector-icons';

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#000000', // green-1
        backgroundColor: '#000000', // black-2
        borderLeftWidth: 5,
        borderRadius: 24,
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
      renderLeadingIcon={() => (
        <AntDesign
          name="check-circle"
          size={24}
          color="#20A885"
          style={{ marginLeft: 15 }}
        />
      )}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#000000', // destructive red
        backgroundColor: '#000000', // black-2
        borderLeftWidth: 5,
        borderRadius: 24,
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
      renderLeadingIcon={() => (
        <AntDesign
          name="close-circle"
          size={24}
          color="#EF4444"
          style={{ marginLeft: 15, paddingTop: 15 }}
        />
      )}
    />
  ),
  info: (props) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: '#2E7FD6', // blue-1
        backgroundColor: '#1F1F1F', // black-2
        borderLeftWidth: 5,
        borderRadius: 8,
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
      renderLeadingIcon={() => (
        <AntDesign
          name="info-circle"
          size={24}
          color="#2E7FD6"
          style={{ marginLeft: 15 }}
        />
      )}
    />
  ),
};

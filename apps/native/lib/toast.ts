import Toast from 'react-native-toast-message';

export const showToast = {
  success: (message: string, description?: string) => {
    Toast.show({
      type: 'success',
      text1: message,
      text2: description,
      position: 'top',
      visibilityTime: 3000,
    });
  },
  error: (message: string, description?: string) => {
    Toast.show({
      type: 'error',
      text1: message,
      text2: description,
      position: 'top',
      visibilityTime: 4000,
    });
  },
  info: (message: string, description?: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      text2: description,
      position: 'top',
      visibilityTime: 3000,
    });
  },
};

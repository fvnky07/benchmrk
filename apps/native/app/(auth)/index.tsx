// NOTE: Auth index redirects to login by default
import { Redirect } from 'expo-router';

export default function AuthIndex() {
  return <Redirect href="/(auth)/welcome" />;
}

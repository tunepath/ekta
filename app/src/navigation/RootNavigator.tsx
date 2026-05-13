import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SplashScreen } from '@/features/splash/SplashScreen';
import { SignInScreen } from '@/features/auth/screens/SignInScreen';
import { KioskIdentityScreen } from '@/features/kioskSetup/screens/KioskIdentityScreen';
import { PinSetupScreen } from '@/features/pin/screens/PinSetupScreen';
import { PinScreen } from '@/features/pin/screens/PinScreen';
import { ForgotPinScreen } from '@/features/pin/screens/ForgotPinScreen';
import { IdleScreen } from '@/features/kiosk/screens/IdleScreen';
import { PunchSuccessScreen } from '@/features/kiosk/screens/PunchSuccessScreen';
import { PunchFailureScreen } from '@/features/kiosk/screens/PunchFailureScreen';
import { AdminMenuScreen } from '@/features/admin/screens/AdminMenuScreen';
import { EnrollFaceScreen } from '@/features/admin/screens/EnrollFaceScreen';
import { SettingsScreen } from '@/features/admin/screens/SettingsScreen';
import { ChangePinScreen } from '@/features/admin/screens/ChangePinScreen';
import { CameraSettingsScreen } from '@/features/admin/screens/CameraSettingsScreen';
import { SoundSettingsScreen } from '@/features/admin/screens/SoundSettingsScreen';
import { ReTagLocationScreen } from '@/features/admin/screens/ReTagLocationScreen';
import { AdvancedSettingsScreen } from '@/features/admin/screens/AdvancedSettingsScreen';
import { AboutScreen } from '@/features/admin/screens/AboutScreen';
import { LogoutScreen } from '@/features/admin/screens/LogoutScreen';
import { ConsentBiometricScreen } from '@/features/consent/ConsentBiometricScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="KioskIdentity" component={KioskIdentityScreen} />
      <Stack.Screen name="ConsentBiometric" component={ConsentBiometricScreen} />
      <Stack.Screen name="PinSetup" component={PinSetupScreen} />
      <Stack.Screen name="Pin" component={PinScreen} />
      <Stack.Screen name="ForgotPin" component={ForgotPinScreen} />
      <Stack.Screen name="Idle" component={IdleScreen} />
      <Stack.Screen
        name="PunchSuccess"
        component={PunchSuccessScreen}
        options={{ animation: 'fade', presentation: 'transparentModal' }}
      />
      <Stack.Screen name="PunchFailure" component={PunchFailureScreen} />
      <Stack.Screen name="AdminMenu" component={AdminMenuScreen} />
      <Stack.Screen name="EnrollFace" component={EnrollFaceScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ChangePin" component={ChangePinScreen} />
      <Stack.Screen name="CameraSettings" component={CameraSettingsScreen} />
      <Stack.Screen name="SoundSettings" component={SoundSettingsScreen} />
      <Stack.Screen name="ReTagLocation" component={ReTagLocationScreen} />
      <Stack.Screen name="AdvancedSettings" component={AdvancedSettingsScreen} />
      <Stack.Screen name="AboutScreen" component={AboutScreen} />
      <Stack.Screen name="Logout" component={LogoutScreen} />
    </Stack.Navigator>
  );
}

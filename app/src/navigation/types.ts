export type RootStackParamList = {
  Splash: undefined;
  SignIn: undefined;
  KioskIdentity: undefined;
  PinSetup: undefined;
  Idle: undefined;
  Pin: undefined;
  ForgotPin: undefined;
  AdminMenu: undefined;
  EnrollFace: undefined;
  Settings: undefined;
  ChangePin: undefined;
  CameraSettings: undefined;
  SoundSettings: undefined;
  ReTagLocation: undefined;
  AdvancedSettings: undefined;
  AboutScreen: undefined;
  Logout: undefined;
  PunchSuccess: {
    type: 'in' | 'out';
    employeeName: string;
    employeeCode: string;
    employeePhotoUrl: string | null;
    ts: string;
    location: string;
    shift_name: string | null;
    on_time: boolean | null;
    today_minutes?: number;
  };
  PunchFailure: { reason: string };
  ConsentBiometric: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

import { NativeModule, requireNativeModule } from 'expo';

declare class SecureEscapeScreenRecorderModule extends NativeModule<{}> {}

export default requireNativeModule<SecureEscapeScreenRecorderModule>('SecureEscapeScreenRecorder');

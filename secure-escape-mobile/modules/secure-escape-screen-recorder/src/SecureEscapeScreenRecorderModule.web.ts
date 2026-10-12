import { registerWebModule, NativeModule } from 'expo';

// SecureEscapeScreenRecorderModule is not available on the web platform.
class SecureEscapeScreenRecorderModule extends NativeModule<{}> {}

export default registerWebModule(SecureEscapeScreenRecorderModule, 'SecureEscapeScreenRecorderModule');

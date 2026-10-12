import { type NativeModule, requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type StartRecordingResult = {
  started: boolean;
  alreadyRecording?: boolean;
  cancelled?: boolean;
};

export type StopRecordingResult = {
  stopped: boolean;
  uri: string | null;
};

type ScreenRecorderNativeModule = NativeModule & {
  startRecording(): Promise<StartRecordingResult>;
  isRecording(): Promise<boolean>;
  stopRecording(): Promise<StopRecordingResult>;
  clearCompletedRecording(): void;
};

function getNativeModule(): ScreenRecorderNativeModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  return requireOptionalNativeModule<ScreenRecorderNativeModule>(
    'SecureEscapeScreenRecorder'
  );
}

export function isNativeScreenRecordingSupported(): boolean {
  return getNativeModule() !== null;
}

export async function startScreenRecording(): Promise<StartRecordingResult> {
  const nativeModule = getNativeModule();

  if (!nativeModule) {
    return {
      started: false,
      cancelled: false,
    };
  }

  return nativeModule.startRecording();
}

export async function isScreenRecording(): Promise<boolean> {
  const nativeModule = getNativeModule();

  if (!nativeModule) {
    return false;
  }

  return nativeModule.isRecording();
}

export async function stopScreenRecording(): Promise<StopRecordingResult> {
  const nativeModule = getNativeModule();

  if (!nativeModule) {
    return {
      stopped: false,
      uri: null,
    };
  }

  return nativeModule.stopRecording();
}

export function clearCompletedScreenRecording(): void {
  const nativeModule = getNativeModule();

  nativeModule?.clearCompletedRecording();
}


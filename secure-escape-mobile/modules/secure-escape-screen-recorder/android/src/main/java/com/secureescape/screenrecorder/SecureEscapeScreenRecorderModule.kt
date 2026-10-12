package com.secureescape.screenrecorder

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Coroutine
import kotlinx.coroutines.delay

class SecureEscapeScreenRecorderModule : Module() {

  private lateinit var screenCaptureLauncher:
    AppContextActivityResultLauncher<
      ScreenCaptureContractInput,
      ScreenCaptureContractResult
    >

  override fun definition() = ModuleDefinition {
    Name("SecureEscapeScreenRecorder")

    RegisterActivityContracts {
      screenCaptureLauncher =
        registerForActivityResult(
          ScreenCaptureContract()
        )
    }

    AsyncFunction("startRecording") Coroutine { ->
      if (SecureEscapeScreenRecorderService.isRecording) {
        return@Coroutine mapOf(
          "started" to true,
          "alreadyRecording" to true
        )
      }

      SecureEscapeScreenRecorderService.clearCompletedRecording()

      val result =
        screenCaptureLauncher.launch(
          ScreenCaptureContractInput
        )

      if (
        result.resultCode != android.app.Activity.RESULT_OK ||
        result.data == null
      ) {
        return@Coroutine mapOf(
          "started" to false,
          "cancelled" to true
        )
      }

      val context =
        requireNotNull(appContext.reactContext) {
          "React Application Context is unavailable."
        }

      val serviceIntent =
        Intent(
          context,
          SecureEscapeScreenRecorderService::class.java
        ).apply {
          action =
            SecureEscapeScreenRecorderService.ACTION_START

          putExtra(
            SecureEscapeScreenRecorderService.EXTRA_RESULT_CODE,
            result.resultCode
          )

          putExtra(
            SecureEscapeScreenRecorderService.EXTRA_RESULT_DATA,
            result.data
          )
        }

      ContextCompat.startForegroundService(
        context,
        serviceIntent
      )

      var attempts = 0

      while (
        !SecureEscapeScreenRecorderService.isRecording &&
        SecureEscapeScreenRecorderService.lastError == null &&
        attempts < 50
      ) {
        delay(100)
        attempts++
      }

      val error =
        SecureEscapeScreenRecorderService.lastError

      if (error != null) {
        throw IllegalStateException(error)
      }

      if (!SecureEscapeScreenRecorderService.isRecording) {
        throw IllegalStateException(
          "Screen recording did not start in time."
        )
      }

      mapOf(
        "started" to true,
        "alreadyRecording" to false
      )
    }

    AsyncFunction("isRecording") {
      SecureEscapeScreenRecorderService.isRecording
    }

    AsyncFunction("stopRecording") Coroutine { ->
      val context =
        requireNotNull(appContext.reactContext) {
          "React Application Context is unavailable."
        }

      if (!SecureEscapeScreenRecorderService.isRecording) {
        val existingPath =
          SecureEscapeScreenRecorderService.completedRecordingPath

        return@Coroutine if (existingPath != null) {
          mapOf(
            "stopped" to true,
            "uri" to "file://$existingPath"
          )
        } else {
          mapOf(
            "stopped" to false,
            "uri" to null
          )
        }
      }

      val stopIntent =
        Intent(
          context,
          SecureEscapeScreenRecorderService::class.java
        ).apply {
          action =
            SecureEscapeScreenRecorderService.ACTION_STOP
        }

      context.startService(stopIntent)

      var attempts = 0

      while (
        SecureEscapeScreenRecorderService.isRecording &&
        attempts < 100
      ) {
        delay(100)
        attempts++
      }

      if (SecureEscapeScreenRecorderService.isRecording) {
        throw IllegalStateException(
          "Screen recording did not stop in time."
        )
      }

      val error =
        SecureEscapeScreenRecorderService.lastError

      if (error != null) {
        throw IllegalStateException(error)
      }

      val path =
        SecureEscapeScreenRecorderService.completedRecordingPath
          ?: throw IllegalStateException(
            "Screen recording stopped but no video file was produced."
          )

      mapOf(
        "stopped" to true,
        "uri" to "file://$path"
      )
    }

    Function("clearCompletedRecording") {
      SecureEscapeScreenRecorderService.clearCompletedRecording()
    }
  }
}



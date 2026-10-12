package com.secureescape.screenrecorder

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.MediaRecorder
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import java.io.File

class SecureEscapeScreenRecorderService : Service() {

  companion object {
    const val ACTION_START =
      "com.secureescape.screenrecorder.START"

    const val ACTION_STOP =
      "com.secureescape.screenrecorder.STOP"

    const val EXTRA_RESULT_CODE = "resultCode"
    const val EXTRA_RESULT_DATA = "resultData"

    private const val CHANNEL_ID =
      "secure_escape_screen_recording"

    private const val NOTIFICATION_ID = 8102

    @Volatile
    var isRecording: Boolean = false
      private set

    @Volatile
    var completedRecordingPath: String? = null
      private set

    @Volatile
    var lastError: String? = null
      private set

    fun clearCompletedRecording() {
      completedRecordingPath = null
      lastError = null
    }
  }

  private var mediaProjection: MediaProjection? = null
  private var mediaRecorder: MediaRecorder? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var outputFile: File? = null

  private var projectionAlreadyStopped = false

  private val projectionCallback =
    object : MediaProjection.Callback() {
      override fun onStop() {
        Handler(Looper.getMainLooper()).post {
          stopAndFinalizeRecording(
            projectionWasStoppedExternally = true
          )
        }
      }
    }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(
    intent: Intent?,
    flags: Int,
    startId: Int
  ): Int {
    when (intent?.action) {
      ACTION_START -> {
        if (!isRecording) {
          try {
            startScreenRecording(intent)
          } catch (error: Exception) {
            lastError =
              error.message ?: "Unable to start screen recording."

            cleanupAfterStartFailure()
          }
        }
      }

      ACTION_STOP -> {
        stopAndFinalizeRecording(
          projectionWasStoppedExternally = false
        )
      }
    }

    return START_NOT_STICKY
  }

  private fun startScreenRecording(intent: Intent) {
    lastError = null
    completedRecordingPath = null
    projectionAlreadyStopped = false

    val resultCode = intent.getIntExtra(
      EXTRA_RESULT_CODE,
      android.app.Activity.RESULT_CANCELED
    )

    @Suppress("DEPRECATION")
    val resultData: Intent? =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        intent.getParcelableExtra(
          EXTRA_RESULT_DATA,
          Intent::class.java
        )
      } else {
        intent.getParcelableExtra(EXTRA_RESULT_DATA)
      }

    require(
      resultCode == android.app.Activity.RESULT_OK &&
        resultData != null
    ) {
      "Android screen-recording permission was not granted."
    }

    createNotificationChannel()

    val notification = Notification.Builder(
      this,
      CHANNEL_ID
    )
      .setContentTitle("Secure Escape")
      .setContentText("Session protection is active")
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .setCategory(Notification.CATEGORY_SERVICE)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
      )
    } else {
      startForeground(
        NOTIFICATION_ID,
        notification
      )
    }

    val projectionManager =
      getSystemService(
        Context.MEDIA_PROJECTION_SERVICE
      ) as MediaProjectionManager

    val projection =
      requireNotNull(
        projectionManager.getMediaProjection(
          resultCode,
          resultData
        )
      ) {
        "Android did not provide a MediaProjection instance."
      }

    mediaProjection = projection

    projection.registerCallback(
      projectionCallback,
      Handler(Looper.getMainLooper())
    )

    val metrics = resources.displayMetrics

    val originalWidth = metrics.widthPixels
    val originalHeight = metrics.heightPixels

    val longestSide =
      maxOf(originalWidth, originalHeight)

    val scale =
      if (longestSide > 720) {
        720.0 / longestSide.toDouble()
      } else {
        1.0
      }

    var width = (originalWidth * scale).toInt()
    var height = (originalHeight * scale).toInt()

    if (width % 2 != 0) {
      width -= 1
    }

    if (height % 2 != 0) {
      height -= 1
    }

    require(width > 0 && height > 0) {
      "Invalid screen dimensions for recording."
    }

    val recordingDirectory =
      File(
        cacheDir,
        "secure_escape_screen_recordings"
      )

    if (!recordingDirectory.exists()) {
      require(recordingDirectory.mkdirs()) {
        "Unable to create screen-recording directory."
      }
    }

    val file =
      File(
        recordingDirectory,
        "duress_session_${System.currentTimeMillis()}.mp4"
      )

    outputFile = file

    val recorder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        MediaRecorder(this)
      } else {
        @Suppress("DEPRECATION")
        MediaRecorder()
      }

    mediaRecorder = recorder

    recorder.setVideoSource(
      MediaRecorder.VideoSource.SURFACE
    )

    recorder.setOutputFormat(
      MediaRecorder.OutputFormat.MPEG_4
    )

    recorder.setVideoEncoder(
      MediaRecorder.VideoEncoder.H264
    )

    recorder.setVideoSize(
      width,
      height
    )

    recorder.setVideoFrameRate(24)

    recorder.setVideoEncodingBitRate(
      2_000_000
    )

    recorder.setOutputFile(
      file.absolutePath
    )

    recorder.prepare()

    virtualDisplay =
      projection.createVirtualDisplay(
        "SecureEscapeDuressSession",
        width,
        height,
        metrics.densityDpi,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
        recorder.surface,
        null,
        null
      )

    recorder.start()

    isRecording = true
  }

  private fun stopAndFinalizeRecording(
    projectionWasStoppedExternally: Boolean
  ) {
    val recorder = mediaRecorder
    val file = outputFile
    val wasRecording = isRecording

    isRecording = false

    if (wasRecording && recorder != null) {
      try {
        recorder.stop()

        if (
          file != null &&
          file.exists() &&
          file.length() > 0
        ) {
          completedRecordingPath =
            file.absolutePath
        } else {
          completedRecordingPath = null
          lastError =
            "Screen recording did not produce a valid video file."
        }
      } catch (error: Exception) {
        completedRecordingPath = null
        lastError =
          error.message ?: "Unable to finalize screen recording."

        try {
          file?.delete()
        } catch (_: Exception) {
        }
      }
    }

    releaseRecorder()
    releaseVirtualDisplay()

    if (projectionWasStoppedExternally) {
      projectionAlreadyStopped = true
    }

    releaseProjection()

    outputFile = null

    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun releaseRecorder() {
    try {
      mediaRecorder?.reset()
    } catch (_: Exception) {
    }

    try {
      mediaRecorder?.release()
    } catch (_: Exception) {
    }

    mediaRecorder = null
  }

  private fun releaseVirtualDisplay() {
    try {
      virtualDisplay?.release()
    } catch (_: Exception) {
    }

    virtualDisplay = null
  }

  private fun releaseProjection() {
    val projection = mediaProjection

    if (projection != null) {
      try {
        projection.unregisterCallback(
          projectionCallback
        )
      } catch (_: Exception) {
      }

      if (!projectionAlreadyStopped) {
        projectionAlreadyStopped = true

        try {
          projection.stop()
        } catch (_: Exception) {
        }
      }
    }

    mediaProjection = null
  }

  private fun cleanupAfterStartFailure() {
    isRecording = false
    completedRecordingPath = null

    try {
      outputFile?.delete()
    } catch (_: Exception) {
    }

    releaseRecorder()
    releaseVirtualDisplay()
    releaseProjection()

    outputFile = null

    try {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } catch (_: Exception) {
    }

    stopSelf()
  }

  private fun createNotificationChannel() {
    if (
      Build.VERSION.SDK_INT >=
      Build.VERSION_CODES.O
    ) {
      val manager =
        getSystemService(
          Context.NOTIFICATION_SERVICE
        ) as NotificationManager

      val channel =
        NotificationChannel(
          CHANNEL_ID,
          "Secure Escape Session Protection",
          NotificationManager.IMPORTANCE_LOW
        )

      channel.description =
        "Shown while Secure Escape is protecting an active session."

      manager.createNotificationChannel(
        channel
      )
    }
  }
}


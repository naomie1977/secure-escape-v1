package com.secureescape.screenrecorder

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import java.io.Serializable

object ScreenCaptureContractInput : Serializable

data class ScreenCaptureContractResult(
  val resultCode: Int,
  val data: Intent?
)

class ScreenCaptureContract :
  AppContextActivityResultContract<
    ScreenCaptureContractInput,
    ScreenCaptureContractResult
  > {

  override fun createIntent(
    context: Context,
    input: ScreenCaptureContractInput
  ): Intent {
    val projectionManager =
      context.getSystemService(
        Context.MEDIA_PROJECTION_SERVICE
      ) as MediaProjectionManager

    return projectionManager.createScreenCaptureIntent()
  }

  override fun parseResult(
    input: ScreenCaptureContractInput,
    resultCode: Int,
    intent: Intent?
  ): ScreenCaptureContractResult {
    return ScreenCaptureContractResult(
      resultCode = resultCode,
      data = if (resultCode == Activity.RESULT_OK) {
        intent
      } else {
        null
      }
    )
  }
}

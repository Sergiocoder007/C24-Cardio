// Shares a rendered card image with its caption (which carries the link).
// Android app: native share sheet (WhatsApp, Instagram, …) via the C24 plugin.
// Browsers: the Web Share API with the image file where supported; otherwise
// the image is downloaded and the caption copied so it can be pasted.
import { WorkoutTimer } from '../native/workoutTimer.js'
import { Capacitor } from '@capacitor/core'

function isAndroidApp() {
  try {
    return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('WorkoutTimer')
  } catch {
    return false
  }
}

async function dataUrlToFile(dataUrl, fileName) {
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], fileName, { type: 'image/png' })
}

// Returns 'shared' | 'cancelled' | 'downloaded'.
export async function shareCard({ dataUrl, fileName, text, title }) {
  if (isAndroidApp()) {
    await WorkoutTimer.shareImage({ base64: dataUrl.split(',')[1], fileName, text, title })
    return 'shared'
  }
  try {
    const file = await dataUrlToFile(dataUrl, fileName)
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, title })
      return 'shared'
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled'
  }
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = fileName
  a.click()
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // clipboard not allowed; the image is still saved
  }
  return 'downloaded'
}

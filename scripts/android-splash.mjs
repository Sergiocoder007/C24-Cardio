// Android launch screen: show the same sharp C24 logo (assets/splash-icon.png)
// that the in-app intro starts with, on plain black, instead of the stretched
// splash image and the cropped launcher icon. Runs in CI after `cap add`.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const res = 'android/app/src/main/res'
mkdirSync(`${res}/drawable-nodpi`, { recursive: true })
copyFileSync('assets/splash-icon.png', `${res}/drawable-nodpi/c24_splash_icon.png`)

const stylesPath = `${res}/values/styles.xml`
let xml = readFileSync(stylesPath, 'utf8')
const launch = /(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)([\s\S]*?)(<\/style>)/
if (!launch.test(xml)) {
  console.error('AppTheme.NoActionBarLaunch not found in', stylesPath)
  process.exit(1)
}
// Replace any of these items the template already sets (duplicates fail the build).
const names = ['android:background', 'windowSplashScreenBackground', 'windowSplashScreenAnimatedIcon']
xml = xml.replace(launch, (_, open, body, close) => {
  const kept = body
    .split('\n')
    .filter((line) => !names.some((n) => line.includes(`name="${n}"`)))
    .join('\n')
  return `${open}${kept}${close}`
})
xml = xml.replace(
  launch,
  `$1
        <item name="android:background">#050505</item>
        <item name="windowSplashScreenBackground">#050505</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/c24_splash_icon</item>
    $2$3`,
)
writeFileSync(stylesPath, xml)
console.log(xml.match(launch)[0])

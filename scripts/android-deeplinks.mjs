// Adds the C24 Challenge link handlers to the generated Android project
// (android/ is recreated on every CI build, so this runs after `cap add`).
//   c24cardio://challenge?c=…           always opens the app (used by the web
//                                        page's "Open in the app" button)
//   https://c24cardio.fit/challenge?c=…  opens the app directly once the site
//                                        serves /.well-known/assetlinks.json;
//                                        until then Android opens the browser.
// Usage: node scripts/android-deeplinks.mjs [path/to/AndroidManifest.xml]
import { readFileSync, writeFileSync } from 'node:fs'

const file = process.argv[2] ?? 'android/app/src/main/AndroidManifest.xml'
let xml = readFileSync(file, 'utf8')
if (xml.includes('android:scheme="c24cardio"')) {
  console.log('deep links already present')
  process.exit(0)
}
const filters = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="c24cardio" android:host="challenge" />
            </intent-filter>
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="c24cardio.fit" android:path="/challenge" />
            </intent-filter>
`
// Insert right after the launcher intent-filter of the main activity.
const launcher = /(<intent-filter>\s*<action android:name="android\.intent\.action\.MAIN"\s*\/>\s*<category android:name="android\.intent\.category\.LAUNCHER"\s*\/>\s*<\/intent-filter>)/
if (!launcher.test(xml)) {
  console.error('launcher intent-filter not found in', file)
  process.exit(1)
}
xml = xml.replace(launcher, `$1${filters}`)
writeFileSync(file, xml)
console.log('added challenge deep links to', file)

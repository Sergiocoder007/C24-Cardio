import { useEffect, useState } from 'react'
import { FALLBACK_ARTWORK } from './fighters'

export function FighterPortrait({ src, alt = '', className = '' }) {
  const [failed, setFailed] = useState(false)
  const url = !src || failed ? FALLBACK_ARTWORK : src

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div className={`paint-frame ${className}`.trim()}>
      <img
        src={url}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      <div className="paint-grade" />
    </div>
  )
}

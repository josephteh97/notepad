import { useEffect } from 'react'
import { useSetting, saveSetting } from './useSettings'
import type { Theme } from '../db/types'

export function useTheme() {
  const theme = useSetting<Theme>('theme', 'system')

  useEffect(() => {
    const root = document.documentElement
    const mql = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const dark = theme === 'dark' || (theme === 'system' && mql.matches)
      root.classList.toggle('dark', dark)
      root.style.colorScheme = dark ? 'dark' : 'light'
    }

    apply()
    if (theme === 'system') {
      mql.addEventListener('change', apply)
      return () => mql.removeEventListener('change', apply)
    }
  }, [theme])

  const setTheme = (t: Theme) => saveSetting('theme', t)

  return { theme, setTheme }
}

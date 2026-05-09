import { useEffect } from 'react'
import { useSetting, saveSetting } from './useSettings'
import type { Theme } from '../db/types'

export function useTheme() {
  const theme = useSetting<Theme>('theme', 'system')

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (theme === 'dark' || (theme === 'system' && prefersDark)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  const setTheme = (t: Theme) => saveSetting('theme', t)

  return { theme, setTheme }
}

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { EditorScreen } from './screens/EditorScreen'
import { CalendarScreen } from './screens/CalendarScreen'
import { RemindersScreen } from './screens/RemindersScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { Drawer } from './components/Drawer'
import { ToastContainer } from './components/Toast'
import { useTheme } from './hooks/useTheme'
import { runV2Migration } from './utils/migration'
import { getSetting, setSetting } from './db'

function AppContent() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  useTheme() // applies dark class to <html>

  return (
    <>
      <ToastContainer />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Routes>
        <Route path="/" element={<HomeScreen onOpenDrawer={() => setDrawerOpen(true)} />} />
        <Route path="/editor" element={<EditorScreen />} />
        <Route path="/editor/:id" element={<EditorScreen />} />
        <Route path="/calendar" element={<CalendarScreen onOpenDrawer={() => setDrawerOpen(true)} />} />
        <Route path="/reminders" element={<RemindersScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    async function init() {
      // Run v2 data migration (no-op on web or if already done)
      await runV2Migration().catch(console.error)

      // Show onboarding only on genuinely fresh installs
      const onboardingDone = await getSetting<boolean>('onboardingDone')
      if (!onboardingDone) {
        // Check if there are existing notes (v2 migration may have imported some)
        const { db } = await import('./db')
        const noteCount = await db.notes.count()
        if (noteCount === 0) {
          setShowOnboarding(true)
        } else {
          // Has notes from migration — skip onboarding, mark done
          await setSetting('onboardingDone', true)
        }
      }
      setReady(true)
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (showOnboarding) {
    return (
      <>
        <ToastContainer />
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      </>
    )
  }

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

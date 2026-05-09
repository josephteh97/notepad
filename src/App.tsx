import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { EditorScreen } from './screens/EditorScreen'
import { CalendarScreen } from './screens/CalendarScreen'
import { RemindersScreen } from './screens/RemindersScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { Drawer } from './components/Drawer'
import { ToastContainer } from './components/Toast'
import { useTheme } from './hooks/useTheme'
import { runV2Migration } from './utils/migration'

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
  useEffect(() => {
    // Run v2 migration once on startup (no-op if already done or not on Android)
    runV2Migration().catch(console.error)
  }, [])

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

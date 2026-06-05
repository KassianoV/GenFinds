import React from 'react'
import { Outlet } from 'react-router-dom'
import { isDesktop } from '../../services/platform'
import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'

export function AppShell(): React.JSX.Element {
  if (isDesktop()) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-screen bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  )
}

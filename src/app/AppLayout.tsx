import { Outlet } from 'react-router-dom'
import { TopNavigation } from '../shared/ui/TopNavigation/TopNavigation'
import styles from './App.module.css'

export function AppLayout() {
  return (
    <div className={styles.appShell}>
      <TopNavigation />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

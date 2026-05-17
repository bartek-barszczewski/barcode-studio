import { Outlet } from 'react-router-dom'
import { NavigationRail } from '../shared/ui/NavigationRail/NavigationRail'
import styles from './App.module.css'

export function AppLayout() {
  return (
    <div className={styles.appShell}>
      <NavigationRail />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import { useAuthStore } from '@/store/authStore'
import { lazy } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'

const LoginPage    = lazy(() => import('@/pages/Login'))
const RegisterPage = lazy(() => import('@/pages/Register'))
const VaultPage    = lazy(() => import('@/pages/Vault'))
const HealthPage   = lazy(() => import('@/pages/Health'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const AnalysePage    = lazy(() => import('@/pages/Analyse'))
const GeneratorPage  = lazy(() => import('@/pages/Generator'))

// ---- Root route ----
// Login/Register are still wrapped in Suspense for their full-screen loader.
// App routes (vault, health, settings) have their own Suspense inside AppLayout
// so navigation between them never blanks out the sidebar/navbar.
const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// ---- Index → redirect ----
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    throw redirect({ to: isAuthenticated ? '/vault' : '/login' })
  },
})

// ---- Login ----
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) throw redirect({ to: '/vault' })
  },
  component: LoginPage,
})

// ---- Register ----
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) throw redirect({ to: '/vault' })
  },
  component: RegisterPage,
})

// ---- App layout (protected shell) ----
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

// ---- Vault ----
const vaultRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/vault',
  component: VaultPage,
})

// ---- Health ----
const healthRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/health',
  component: HealthPage,
})

// ---- Settings ----
const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: SettingsPage,
})

// ---- Analyse ----
const analyseRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/analyse',
  component: AnalysePage,
})

// ---- Generator ----
const generatorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/generator',
  component: GeneratorPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  appRoute.addChildren([vaultRoute, healthRoute, settingsRoute, analyseRoute, generatorRoute]),
])

export const router = createRouter({ routeTree })

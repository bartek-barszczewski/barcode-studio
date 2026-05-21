import React, { createContext, useContext, useEffect, useState } from 'react'

export type ThemeType = 'light' | 'dark'

interface CustomColors {
  primary: string
  background: string
}

interface ThemeContextProps {
  theme: ThemeType
  toggleTheme: () => void
  setTheme: (theme: ThemeType) => void
  lightColors: CustomColors
  darkColors: CustomColors
  updateCustomColors: (mode: ThemeType, colors: Partial<CustomColors>) => void
  resetColors: (mode: ThemeType) => void
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined)

const DEFAULT_LIGHT_COLORS: CustomColors = {
  primary: '#006a64',
  background: '#fdfdfd',
}

const DEFAULT_DARK_COLORS: CustomColors = {
  primary: '#80d8cf',
  background: '#121313',
}

// Utility to parse hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const match = hex.replace('#', '').match(/.{1,2}/g)
  if (!match || match.length < 3) return null
  return {
    r: parseInt(match[0], 16),
    g: parseInt(match[1], 16),
    b: parseInt(match[2], 16),
  }
}

// Utility to convert RGB back to Hex
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Derives container colors from background color (darkening for light mode, lightening for dark mode)
const deriveContainerColors = (bgHex: string, theme: ThemeType) => {
  const rgb = hexToRgb(bgHex)
  if (!rgb) return {}

  const factor = theme === 'light' ? -5 : 6 // percentage change
  const adjust = (c: number) => {
    const delta = (255 * factor) / 100
    return Math.max(0, Math.min(255, c + delta))
  }

  const containerBg = rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b))
  
  // High container background
  const factorHigh = theme === 'light' ? -9 : 12
  const adjustHigh = (c: number) => {
    const delta = (255 * factorHigh) / 100
    return Math.max(0, Math.min(255, c + delta))
  }
  const containerHighBg = rgbToHex(adjustHigh(rgb.r), adjustHigh(rgb.g), adjustHigh(rgb.b))

  return {
    containerBg,
    containerHighBg,
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'light' || saved === 'dark') return saved
    // Fallback to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })

  const [lightColors, setLightColors] = useState<CustomColors>(() => {
    const saved = localStorage.getItem('theme-colors-light')
    return saved ? JSON.parse(saved) : DEFAULT_LIGHT_COLORS
  })

  const [darkColors, setDarkColors] = useState<CustomColors>(() => {
    const saved = localStorage.getItem('theme-colors-dark')
    return saved ? JSON.parse(saved) : DEFAULT_DARK_COLORS
  })

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme)
  }

  const updateCustomColors = (mode: ThemeType, colors: Partial<CustomColors>) => {
    if (mode === 'light') {
      setLightColors((prev) => {
        const next = { ...prev, ...colors }
        localStorage.setItem('theme-colors-light', JSON.stringify(next))
        return next
      })
    } else {
      setDarkColors((prev) => {
        const next = { ...prev, ...colors }
        localStorage.setItem('theme-colors-dark', JSON.stringify(next))
        return next
      })
    }
  }

  const resetColors = (mode: ThemeType) => {
    if (mode === 'light') {
      setLightColors(DEFAULT_LIGHT_COLORS)
      localStorage.removeItem('theme-colors-light')
    } else {
      setDarkColors(DEFAULT_DARK_COLORS)
      localStorage.removeItem('theme-colors-dark')
    }
  }

  // Apply theme and custom variables to HTML node
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    localStorage.setItem('theme-mode', theme)

    const colors = theme === 'light' ? lightColors : darkColors
    const defaultColors = theme === 'light' ? DEFAULT_LIGHT_COLORS : DEFAULT_DARK_COLORS

    // Dynamic Primary Color Customization
    if (colors.primary !== defaultColors.primary) {
      root.style.setProperty('--md-sys-color-primary', colors.primary)
    } else {
      root.style.removeProperty('--md-sys-color-primary')
    }

    // Dynamic Background & Surface Color Customization
    if (colors.background !== defaultColors.background) {
      root.style.setProperty('--md-sys-color-background', colors.background)
      root.style.setProperty('--md-sys-color-surface', colors.background)
      
      // Derive elegant secondary containers and surface containers dynamically
      const derived = deriveContainerColors(colors.background, theme)
      if (derived.containerBg) {
        root.style.setProperty('--md-sys-color-surface-container', derived.containerBg)
        root.style.setProperty('--md-sys-color-surface-container-low', colors.background)
      }
      if (derived.containerHighBg) {
        root.style.setProperty('--md-sys-color-surface-container-high', derived.containerHighBg)
      }
    } else {
      root.style.removeProperty('--md-sys-color-background')
      root.style.removeProperty('--md-sys-color-surface')
      root.style.removeProperty('--md-sys-color-surface-container')
      root.style.removeProperty('--md-sys-color-surface-container-low')
      root.style.removeProperty('--md-sys-color-surface-container-high')
    }
  }, [theme, lightColors, darkColors])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        lightColors,
        darkColors,
        updateCustomColors,
        resetColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

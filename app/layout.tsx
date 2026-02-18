import { ColorModeScript, theme } from '@chakra-ui/react'
import { Provider } from './provider'
import AuthGuard from '../components/AuthGuard'
import AppShell from '../components/AppShell'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const colorMode = theme.config.initialColorMode

  return (
    <html lang="en" data-theme={colorMode} style={{ colorScheme: colorMode }}>
      <body className={`chakra-ui-${colorMode}`}>
        <ColorModeScript initialColorMode={colorMode} />
        <Provider>
          <AuthGuard>
            <AppShell>{children}</AppShell>
          </AuthGuard>
        </Provider>
      </body>
    </html>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient.ts'
import { ToastProvider } from './lib/Toast.tsx'
import { SyncProvider } from './lib/SyncProvider.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SyncProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SyncProvider>
    </QueryClientProvider>
  </StrictMode>,
)

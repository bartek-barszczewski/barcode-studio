import { Navigate, createBrowserRouter } from 'react-router-dom'
import { DocxPage } from '../pages/DocxPage/DocxPage'
import { GeneratorPage } from '../pages/GeneratorPage/GeneratorPage'
import { HelpPage } from '../pages/HelpPage/HelpPage'
import { XlsxPage } from '../pages/XlsxPage/XlsxPage'
import { AppLayout } from './AppLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/generator" replace />,
      },
      {
        path: 'generator',
        element: <GeneratorPage />,
      },
      {
        path: 'xlsx',
        element: <XlsxPage />,
      },
      {
        path: 'docx',
        element: <DocxPage />,
      },
      {
        path: 'help',
        element: <HelpPage />,
      },
    ],
  },
])


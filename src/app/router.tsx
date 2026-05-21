import { Navigate, createBrowserRouter } from 'react-router-dom'
import { DocxPage } from '../pages/DocxPage/DocxPage'
import { GeneratorPage } from '../pages/GeneratorPage/GeneratorPage'
import { HelpPage } from '../pages/HelpPage/HelpPage'
import { XlsxPage } from '../pages/XlsxPage/XlsxPage'
import { BarcodeSetPage } from '../pages/BarcodeSetPage/BarcodeSetPage'
import { HomePage } from '../pages/HomePage/HomePage'
import { SequencePage } from '../pages/SequencePage/SequencePage'
import { AppLayout } from './AppLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/home" replace />,
      },
      {
        path: 'home',
        element: <HomePage />,
      },
      {
        path: 'generator',
        element: <GeneratorPage />,
      },
      {
        path: 'barcode-set',
        element: <BarcodeSetPage />,
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
      {
        path: 'sequence',
        element: <SequencePage />,
      },
    ],
  },
])

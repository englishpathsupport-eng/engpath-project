import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'

const App = React.lazy(() => import('./engpath-app-secure.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
)
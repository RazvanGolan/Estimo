import ClientRouter from "./components/ClientRouter"
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import "./App.css"

function App() {
  return (
    <>
      <ClientRouter />
      <Analytics />
      <SpeedInsights />
    </>
  )
}

export default App

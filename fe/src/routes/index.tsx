import { createFileRoute } from '@tanstack/react-router'
import '../App.css'
import { TekneEditor } from '@/editor/TekneEditor'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <>
      <TekneEditor />
    </>
  )
}

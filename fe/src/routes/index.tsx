import { createFileRoute } from '@tanstack/react-router'
import '../App.css'
import { App } from '@/App'

export const Route = createFileRoute('/')({
  component: App,
})

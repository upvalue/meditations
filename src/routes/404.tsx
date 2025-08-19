import { createFileRoute } from '@tanstack/react-router'
import NotFound from '@/pages/NotFound'

export const Route = createFileRoute('/404')({
  component: RouteComponent,
})

function RouteComponent() {
  return <NotFound />
}

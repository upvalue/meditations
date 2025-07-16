import { CMEditor } from '@/cmeditor/CMEditor'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cmeditor')({
  component: RouteComponent,
})

function RouteComponent() {
  return <CMEditor />
}

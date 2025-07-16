import { LXEditor } from '@/lxeditor/lxeditor'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/lxeditor')({
  component: RouteComponent,
})

function RouteComponent() {
  return <LXEditor />
}

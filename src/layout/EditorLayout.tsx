import { ControlBar } from '@/controls/ControlBar'

interface EditorLayoutProps {
  editor: React.ReactNode
  sidepanel: React.ReactNode
}

export function EditorLayout({ editor, sidepanel }: EditorLayoutProps) {
  return (
    <div className="w-full h-full flex flex-col ">
      <div className="flex flex-grow ">
        <div className="w-[60%] bg-zinc-900">{editor}</div>
        <div className="w-[40%] Panel">{sidepanel}</div>
      </div>
    </div>
  )
}

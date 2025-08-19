import { ControlBar } from '@/controls/ControlBar'

interface EditorLayoutProps {
  editor: React.ReactNode
  sidepanel: React.ReactNode
  showControlBar?: boolean
}

export function EditorLayout({ 
  editor, 
  sidepanel, 
  showControlBar = true
}: EditorLayoutProps) {
  return (
    <div className="w-full h-full flex flex-col ">
      {showControlBar && <ControlBar />}
      <div className="flex flex-grow p-8">
        <div className="w-[60%]">
          {editor}
        </div>
        <div className="w-[40%]">
          {sidepanel}
        </div>
      </div>
    </div>
  )
}
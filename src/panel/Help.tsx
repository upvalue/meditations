import React from 'react'
import { Badge } from '@/components/ui/Badge'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/ui/description-list'
import { getAllKeybindings } from '@/lib/keys'
import { LinkIcon } from '@heroicons/react/16/solid'
const Keybindings = () => {
  const allKeybindings = getAllKeybindings()

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
      <p>
        <div className="flex items-center gap-1 mb-2">
          <a className="text-emerald-400" href="https://codemirror.net/docs/ref/#commands.emacsStyleKeymap">Emacs-style keybindings are available for line editing</a>
          <LinkIcon className="w-4 h-4 text-emerald-400" />
        </div>
      </p>
      <DescriptionList>
        {allKeybindings.map((keybinding) => (
          <React.Fragment key={keybinding.name}>
            <DescriptionTerm>{keybinding.description}</DescriptionTerm>
            <DescriptionDetails>
              <Badge>{keybinding.displayKey}</Badge>
            </DescriptionDetails>
          </React.Fragment>
        ))}
      </DescriptionList>
    </div>
  )
}

const SyntaxHelp = () => {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Editor Syntax</h2>
      <DescriptionList>
        <DescriptionTerm>Internal links</DescriptionTerm>
        <DescriptionDetails>
          <Badge>
            {`[[WikiLinks]]`}
          </Badge>
        </DescriptionDetails>
      </DescriptionList>

      <DescriptionList>
        <DescriptionTerm>Tags</DescriptionTerm>
        <DescriptionDetails>
          <Badge>
            {`#tag`}
          </Badge>
        </DescriptionDetails>
      </DescriptionList>

    </div>
  )

}

export const Help = () => {
  return (
    <div className="p-4 flex flex-col gap-8 ">
      <SyntaxHelp />
      <Keybindings />
    </div>
  )
}

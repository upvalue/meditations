import React from 'react'
import { Badge } from '@/components/ui/Badge'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/ui/description-list'
import { getAllKeybindings } from '@/lib/keys'

export const Help = () => {
  const allKeybindings = getAllKeybindings()

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
      <DescriptionList>
        {allKeybindings.map((keybinding) => (
          <React.Fragment key={keybinding.name}>
            <DescriptionTerm>
              <Badge>{keybinding.displayKey}</Badge>
            </DescriptionTerm>
            <DescriptionDetails>{keybinding.description}</DescriptionDetails>
          </React.Fragment>
        ))}
      </DescriptionList>
    </div>
  )
}

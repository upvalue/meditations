import { useState, useRef, useEffect } from 'react'
import { trpc } from '@/trpc'
import { useNavigate } from '@tanstack/react-router'

/*
 * Bar that lives at the top. Has various controls
 */
export const TitleBar = ({
  title,
  allowTitleEdit = false,
}: {
  title: string
  allowTitleEdit?: boolean
}) => {
  const [proposedTitle, setProposedTitle] = useState(title)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editableRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const renameDocMutation = trpc.renameDoc.useMutation({
    onSuccess: () => {
      setError(null)
      setIsEditing(false)
      navigate({
        to: '/n/$title',
        params: {
          title: proposedTitle.trim(),
        },
      })
    },
    onError: (error) => {
      // Extract a clean error message from TRPC/Zod validation errors
      let message = error.message
      try {
        const parsed = JSON.parse(message)
        if (Array.isArray(parsed) && parsed[0]?.message) {
          message = parsed[0].message
        }
      } catch {
        // If parsing fails, use the original message
      }
      setError(message)
    },
  })

  useEffect(() => {
    setProposedTitle(title)
  }, [title])

  useEffect(() => {
    if (isEditing && editableRef.current) {
      // Set the initial content only when entering edit mode
      editableRef.current.textContent = proposedTitle
      editableRef.current.focus()

      // Select all text
      const range = document.createRange()
      range.selectNodeContents(editableRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [isEditing])

  const handleSubmit = () => {
    if (proposedTitle.trim() !== title && allowTitleEdit) {
      renameDocMutation.mutate({
        oldName: title,
        newName: proposedTitle.trim(),
      })
    } else {
      setIsEditing(false)
      setError(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setProposedTitle(title)
      setIsEditing(false)
      setError(null)
    }
  }

  return (
    <div className="py-2 pt-4 pl-[138px] pr-4 w-full">
      <div className="flex justify-between w-full">
        <div className="flex flex-col w-full">
          <div
            className="text-2xl text-zinc-500 cursor-pointer w-full"
            onClick={() => {
              if (allowTitleEdit) {
                setIsEditing(true)
              }
            }}
          >
            {isEditing ? (
              <div
                ref={editableRef}
                contentEditable
                autoFocus
                suppressContentEditableWarning={true}
                className="outline-none "
                onInput={(e) =>
                  setProposedTitle(e.currentTarget.textContent || '')
                }
                onBlur={handleSubmit}
                onKeyDown={handleKeyDown}
              />
            ) : (
              title
            )}
          </div>
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </div>
      </div>
    </div>
  )
}

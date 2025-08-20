import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { KBarProvider, useKBar, useRegisterActions, type Action } from 'kbar'
import { trpc } from '@/trpc/client'
import { useMemo, useEffect, useState } from 'react'
import { KBarModal, KBarSearchInput, KBarResultRenderer } from './KBar'

const DocumentSearchContent = () => {
  const navigate = useNavigate()
  const kbarState = useKBar((state) => state)
  const query = kbarState.searchQuery || ''
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const searchDocs = trpc.searchDocs.useQuery(
    { query: debouncedQuery },
    {
      enabled: true,
      staleTime: 1000,
    }
  )

  const actions = useMemo((): Action[] => {
    let actions: Action[] = []
    let exactMatch = false
    if (searchDocs.data) {
      actions = searchDocs.data.map((doc) => {
        return {
          id: `doc-${doc.id}`,
          name: doc.title,
          // TODO: Get a descriptive subtitle
          subtitle: 'Open document',
          perform: () => navigate({ to: `/n/${doc.id}` }),
          keywords: doc.title.toLowerCase(),
        }
      })
    }

    return [
      ...actions,
      {
        id: 'create-doc',
        name: `Create document titled ${query}`,
        subtitle: 'Create a new document',
        perform: () => {
          navigate({ to: `/n/${query}` })
        },
        keywords: `create ${query}`,
      },
    ]
  }, [searchDocs.data, navigate, query])

  console.log({ actions })

  useRegisterActions(actions, [actions, debouncedQuery])

  return (
    <KBarModal>
      <KBarSearchInput placeholder="Search documents…" />
      <div className="overflow-y-auto">
        <KBarResultRenderer />
      </div>
    </KBarModal>
  )
}

interface DocumentSearchProps {
  children: React.ReactNode
}

export const DocumentSearch: React.FC<DocumentSearchProps> = ({ children }) => {
  return (
    <KBarProvider actions={[]}>
      <DocumentSearchContent />
      {children}
    </KBarProvider>
  )
}

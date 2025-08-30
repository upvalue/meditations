declare const TEKNE_GIT_INFO: { hash: string; message: string }

import React from 'react'
import { truncate } from 'lodash-es'

export function Version() {
  const gitInfo = TEKNE_GIT_INFO
  const fullHash = gitInfo.hash
  const shortHash = gitInfo.hash.slice(0, 10)
  const message = gitInfo.message

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Version Information</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Git Commit</h3>
          <div className="bg-zinc-800 rounded p-3 font-mono text-sm">
            <div className="mb-2">
              <span className="text-zinc-400">Hash:</span>{' '}
              <span className="text-emerald-400">{fullHash}</span>
            </div>
            <div>
              <span className="text-zinc-400">Message:</span>{' '}
              <span className="text-zinc-200">{message}</span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}
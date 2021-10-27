import React from 'react'
import { NodePen } from 'glib'

type DataTreePreviewProps = {
  elementId: string
  parameterId: string
  tree?: NodePen.DataTree
}

export const DataTreePreview = ({ elementId, parameterId, tree }: DataTreePreviewProps): React.ReactElement => {
  const prefix = `${elementId}-${parameterId}-data-`
  return (
    <div className="w-full p-2 flex flex-col justify-start items-center">
      {Object.entries(tree ?? {}).map(([path, values]) => (
        <>
          <div key={`${prefix}${path}`} className="w-full h-8 flex items-center justify-end">
            {path}
          </div>
          {values.map((value, i) => (
            <div key={`${prefix}${path}-value-${i}`} className="w-full h-8 flex items-center">
              <div className="w-8 h-8 flex justify-center items-center">{i}</div>
              <div className="h-8 flex-grow flex justify-end items-center overflow-hidden whitespace-nowrap">
                {value.value}
              </div>
            </div>
          ))}
        </>
      ))}
    </div>
  )
}

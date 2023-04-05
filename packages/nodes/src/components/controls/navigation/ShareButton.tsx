import React, { useCallback } from 'react'
import { NavigationButton, NavigationIcon } from '../common'

export const ShareButton = (): React.ReactElement => {
  const handleClick = useCallback((_e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('ShareButton')
  }, [])

  const d =
    'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z'

  return <NavigationButton onClick={handleClick}>{<NavigationIcon d={d} />}</NavigationButton>
}

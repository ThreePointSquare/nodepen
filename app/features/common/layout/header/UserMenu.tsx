import { useSessionManager } from '@/context/session'
import { firebase } from 'context/session/auth/firebase'
import auth from 'firebase'

export const UserMenu = (): React.ReactElement => {
  const { user } = useSessionManager()

  const handleSignOut = (): void => {
    firebase
      .auth()
      .signOut()
      .then(() => {
        window.location.reload()
      })
  }

  return (
    <>
      <div>{user?.displayName}</div>
      <button onClick={handleSignOut}>Sign out</button>
    </>
  )
}

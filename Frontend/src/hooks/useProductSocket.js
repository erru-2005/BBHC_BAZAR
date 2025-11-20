import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { initSocket, getSocket } from '../utils/socket'

const EVENT_NAMES = ['product_created', 'product_updated']

const useProductSocket = (handler) => {
  const { token } = useSelector((state) => state.auth)

  useEffect(() => {
    if (!handler) {
      return undefined
    }
    const socket = getSocket() || initSocket(token)

    EVENT_NAMES.forEach((event) => socket.on(event, handler))

    return () => {
      EVENT_NAMES.forEach((event) => socket.off(event, handler))
    }
  }, [handler, token])
}

export default useProductSocket


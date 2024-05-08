import { useSearchParams } from 'react-router-dom'

export function handleClearFilter(state: string) {
  const [searchParams, setSearchParams] = useSearchParams()
  setSearchParams((state) => {
    state.delete('treatmentId')
    state.delete('clientName')
    state.set('status', 'all')
    state.set('page', '1')

    return state
  })

  reset({
    treatmentId: '',
    clientName: '',
    status: 'all',
  })
}

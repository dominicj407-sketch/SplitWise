import { Chip } from '@mui/material'
import type { PaymentState } from '@api/types'

export default function StatusChip({ state }: { state: PaymentState }) {
  const color = state === 'CONFIRMED' ? 'success' : state === 'MARKED_AS_PAID' ? 'warning' : 'error'
  return <Chip size="small" label={state} color={color as any} />
}

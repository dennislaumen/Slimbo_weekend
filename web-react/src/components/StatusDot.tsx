import { statusOf } from '../domain/labels'
import type { MemberStatus } from '../domain/types'

export const StatusDot = ({ status }: { status: MemberStatus | undefined }) => (
  <span className="dot" style={{ background: statusOf(status).color }} />
)

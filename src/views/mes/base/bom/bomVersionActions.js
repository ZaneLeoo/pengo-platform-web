export const VERSION_STATUS = {
  DRAFT: 'DRAFT',
  EFFECTIVE: 'EFFECTIVE',
  FROZEN: 'FROZEN'
}

export const APPROVE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
}

export function canSetDefault(record) {
  return record.defaultFlag !== 1
    && record.status === VERSION_STATUS.EFFECTIVE
    && record.approveStatus === APPROVE_STATUS.APPROVED
}

export function getVersionActionPayload(record, action) {
  if (action === 'activate') {
    return {
      id: record.id,
      status: VERSION_STATUS.EFFECTIVE,
      approveStatus: APPROVE_STATUS.APPROVED
    }
  }
  if (action === 'freeze') {
    return {
      id: record.id,
      status: VERSION_STATUS.FROZEN
    }
  }
  return { id: record.id }
}

export function getVersionRowActions(record) {
  const actions = []
  if (canSetDefault(record)) actions.push('setDefault')
  if (record.status === VERSION_STATUS.DRAFT) actions.push('activate')
  if (record.status === VERSION_STATUS.EFFECTIVE) actions.push('freeze')
  actions.push('edit')
  if (record.defaultFlag !== 1 && record.status === VERSION_STATUS.DRAFT) actions.push('delete')
  return actions
}

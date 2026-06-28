import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canSetDefault,
  getVersionActionPayload,
  getVersionRowActions
} from './bomVersionActions.js'

test('effective approved version can be set as default', () => {
  assert.equal(canSetDefault({ status: 'EFFECTIVE', approveStatus: 'APPROVED', defaultFlag: 0 }), true)
})

test('draft version cannot be set as default', () => {
  assert.equal(canSetDefault({ status: 'DRAFT', approveStatus: 'APPROVED', defaultFlag: 0 }), false)
})

test('activate action marks version effective and approved', () => {
  assert.deepEqual(getVersionActionPayload({ id: 7 }, 'activate'), {
    id: 7,
    status: 'EFFECTIVE',
    approveStatus: 'APPROVED'
  })
})

test('freeze action marks version frozen', () => {
  assert.deepEqual(getVersionActionPayload({ id: 7 }, 'freeze'), {
    id: 7,
    status: 'FROZEN'
  })
})

test('row actions expose lightweight lifecycle controls', () => {
  assert.deepEqual(getVersionRowActions({ status: 'DRAFT', approveStatus: 'PENDING', defaultFlag: 0 }), ['activate', 'edit', 'delete'])
  assert.deepEqual(getVersionRowActions({ status: 'EFFECTIVE', approveStatus: 'APPROVED', defaultFlag: 0 }), ['setDefault', 'freeze', 'edit'])
  assert.deepEqual(getVersionRowActions({ status: 'FROZEN', approveStatus: 'APPROVED', defaultFlag: 0 }), ['edit'])
})

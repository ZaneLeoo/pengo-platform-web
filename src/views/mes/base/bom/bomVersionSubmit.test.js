import test from 'node:test'
import assert from 'node:assert/strict'
import { submitBomVersionForm } from './bomVersionSubmit.js'

test('copy submits to copy API with source and target version fields', async () => {
  const calls = []
  await submitBomVersionForm({
    isEdit: false,
    isCopy: true,
    form: {
      id: undefined,
      sourceVersionId: 12,
      versionCode: 'V2.0',
      versionName: '量产版',
      bomMasterId: 3,
      baseQty: 1
    },
    addBomVersion: (payload) => calls.push(['add', payload]),
    updateBomVersion: (payload) => calls.push(['update', payload]),
    copyBomVersion: (payload) => calls.push(['copy', payload])
  })

  assert.deepEqual(calls, [[
    'copy',
    { sourceVersionId: 12, targetVersionCode: 'V2.0', targetVersionName: '量产版' }
  ]])
})

test('add submits full form to add API', async () => {
  const calls = []
  const form = { bomMasterId: 3, versionCode: 'V1.0', versionName: '初版' }

  await submitBomVersionForm({
    isEdit: false,
    isCopy: false,
    form,
    addBomVersion: (payload) => calls.push(['add', payload]),
    updateBomVersion: (payload) => calls.push(['update', payload]),
    copyBomVersion: (payload) => calls.push(['copy', payload])
  })

  assert.deepEqual(calls, [['add', form]])
})

test('edit submits full form to update API', async () => {
  const calls = []
  const form = { id: 9, bomMasterId: 3, versionCode: 'V1.0' }

  await submitBomVersionForm({
    isEdit: true,
    isCopy: false,
    form,
    addBomVersion: (payload) => calls.push(['add', payload]),
    updateBomVersion: (payload) => calls.push(['update', payload]),
    copyBomVersion: (payload) => calls.push(['copy', payload])
  })

  assert.deepEqual(calls, [['update', form]])
})

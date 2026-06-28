import test from 'node:test'
import assert from 'node:assert/strict'
import { isPositiveNumber, validatePositiveNumber } from './bomItemValidation.js'

test('isPositiveNumber only accepts numbers greater than zero', () => {
  assert.equal(isPositiveNumber(1), true)
  assert.equal(isPositiveNumber(0.001), true)
  assert.equal(isPositiveNumber(0), false)
  assert.equal(isPositiveNumber(-1), false)
  assert.equal(isPositiveNumber(null), false)
})

test('validatePositiveNumber rejects zero with configured message', async () => {
  await assert.rejects(
    validatePositiveNumber('用量必须大于0')(null, 0),
    /用量必须大于0/
  )
})

test('validatePositiveNumber resolves positive values', async () => {
  await assert.doesNotReject(validatePositiveNumber('用量必须大于0')(null, 1))
})

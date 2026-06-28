import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMaterialOption, resolveBomItemMaterial } from './bomItemMaterialResolve.js'

test('builds material select option from bom item record with existing material id', async () => {
  const form = {
    componentItemId: 8,
    componentItemCode: 'BAT-18650',
    componentItemName: '锂电池'
  }
  const options = []

  await resolveBomItemMaterial({
    form,
    materialOptions: options,
    listMaterial: async () => ({ rows: [] })
  })

  assert.deepEqual(options, [{ label: 'BAT-18650 锂电池', value: 8 }])
})

test('resolves missing material id by component item code', async () => {
  const form = {
    componentItemId: null,
    componentItemCode: 'BAT-18650',
    componentItemName: '锂电池',
    componentItemSpec: '',
    componentItemUnit: ''
  }
  const options = []

  await resolveBomItemMaterial({
    form,
    materialOptions: options,
    listMaterial: async (query) => {
      assert.deepEqual(query, { pageNum: 1, pageSize: 10, materialCode: 'BAT-18650' })
      return { rows: [{ materialId: 9, materialCode: 'BAT-18650', materialName: '锂电池', spec: '18650', unit: '颗' }] }
    }
  })

  assert.equal(form.componentItemId, 9)
  assert.equal(form.componentItemSpec, '18650')
  assert.equal(form.componentItemUnit, '颗')
  assert.deepEqual(options, [{ label: 'BAT-18650 锂电池', value: 9 }])
})

test('buildMaterialOption returns null without material id', () => {
  assert.equal(buildMaterialOption({ materialCode: 'A' }), null)
})

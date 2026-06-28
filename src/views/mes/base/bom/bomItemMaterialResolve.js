export function buildMaterialOption(material) {
  const value = material.materialId ?? material.componentItemId
  if (!value) return null

  const code = material.materialCode ?? material.componentItemCode ?? ''
  const name = material.materialName ?? material.componentItemName ?? ''
  return {
    label: `${code} ${name}`.trim(),
    value
  }
}

export async function resolveBomItemMaterial({ form, materialOptions, listMaterial }) {
  if (form.componentItemId) {
    appendOption(materialOptions, buildMaterialOption(form))
    return
  }
  if (!form.componentItemCode) return

  const res = await listMaterial({ pageNum: 1, pageSize: 10, materialCode: form.componentItemCode })
  const material = (res.rows || []).find(item => item.materialCode === form.componentItemCode) || (res.rows || [])[0]
  if (!material) return

  form.componentItemId = material.materialId
  form.componentItemCode = material.materialCode || form.componentItemCode
  form.componentItemName = material.materialName || form.componentItemName
  form.componentItemSpec = material.spec || form.componentItemSpec
  form.componentItemUnit = material.unit || form.componentItemUnit
  appendOption(materialOptions, buildMaterialOption(material))
}

function appendOption(options, option) {
  if (!option) return
  const exists = options.some(item => item.value === option.value)
  if (!exists) options.unshift(option)
}

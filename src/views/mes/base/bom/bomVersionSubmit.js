export function buildCopyBomVersionPayload(form) {
  return {
    sourceVersionId: form.sourceVersionId,
    targetVersionCode: form.versionCode,
    targetVersionName: form.versionName || ''
  }
}

export function submitBomVersionForm({
  isEdit,
  isCopy,
  form,
  addBomVersion,
  updateBomVersion,
  copyBomVersion
}) {
  if (isEdit) {
    return updateBomVersion(form)
  }
  if (isCopy) {
    return copyBomVersion(buildCopyBomVersionPayload(form))
  }
  return addBomVersion(form)
}

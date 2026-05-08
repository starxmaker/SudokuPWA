export async function readClipboardText(): Promise<string | null> {
  const readText = navigator.clipboard?.readText
  if (typeof readText !== 'function') return null
  return await readText.call(navigator.clipboard)
}

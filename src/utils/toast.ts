type ToastListener = (message: string, type?: 'info' | 'error' | 'success') => void

let listener: ToastListener | null = null

export function registerToastListener(fn: ToastListener) {
  listener = fn
}

export function showToast(message: string, type: 'info' | 'error' | 'success' = 'info') {
  listener?.(message, type)
}

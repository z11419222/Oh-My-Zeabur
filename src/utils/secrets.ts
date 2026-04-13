const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+='

export function generateSecret(length = 32): string {
  const chars = []
  const cryptoApi = globalThis.crypto
  const values = new Uint32Array(length)
  cryptoApi.getRandomValues(values)

  for (let i = 0; i < length; i += 1) {
    chars.push(alphabet[values[i] % alphabet.length])
  }

  return chars.join('')
}

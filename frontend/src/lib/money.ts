const INR_INPUT_PATTERN = /^\d+(?:\.\d{1,2})?$/

export function parseInrToPaise(input: string): bigint {
  const normalized = input.trim()

  if (!normalized) {
    throw new Error('Amount is required')
  }

  if (!INR_INPUT_PATTERN.test(normalized)) {
    throw new Error('Enter a positive INR amount with at most two decimal places')
  }

  const [rupees, fractional = ''] = normalized.split('.')
  const paise = BigInt(rupees) * 100n + BigInt(fractional.padEnd(2, '0'))

  if (paise <= 0n) {
    throw new Error('Amount must be greater than zero')
  }

  return paise
}

function groupIndianDigits(value: string): string {
  if (value.length <= 3) {
    return value
  }

  const finalThree = value.slice(-3)
  const leading = value.slice(0, -3)
  const groupedLeading = leading.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${groupedLeading},${finalThree}`
}

export function formatPaise(paise: bigint, includePaise = false): string {
  if (paise < 0n) {
    throw new Error('Cannot format a negative amount')
  }

  const rupees = paise / 100n
  const remainder = paise % 100n
  const decimal = includePaise || remainder !== 0n ? `.${remainder.toString().padStart(2, '0')}` : ''

  return `₹${groupIndianDigits(rupees.toString())}${decimal}`
}

export function paiseToDecimalString(paise: bigint): string {
  if (paise < 0n) {
    throw new Error('Cannot serialize a negative amount')
  }

  const rupees = paise / 100n
  const remainder = paise % 100n
  return `${rupees}.${remainder.toString().padStart(2, '0')}`
}

export const regexes = [
  '\\[(?<timestamp>\\d{1,2}/\\d{1,2}/\\d{2,4},\\s\\d{1,2}:\\d{2}:\\d{2}\\s(?:AM|PM))\\]\\s(?<user>[^:]+):\\s(?<message>.*)',
  '(?<timestamp>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})\\s<(?<user>[^>]+)>\\s(?<message>.*)',
  '(?<timestamp>\\d{4}-\\d{2}-\\d{2},\\s\\d{1,2}:\\d{2}\\s[ap]\\.?m\\.?)\\s-\\s(?<user>[^:]+):\\s(?<message>.*)',
]

// Standard ANSI escape sequence regex (covers CSI, OSC, and some private sequences).
// Limitation: complex multi-byte or non-standard sequences may not be fully stripped.
// For full correctness, a dedicated ANSI parser library (e.g., ansi-regex or ansi-parser)
// would be needed. This regex handles the vast majority of sequences emitted by Claude Code.
const ANSI_RE =
  /[][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, '');
}

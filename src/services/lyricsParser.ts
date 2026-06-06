export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export function parseLrc(lrcText: string): LyricLine[] {
  if (!lrcText) return [];
  
  const lines = lrcText.split('\n');
  const parsedLines: LyricLine[] = [];
  
  // Regex to match [mm:ss.xx] or [mm:ss.xxx]
  const timeRegExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  
  for (const line of lines) {
    const match = timeRegExp.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      let msStr = match[3];
      if (msStr.length === 2) {
        msStr += '0';
      }
      const milliseconds = parseInt(msStr, 10);
      
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegExp, '').trim();
      
      if (text) {
        parsedLines.push({ time: timeInSeconds, text });
      }
    }
  }
  
  return parsedLines.sort((a, b) => a.time - b.time);
}

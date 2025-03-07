function QsMatchText({
  name,
  matchIndex,
}: {
  name: string;
  matchIndex: { start: number; end: number }[];
}) {
  const splitText = [];
  let start = 0;
  for (const mi of matchIndex) {
    const nonMatch = name.substring(start, mi.start);
    if (nonMatch) {
      splitText.push({ text: nonMatch, isMatch: false });
    }
    splitText.push({ text: name.substring(mi.start, mi.end), isMatch: true });
    start = mi.end;
  }
  if (start < name.length) {
    splitText.push({ text: name.substring(start), isMatch: false });
  }
  return splitText.map(({ text, isMatch }) => isMatch ? (
    <span key={text} className="text-[#ec802e]">{text}</span>
  ) : (<span key={text}>{text}</span>));
}

export default QsMatchText;

import { For, Match, Switch } from "solid-js";

function QsMatchText({
  name,
  matchIndex,
}: {
  name: string;
  matchIndex: { start: number; end: number }[];
}) {
  let splitText = [];
  let start = 0;
  for (let mi of matchIndex) {
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
  return (
    <For each={splitText}>
      {({ text, isMatch }) => (
        <Switch>
          <Match when={isMatch}>
            <span class="text-[#ec802e]">{text}</span>
          </Match>
          <Match when={!isMatch}>
            <span>{text}</span>
          </Match>
        </Switch>
      )}
    </For>
  );
}

export default QsMatchText;

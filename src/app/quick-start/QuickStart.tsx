import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { QuickSearchApp } from "../types";
import { fetchApps } from "../../api";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import pinyin from "pinyin";

import "./quick-start.css";

function QuickStart() {
  const [searchText, setSearchText] = createSignal("");
  const [apps, { refetch }] = createResource<{ data: QuickSearchApp[] }>(
    fetchApps
  );
  createEffect(() => {
    apps()?.data.forEach((app) => {
      console.log("pinyin", pinyin(app.name, { style: "normal" }));
    });
  });
  // const fuse = createMemo(
  //   () => new Fuse(apps()?.data || [], { keys: ["name"] })
  // );

  let container: HTMLDivElement | undefined;

  const searchApps = createMemo(() => {
    const data = apps()?.data || [];
    const text = searchText().toLowerCase();
    const abbrs = text.split("");
    if (!text) {
      return [];
    }
    const matchs = [];
    const now = Date.now();
    for (let d of data) {
      const name = d.name.toLowerCase();
      if (name.includes(text)) {
        matchs.push(d);
        continue;
      }
      const nameWords = name.split(" ");
      if (nameWords.join("").includes(text)) {
        matchs.push(d);
        continue;
      }
      let match = abbrs.every((abbr, index) => {
        const word = nameWords[index];
        return word && word.startsWith(abbr);
      });
      if (match) {
        matchs.push(d);
        continue;
      }
      if (!/[^\x00-\x7F]/.test(name)) {
        continue;
      }
      const pinyinArr = pinyin(name, { style: "normal" });
      let matchIndex = 0;
      for (let i = 0; i < pinyinArr.length; i++) {
        const word = pinyinArr[i];
        const abbr = abbrs[matchIndex];
        if (!abbr) {
          break;
        }
        if (word[0].startsWith(abbr)) {
          match = true;
          matchIndex++;
          if (i === pinyinArr.length - 1 && matchIndex < abbrs.length) {
            match = false;
          }
        } else {
          match = false;
        }
      }
      if (match) {
        matchs.push(d);
        continue;
      }
      matchIndex = 0;
      for (let p of pinyinArr) {
        const sw = text.substring(matchIndex);
        if (!sw) {
          break;
        }
        if (sw.startsWith(p[0]) || p[0].startsWith(sw)) {
          matchIndex += p[0].length;
          match = true;
        } else {
          match = false;
        }
      }
      if (matchIndex < text.length) {
        match = false;
      }
      if (match) {
        matchs.push(d);
        continue;
      }
    }
    console.log("耗时：", Date.now() - now);
    return matchs;
  });

  let currentWindow = getCurrentWindow();

  onMount(() => {
    if (container) {
      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const { width, height } = entry.contentRect;
          currentWindow.setSize(new LogicalSize(width, height));
        });
      });

      observer.observe(container);

      onCleanup(() => {
        observer.disconnect();
      });
    }
  });

  return (
    <div
      class="w-screen bg-slate-100 dark:bg-[#2f2f2f] overflow-hidden"
      ref={container}
    >
      <div class="h-[60px]">
        <input
          type="text"
          class="w-full h-full outline-none bg-transparent px-3 text-2xl font-light"
          placeholder="Hi, Sider"
          value={searchText()}
          onInput={(e) => setSearchText(e.currentTarget.value)}
        />
      </div>
      <Show when={searchApps().length > 0}>
        <div class="px-3">
          <h4>最佳搜索结果</h4>
          <div class="flex flex-wrap my-2">
            <For each={searchApps()}>
              {(item) => (
                <div class="w-[80px] h-[84px] rounded-md hover:bg-[rgb(87,87,87)] flex flex-col items-center py-2 px-1 cursor-pointer">
                  <img
                    class="object-contain w-8 h-8"
                    src={"data:image/png;base64," + item.icon}
                    alt=""
                  />
                  <div class="text-xs pt-2 break-all text-center text-ellipsis line-clamp-2">
                    {item.name}
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default QuickStart;

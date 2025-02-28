import {
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { QuickSearchApp } from "../types";
import { fetchApps, runApp } from "../../api";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

import "./quick-start.css";
import { filterMatchs } from "./match";
import QsMatchText from "./QsMatchText";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

function QuickStart() {
  const [searchText, setSearchText] = createSignal("");
  const [apps, { refetch }] = createResource<{ data: QuickSearchApp[] }>(
    fetchApps
  );
  // createEffect(() => {
  //   apps()?.data.forEach((app) => {
  //     console.log("pinyin", pinyin(app.name, { style: "normal" }));
  //   });
  // });
  // const fuse = createMemo(
  //   () => new Fuse(apps()?.data || [], { keys: ["name"] })
  // );

  let container: HTMLDivElement | undefined;

  const searchApps = createMemo(() => {
    const data = apps()?.data || [];
    const text = searchText().toLowerCase();
    return filterMatchs(data, text).sort(
      (a, b) => a.matchIndex[0].start - b.matchIndex[0].start
    );
  });

  let currentWindow = getCurrentWindow();
  let unMount = false;

  onMount(() => {
    let unlisten: () => void | undefined;
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
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        currentWindow.hide();
      }
    };
    window.addEventListener("keyup", handleKeyUp);
    currentWindow
      .onFocusChanged((event) => {
        if (!event.payload) {
          currentWindow.hide();
        }
      })
      .then((_unlisten) => {
        if (!unMount) {
          unlisten = _unlisten;
        } else {
          _unlisten();
        }
      });
    register("Alt+X", async (event) => {
      if (event.state === "Pressed") {
        if (await currentWindow.isVisible()) {
          currentWindow.hide();
        } else {
          currentWindow.show();
          refetch();
          setSearchText("");
          currentWindow.setAlwaysOnTop(true);
          currentWindow.setFocus();
        }
      }
    });
    onCleanup(() => {
      unMount = true;
      unlisten?.();
      unregister("Alt+X");
      window.removeEventListener("keyup", handleKeyUp);
    });
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
          autofocus
          onInput={(e) => setSearchText(e.currentTarget.value)}
        />
      </div>
      <Show when={searchApps().length > 0}>
        <div class="px-3">
          <h4>最佳搜索结果</h4>
          <div class="flex flex-wrap my-2">
            <For each={searchApps()}>
              {({ item, matchIndex }) => (
                <div
                  onClick={() => {
                    runApp(item.id);
                    setSearchText("");
                  }}
                  class="w-[80px] h-[88px] rounded-md hover:bg-[rgb(87,87,87)] flex flex-col items-center py-2 px-1 cursor-pointer"
                >
                  <img
                    class="object-contain w-8 h-8"
                    src={
                      "http://localhost:8088/sys/quick_search/app_icon/" +
                      item.id
                    }
                    alt=""
                  />
                  <div class="text-xs pt-2 break-all text-center text-ellipsis line-clamp-2">
                    <QsMatchText name={item.name} matchIndex={matchIndex} />
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

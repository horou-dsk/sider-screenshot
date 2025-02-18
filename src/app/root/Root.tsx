import { createSignal, For, Match, Switch } from "solid-js";
import { screen_capture } from "../screenshot/capture";
import { open } from "@tauri-apps/plugin-dialog";
import { chat, embedding_with_file, vector_search } from "../../api";
import MarkDownRender from "./MarkDownRender";

function prompt(context: string) {
  return `# Role: 知识库专家。

 ## Constraints:
 - **严格遵循工作流程**： 严格遵循<Workflow >中设定的工作流程。
 - **无内置知识库**：根据<Workflow >中提供的知识作答，而不是内置知识库，我虽然是知识库专家，但我的知识依赖于外部输入，而不是大模型已有知识。
 - **回复格式**：在进行回复时，不能输出”<context>”或“</context>”标签字样，同时也不能直接透露知识片段原文。
  
 ## Workflow:
 步骤1. **接收查询**：接收用户的问题。
 步骤2. **伦理审查**：审查用户提出的问题，并基于“<Ethics>”中写明的规则进行伦理审查。如果审查不通过，则拒绝进行回复。
 步骤3. **提供回答**：
\`\`\`
 ​
 <context>
 ${context}
 </context> 
 ​
 基于“<context>”至“</context>”中的知识片段回答用户的问题。如果没有知识片段，则诚实的告诉用户，我不知道。否则进行回复。
 \`\`\`
 ## Example:

 步骤1：用户询问：“中国的首都是哪个城市？” 。
 1.1知识库专家检索知识库，首先检查知识片段，如果“<context>”至“</context>”标签中没有内容，则不能进行回复。
 1.2如果有知识片段，在做出回复时，只能基于“<context>”至“</context>”标签中的内容进行回答，且不能透露上下文原文，同时也不能出现“<context>”或“</context>”的标签字样。`;
}

type ChatMsg = {
  id: number;
  text: string;
  type: "me" | "other";
};

function Root() {
  let chatId = 0;
  const [text, setText] = createSignal("");
  const [chats, setChats] = createSignal<ChatMsg[]>([
    {
      id: chatId++,
      text: "你好",
      type: "me",
    },
    {
      id: chatId++,
      text: "\u003cthink\u003e嗯，我现在遇到了一个代码片段，\u003c/think\u003e",
      type: "other",
    },
    {
      id: chatId++,
      text: `
# Hello World

<think>This is a custom tag!</think>
`,
      type: "other",
    },
  ]);
  const [rag, setRag] = createSignal(false);
  const handleChat = async () => {
    setChats((prev) => [...prev, { id: chatId++, text: text(), type: "me" }]);
    const _text = text();
    setText("");
    let messages: { content: string; role: string }[];
    if (rag()) {
      const { data } = await vector_search(
        "lrs33/bce-embedding-base_v1",
        _text,
        8
      );
      messages = [
        { role: "system", content: prompt(data.join("\n")) },
        { content: _text, role: "user" },
      ];
    } else {
      messages = [
        { role: "system", content: "" },
        { content: _text, role: "user" },
      ];
    }

    chat("deepseek-r1:14b", messages).then(async (reader) => {
      const _chats = chats().slice(0);
      const _chat: ChatMsg = {
        id: chatId++,
        text: "",
        type: "other",
      };
      while (reader) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("done");
          break;
        }
        const text = new TextDecoder().decode(value);
        const json = JSON.parse(
          text.replace(/^data: /, "").replace(/data:\s+$/, "")
        );
        _chat.text += json.message.content;
        setChats(_chats.concat([{ ..._chat }]));
      }
    });
  };
  return (
    <div class="h-screen w-screen bg-slate-100 dark:bg-[#2f2f2f]">
      <div class="h-full flex flex-col px-2">
        <div class="flex-1 py-2">
          <For each={chats()}>
            {(chat) => (
              <div
                class="mb-2"
                classList={{ "text-right": chat.type === "me" }}
              >
                <Switch>
                  <Match when={chat.type === "me"}>
                    <span>{chat.text}</span>
                  </Match>
                  <Match when={chat.type === "other"}>
                    <MarkDownRender children={chat.text} />
                  </Match>
                </Switch>
              </div>
            )}
          </For>
        </div>
        <div>
          <textarea
            class="w-full outline-none bg-slate-500 resize-none p-2 rounded-sm dark:text-slate-100"
            name=""
            rows="3"
            id=""
            value={text()}
            onInput={(e) => setText(e.currentTarget.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleChat();
              }
            }}
          ></textarea>
          <div class="flex justify-end gap-2 mb-2">
            <div class="flex items-center gap-1">
              <input
                type="checkbox"
                class="checkbox checkbox-primary"
                id="checkboxPrimary"
                checked={rag()}
                onChange={(e) => setRag(e.currentTarget.checked)}
              />
              <label class="label label-text text-base" for="checkboxPrimary">
                Rag
              </label>
            </div>
            <button
              class="bg-blue-500 text-white px-4 py-2 rounded-md"
              onClick={async () => {
                await screen_capture();
              }}
            >
              截屏
            </button>
            <button
              onClick={() => setChats([])}
              class="bg-red-500 text-white px-4 py-2 rounded-md"
            >
              清理
            </button>
            <button
              class="bg-neutral-300 text-white px-4 py-2 rounded-md"
              onClick={async () => {
                const f = await open({
                  multiple: false,
                  directory: false,
                  filters: [
                    {
                      name: "*",
                      extensions: ["pdf"],
                    },
                  ],
                });
                if (f) {
                  embedding_with_file("lrs33/bce-embedding-base_v1", f).then(
                    console.log
                  );
                }
              }}
            >
              选择pdf
            </button>
            <button
              class="bg-blue-500 text-white px-4 py-2 rounded-md"
              onClick={handleChat}
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Root;

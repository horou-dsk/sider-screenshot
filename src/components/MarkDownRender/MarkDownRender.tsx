import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
// import { visit } from "unist-util-visit";
import styles from "./markdown-render.module.scss";
import rehypeHighlight, {type Options as HighlightOptions} from "rehype-highlight";

// function remarkThink() {
//   return (tree: any) =>
//     visit(tree, "html", (node, index, parent) => {
//       // console.log(node.value, index, parent);
//       return parent.children;
//     });
// }

const SpanOpacity = React.memo(({ children }: { children: string }) => {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(1);
    }, 100);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  return (
    <span style={{ opacity: opacity, transition: "opacity 0.5s" }}>{children}</span>
  );
});

const POpacity: Components["p"] = React.memo(({ children }) => {
  const childrens = useRef<string[]>([]);
  const index = useRef(0);
  if (typeof children === "string") {
    if (index.current !== children.length) {
      childrens.current.push((children as string).substring(index.current));
      index.current = (children as string).length;
    }
  } else if (Array.isArray(children)) {
    childrens.current = children;
  }
  return (
    <p>
      {childrens.current.map((v, index) => (
        <SpanOpacity key={index}>{v}</SpanOpacity>
      ))}
    </p>
  );
});

const CodeOpacity: Components["code"] = React.memo(({ children, className }) => {
  const childrens = useRef<string[]>([]);
  const index = useRef(0);
  const childrenLength = useRef(0);
  // console.log(children);
  if (typeof children === "string") {
    const _children = children.slice(0, children.length - 1);
    if (childrenLength.current > children.length) {
      return <code className={className}>{children}</code>;
    }
    if (childrenLength.current !== children.length) {
      childrens.current.push(_children.substring(index.current));
      index.current = _children.length;
      childrenLength.current = children.length;
    }
  } else if (Array.isArray(children)) {
    childrens.current = children;
  }

  return (
    <code className={className}>{childrens.current.map((v, index) => (<SpanOpacity key={index}>{v}</SpanOpacity>))}</code>
  );
});

const MarkdownComponents: Components = {
  p: POpacity,
  code: CodeOpacity,
}

function MarkDownRender({ children }: { children: string }) {
  return (
    <div className={styles.main}>
      <ReactMarkdown
        rehypePlugins={[[
          rehypeHighlight, { detect: true } satisfies HighlightOptions
        ]]}
        remarkPlugins={[remarkGfm]}
        components={MarkdownComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default React.memo(MarkDownRender);

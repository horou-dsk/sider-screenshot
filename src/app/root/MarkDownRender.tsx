import { SolidMarkdown } from "solid-markdown";
import { visit } from "unist-util-visit";
import rehypeRemark from "remark-rehype";
import remarkParse from "remark-parse";

function remarkThink() {
  return (tree: any) =>
    visit(tree, "html", (node, index, parent) => {
      console.log(node.value, index, parent);
      if (node.value.includes("think>")) {
        console.log("find think");
        return parent.children.map((child: any) => {
          return {
            ...child,
            type: child.type === "html" ? "text" : child.type,
          };
        });
      }
      return parent.children;
    });
}

function MarkDownRender({ children }: { children: string }) {
  return (
    <SolidMarkdown
      rehypePlugins={[rehypeRemark]}
      remarkPlugins={[remarkParse, remarkThink]}
      renderingStrategy="reconcile"
    >
      {children}
    </SolidMarkdown>
  );
}

export default MarkDownRender;

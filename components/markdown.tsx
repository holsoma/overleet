import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export function QuestionMarkdown({ children, inline = false }: { children: string; inline?: boolean }) {
  const Wrapper = inline ? "span" : "div";
  return <Wrapper className={inline ? "markdown markdown-inline" : "markdown"}><Markdown skipHtml remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { strict: "error", trust: false }]]}
    urlTransform={url => /^(https?:\/\/|\/[^/]|#)/i.test(url) ? url : ""}
    components={{ p: ({ children }) => inline ? <span>{children}</span> : <p>{children}</p>, a: ({ href, children }) => href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{children}</a> : <span>{children}</span>, img: () => null }}>{children}</Markdown></Wrapper>;
}

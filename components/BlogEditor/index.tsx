import React, { useState } from "react";
import DatePicker from "react-datepicker";
import TextareaAutosize from "react-textarea-autosize";

import Button from "../../components/Button";
import type { BlogPost, BlogPostFrontmatter } from "../../types/portfolio";

import "react-datepicker/dist/react-datepicker.css";

type EditorTab = "BLOGDETAILS" | "CONTENT";

export interface BlogEditorProps {
  post: BlogPost;
  close: () => void;
  refresh: () => void;
}

const inputCls =
  "w-full mt-2 p-4 rounded-md border-2 bg-[#1a1a1a] text-slate-100 border-white/10 hover:border-[#0070F3]/60 focus:outline-none focus:border-[#0070F3] transition-colors duration-200";

const BlogEditor = ({ post, close, refresh }: BlogEditorProps) => {
  const [currentTabs, setCurrentTabs] = useState<EditorTab>("BLOGDETAILS");
  const [blogContent, setBlogContent] = useState<string>(post.content);
  const [blogVariables, setBlogVariables] = useState<BlogPostFrontmatter>({
    date: post.date,
    title: post.title,
    tagline: post.tagline,
    preview: post.preview,
    image: post.image,
  });

  const savePost = async () => {
    if (process.env.NODE_ENV === "development") {
      await fetch("/api/blog/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: post.slug,
          content: blogContent,
          variables: blogVariables,
        }),
      }).then((data) => {
        if (data.status === 200) {
          close();
          refresh();
        }
      });
    } else {
      alert("This thing only works in development mode.");
    }
  };

  return (
    <div className="fixed z-10 w-screen h-screen overflow-auto top-0 flex flex-col items-center bg-[#121212]">
      <div className="container my-20">
        <div className="mt-10">
          <div className="z-10 sticky top-12 bg-[#121212] pb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl">{blogVariables.title}</h1>
              <div className="flex items-center">
                <Button onClick={savePost} type="primary">
                  Save
                </Button>
                <Button onClick={close}>Close</Button>
              </div>
            </div>
            <div className="flex items-center">
              <Button
                onClick={() => setCurrentTabs("BLOGDETAILS")}
                type={currentTabs === "BLOGDETAILS" ? "primary" : undefined}
              >
                Blog Details
              </Button>
              <Button
                onClick={() => setCurrentTabs("CONTENT")}
                type={currentTabs === "CONTENT" ? "primary" : undefined}
              >
                Content
              </Button>
            </div>
          </div>
        </div>

        {currentTabs === "BLOGDETAILS" && (
          <div className="mt-10">
            <div className="mt-5 flex flex-col items-center">
              <label className="w-full text-sx opacity-50">Date</label>
              <DatePicker
                selected={new Date(blogVariables.date)}
                className={inputCls}
                onChange={(date: Date | null) => {
                  if (!date) return;
                  setBlogVariables({
                    ...blogVariables,
                    date: date.toISOString(),
                  });
                }}
              />
            </div>
            <div className="mt-5 flex flex-col items-center">
              <label className="w-full text-sx opacity-50">Title</label>
              <input
                value={blogVariables.title}
                onChange={(e) =>
                  setBlogVariables({ ...blogVariables, title: e.target.value })
                }
                className={inputCls}
                type="text"
              />
            </div>
            <div className="mt-5 flex flex-col items-center">
              <label className="w-full text-sx opacity-50">Tagline</label>
              <input
                value={blogVariables.tagline}
                onChange={(e) =>
                  setBlogVariables({
                    ...blogVariables,
                    tagline: e.target.value,
                  })
                }
                className={inputCls}
                type="text"
              />
            </div>
            <div className="mt-5 flex flex-col items-center">
              <label className="w-full text-sx opacity-50">Preview (SEO)</label>
              <textarea
                value={blogVariables.preview}
                onChange={(e) =>
                  setBlogVariables({
                    ...blogVariables,
                    preview: e.target.value,
                  })
                }
                className={inputCls}
              />
            </div>
            <div className="mt-5 flex flex-col items-center">
              <label className="w-full text-sx opacity-50">Image URL</label>
              <input
                value={blogVariables.image}
                onChange={(e) =>
                  setBlogVariables({
                    ...blogVariables,
                    image: e.target.value,
                  })
                }
                className={inputCls}
                type="text"
              />
            </div>
          </div>
        )}

        {currentTabs === "CONTENT" && (
          <div className="mt-10">
            <div className="flex flex-col items-center">
              <label className="w-full text-sx opacity-50">Content</label>
              <TextareaAutosize
                className="w-full h-auto mt-5 p-4 rounded-xl border border-white/10 bg-[#1a1a1a] text-slate-100 hover:border-[#0070F3]/60 focus:outline-none focus:border-[#0070F3] transition-colors duration-200 font-mono text-sm"
                value={blogContent}
                onChange={(e) => setBlogContent(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogEditor;

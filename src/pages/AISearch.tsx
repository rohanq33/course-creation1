import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Send, Loader2, StopCircle, RefreshCw, BookOpen,
  MessageSquare, Plus, Trash2, ChevronLeft, ExternalLink, Bot, User,
  BookPlus, FileText, Lightbulb, Zap, HelpCircle,
} from "lucide-react";
import {
  type ChatMessage, type StreamMeta,
  streamChatSearch, saveMessage, loadConversations, loadConversation, deleteConversation,
} from "@/lib/chatService";
import { API_BASE_URL } from "@/lib/api";
import ReactMarkdown from "react-markdown";

function generateId() {
  return crypto.randomUUID();
}

export default function AISearch() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<{ conversation_id: string; preview: string; created_at: string }[]>([]);
  const [conversationId, setConversationId] = useState<string>(generateId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamMeta, setStreamMeta] = useState<StreamMeta | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamMetaRef = useRef<StreamMeta | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations().then(setConversations).catch(console.error);
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingContent]);

  const loadChat = useCallback(async (id: string) => {
    setConversationId(id);
    const msgs = await loadConversation(id);
    setMessages(msgs);
    setStreamingContent("");
    setStreamMeta(null);
  }, []);

  const newChat = useCallback(() => {
    setConversationId(generateId());
    setMessages([]);
    setStreamingContent("");
    setStreamMeta(null);
    inputRef.current?.focus();
  }, []);

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.conversation_id !== id));
    if (id === conversationId) newChat();
  }, [conversationId, newChat]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: ChatMessage = {
      id: generateId(), conversation_id: conversationId, role: "user",
      content: text.trim(), created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    setStreamMeta(null);

    // Save user message
    try {
      await saveMessage({ conversation_id: conversationId, role: "user", content: userMsg.content });
    } catch (e) { console.error("Failed to save user message:", e); }

    // Prepare history for context
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

    const controller = new AbortController();
    abortRef.current = controller;
    let fullContent = "";

    let latestMeta: StreamMeta | null = null;

    await streamChatSearch({
      query: userMsg.content,
      messages: history,
      onMeta: (meta) => {
        latestMeta = meta;
        streamMetaRef.current = meta;
        setStreamMeta(meta);
      },
      onDelta: (delta) => {
        fullContent += delta;
        setStreamingContent(fullContent);
      },
      onDone: async () => {
        setIsStreaming(false);
        const assistantMsg: ChatMessage = {
          id: generateId(), conversation_id: conversationId, role: "assistant",
          content: fullContent, answer_mode: latestMeta?.answer_mode || undefined,
          sources: latestMeta?.sources, suggested_queries: latestMeta?.suggested_queries,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingContent("");
        // Save assistant message
        try {
          await saveMessage({
            conversation_id: conversationId, role: "assistant", content: fullContent,
            answer_mode: latestMeta?.answer_mode, sources: latestMeta?.sources,
            suggested_queries: latestMeta?.suggested_queries,
          });
        } catch (e) { console.error("Failed to save assistant message:", e); }
        // Refresh sidebar
        loadConversations().then(setConversations).catch(console.error);
      },
      onError: (err) => {
        setIsStreaming(false);
        const errMsg: ChatMessage = {
          id: generateId(), conversation_id: conversationId, role: "assistant",
          content: `⚠️ Error: ${err}`, created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
        setStreamingContent("");
      },
      signal: controller.signal,
    });
  }, [conversationId, isStreaming, messages]);

  const regenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      setMessages((prev) => prev.slice(0, -1)); // Remove last assistant msg
      sendMessage(lastUser.content);
    }
  }, [messages, sendMessage]);

  const handleAction = useCallback((action: string, context: string) => {
    const prompts: Record<string, string> = {
      simplify: `Explain this in much simpler terms, as if I'm a complete beginner:\n\n${context}`,
      example: `Give me detailed real-world examples for:\n\n${context}`,
      expand: `Expand on this topic with more details and depth:\n\n${context}`,
      quiz: `Generate a quiz with 5 multiple-choice questions based on:\n\n${context}`,
      course: `Create a detailed course outline with modules and lessons for the topic:\n\n${context}`,
      save: `Summarize the following content into a well-structured lesson format:\n\n${context}`,
    };
    sendMessage(prompts[action] || context);
  }, [sendMessage]);

  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  const handleTurnIntoCourse = useCallback(async (content: string) => {
    if (isCreatingCourse) return;
    setIsCreatingCourse(true);
    try {
      // Extract a clean topic from the AI response
      let topic = content
        .replace(/^(sure|okay|here|let me|i'll|of course)[^.!?\n]*[.!?\n]\s*/i, "")
        .replace(/[#*`>]/g, "")
        .trim();
      // Use first sentence or first 300 chars
      const firstSentence = topic.match(/^[^.!?\n]+[.!?]/);
      topic = firstSentence ? firstSentence[0].trim() : topic.slice(0, 300).trim();

      const response = await fetch(`${API_BASE_URL}/api/generate-course`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, description: "" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Course generation failed.");
      }
      const output = data.course ? JSON.stringify(data.course, null, 2) : data.output || data.answer || data.response || "Course outline generated.";
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: "assistant",
        content: `Course generated:\n\n${output}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      toast({ title: "Course generated", description: "Course outline added to chat." });
    } catch (e: any) {
      console.error("Course generation failed:", e);
      toast({ title: "Course generation failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsCreatingCourse(false);
    }
  }, [conversationId, isCreatingCourse]);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-0 -my-4">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
            <div className="p-3 border-b border-border">
              <Button onClick={newChat} className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />New Chat
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversations.map((c) => (
                  <div
                    key={c.conversation_id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm hover:bg-accent transition-colors ${
                      c.conversation_id === conversationId ? "bg-accent" : ""
                    }`}
                    onClick={() => loadChat(c.conversation_id)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{c.preview}</span>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.conversation_id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Main Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSidebar(!showSidebar)}>
              <ChevronLeft className={`w-4 h-4 transition-transform ${showSidebar ? "" : "rotate-180"}`} />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">AI Assistant</h2>
                <p className="text-xs text-muted-foreground">Ask anything or create courses</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {messages.length === 0 && !streamingContent && (
              <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center max-w-md">
                  <h3 className="font-semibold text-lg text-foreground">AI Course Assistant</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Ask questions, explore topics, or generate entire courses from a conversation.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {["What is machine learning?", "Create a Python course", "Explain neural networks", "How does RAG work?"].map((q) => (
                    <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(q)}>
                      <Lightbulb className="w-3 h-3 mr-1" />{q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onAction={handleAction}
                  onTurnIntoCourse={handleTurnIntoCourse}
                  isCreatingCourse={isCreatingCourse}
                />
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    {streamMeta && (
                      <Badge variant={streamMeta.answer_mode === "grounded" ? "default" : "secondary"} className="text-[10px]">
                        {streamMeta.answer_mode === "grounded" ? "Based on your content" : "General AI answer"}
                      </Badge>
                    )}
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{streamingContent + "▊"}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {isStreaming && !streamingContent && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action bar */}
          {isStreaming && (
            <div className="flex justify-center py-2">
              <Button variant="outline" size="sm" onClick={stopStreaming}>
                <StopCircle className="w-4 h-4 mr-1" />Stop generating
              </Button>
            </div>
          )}

          {!isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && (
            <div className="flex justify-center py-2">
              <Button variant="ghost" size="sm" onClick={regenerate}>
                <RefreshCw className="w-4 h-4 mr-1" />Regenerate
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-4 bg-card">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask anything about your courses or generate new content..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                disabled={isStreaming}
                className="h-12 text-sm"
              />
              <Button onClick={() => sendMessage(input)} disabled={!input.trim() || isStreaming} className="h-12 px-5">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Message Bubble Component ─────────────────────────────────────
function MessageBubble({
  message,
  onAction,
  onTurnIntoCourse,
  isCreatingCourse,
}: {
  message: ChatMessage;
  onAction: (action: string, context: string) => void;
  onTurnIntoCourse: (content: string) => void;
  isCreatingCourse: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-secondary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {message.answer_mode && (
          <Badge variant={message.answer_mode === "grounded" ? "default" : "secondary"} className="text-[10px]">
            {message.answer_mode === "grounded" ? "Based on your content" : "General AI answer"}
          </Badge>
        )}

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && message.answer_mode === "grounded" && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.sources.map((s: any, i: number) => (
              <Badge key={i} variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-accent">
                <BookOpen className="w-2.5 h-2.5" />
                {s.title}
              </Badge>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onAction("simplify", message.content)}>
            <HelpCircle className="w-3 h-3 mr-1" />Simplify
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onAction("example", message.content)}>
            <Lightbulb className="w-3 h-3 mr-1" />Examples
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onAction("expand", message.content)}>
            <Zap className="w-3 h-3 mr-1" />Expand
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onAction("quiz", message.content)}>
            <FileText className="w-3 h-3 mr-1" />Quiz
          </Button>
           <Separator orientation="vertical" className="h-5 mx-1" />
           <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onTurnIntoCourse(message.content)} disabled={isCreatingCourse}>
             {isCreatingCourse ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <BookPlus className="w-3 h-3 mr-1" />}
             {isCreatingCourse ? "Creating..." : "Turn into Course"}
           </Button>
        </div>

        {/* Suggested follow-ups */}
        {message.suggested_queries && message.suggested_queries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.suggested_queries.map((sq: string, i: number) => (
              <Button key={i} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => onAction("", sq)}>
                {sq}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

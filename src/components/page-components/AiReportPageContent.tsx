"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSelector } from "react-redux";
import UpArrowIcon from "../ui/flowbiteIcons/UpArrow";
import { useGetTeamMembersQuery } from "@/app/redux/api/userApi";
import { useGetPipelineByIdQuery } from "@/app/redux/api/pipelineApi";
import { activityOptions } from "@/components/form/contactFilter/elements/ActivityFilter";
import AiReportResponseView from "./AiReportResponseView";
import VeryShortSpinnerPrimary from "@/components/ui/loaders/veryShortSpinnerPrimary";
import { AiFilterQueryResponse } from "@/app/types/ai-report";
import { RootState } from "@/app/redux/rootReducer";
import {
  useGetAiSessionsQuery,
  useLazyGetAiHistoryQuery,
  useRunAiQueryMutation,
} from "@/app/redux/api/aiReportApi";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: React.ReactNode;
};

type MentionMenuType = "users" | "stages" | "activities";

type SuggestionItem = {
  id: string;
  label: string;
  value: string;
  menu: MentionMenuType;
};

const createSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getInitialSessionId = () => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("aiSessionId") || createSessionId();
};

const MENTION_MENUS: Array<{ key: MentionMenuType; label: string }> = [
  { key: "users", label: "Users" },
  { key: "stages", label: "Stages" },
  { key: "activities", label: "Activities" },
];

const getCaretCoordinates = (
  textarea: HTMLTextAreaElement,
  value: string,
  position: number
) => {
  const mirror = document.createElement("div");
  const style = window.getComputedStyle(textarea);
  const properties = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "lineHeight",
    "letterSpacing",
    "textTransform",
    "wordSpacing",
    "textIndent",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "boxSizing",
  ] as const;

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflowWrap = "break-word";
  mirror.style.width = `${textarea.clientWidth}px`;

  properties.forEach((prop) => {
    mirror.style[prop] = style[prop];
  });

  const before = value.slice(0, position);
  const after = value.slice(position) || " ";
  mirror.textContent = before;

  const span = document.createElement("span");
  span.textContent = after[0];
  mirror.appendChild(span);
  document.body.appendChild(mirror);

  const textareaRect = textarea.getBoundingClientRect();
  const bottom = textareaRect.top + span.offsetTop - textarea.scrollTop + window.scrollY;
  const left = textareaRect.left + span.offsetLeft - textarea.scrollLeft + window.scrollX;

  document.body.removeChild(mirror);
  return { bottom, left };
};

export default function AiReportPageContent() {
  const { user } = useSelector((state: RootState) => state.user);
  const canAccessAiReport = !!user && ["admin", "team_member"].includes(user.role);

  const [queryDisplay, setQueryDisplay] = useState("");
  const [queryInternal, setQueryInternal] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<MentionMenuType | null>(null);
  const [selectedMenuChip, setSelectedMenuChip] = useState<MentionMenuType | null>(null);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [suggestionDropdownOpen, setSuggestionDropdownOpen] = useState(false);
  const [triggerIndex, setTriggerIndex] = useState<number | null>(null);
  const [caretIndex, setCaretIndex] = useState(0);
  const [typedFragment, setTypedFragment] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [sessionId, setSessionId] = useState(getInitialSessionId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsedSessionsOpen, setIsCollapsedSessionsOpen] = useState(false);
  const collapsedSessionsRef = useRef<HTMLDivElement>(null);
  const hasHydratedOnMount = useRef(false);
  const [runAiQuery] = useRunAiQueryMutation();
  const [fetchSessionHistory] = useLazyGetAiHistoryQuery();
  const { data: sessionsData, isFetching: isSessionsFetching } = useGetAiSessionsQuery(
    undefined,
    { skip: !canAccessAiReport }
  );
  const sessions = useMemo(() => sessionsData?.sessions ?? [], [sessionsData]);
  const recentSessions = useMemo(() => sessions.slice(0, 8), [sessions]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const defaultPipelineId = process.env.NEXT_PUBLIC_DEFAULT_PIPELINE || "";

  const { data: teamMembersData, isLoading: isUsersLoading } = useGetTeamMembersQuery(
    { page: 1, limit: 10, search: typedFragment },
    { skip: !(suggestionDropdownOpen && activeMenu === "users") }
  );

  const { data: pipelineData, isLoading: isStagesLoading } = useGetPipelineByIdQuery(
    defaultPipelineId,
    { skip: !(suggestionDropdownOpen && activeMenu === "stages") || !defaultPipelineId }
  );

  const suggestionItems = useMemo<SuggestionItem[]>(() => {
    if (!activeMenu) return [];

    if (activeMenu === "users") {
      const users = teamMembersData?.users || [];
      const userSuggestions = users.reduce<SuggestionItem[]>((acc, user) => {
        const rawId = user?._id;
        const name = typeof user?.name === "string" ? user.name.trim() : "";
        if (!rawId || !name) return acc;

        acc.push({
          id: String(rawId),
          label: name,
          value: name,
          menu: "users",
        });

        return acc;
      }, []);

      return userSuggestions;
    }

    if (activeMenu === "stages") {
      const stages = pipelineData?.pipeline?.stages || [];
      return stages
        .filter((stage) =>
          stage.name.toLowerCase().includes(typedFragment.trim().toLowerCase())
        )
        .map((stage) => ({
          id: stage._id,
          label: stage.name,
          value: stage.name,
          menu: "stages" as const,
        }));
    }

    return activityOptions
      .filter(
        (activity) =>
          activity.label.toLowerCase().includes(typedFragment.trim().toLowerCase()) ||
          activity.value.toLowerCase().includes(typedFragment.trim().toLowerCase())
      )
      .map((activity) => ({
        id: activity.value,
        label: activity.label,
        value: activity.label,
        menu: "activities" as const,
      }));
  }, [activeMenu, pipelineData?.pipeline?.stages, teamMembersData?.users, typedFragment]);

  const updateDropdownPosition = (value: string, nextCaretIndex: number) => {
    if (!textareaRef.current || !composerRef.current) return;
    const caretCoords = getCaretCoordinates(textareaRef.current, value, nextCaretIndex);
    const composerRect = composerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: caretCoords.bottom - composerRect.bottom + 28,
      left: Math.max(8, caretCoords.left - composerRect.left),
    });
  };

  const closeMentionMenus = () => {
    setMenuDropdownOpen(false);
    setSuggestionDropdownOpen(false);
  };

  const parseMentionState = (nextQuery: string, nextCaretIndex: number) => {
    const beforeCaret = nextQuery.slice(0, nextCaretIndex);
    const lastAtIndex = beforeCaret.lastIndexOf("@");
    if (lastAtIndex === -1) {
      closeMentionMenus();
      setTriggerIndex(null);
      setTypedFragment("");
      return;
    }

    const mentionBody = nextQuery.slice(lastAtIndex + 1, nextCaretIndex);
    const hasWhitespace = /\s/.test(mentionBody);
    if (hasWhitespace) {
      closeMentionMenus();
      setTriggerIndex(null);
      setTypedFragment("");
      return;
    }

    setTriggerIndex(lastAtIndex);
    setTypedFragment(mentionBody);
    updateDropdownPosition(nextQuery, nextCaretIndex);

    if (!selectedMenuChip) {
      setMenuDropdownOpen(true);
      setSuggestionDropdownOpen(false);
      return;
    }

    setActiveMenu(selectedMenuChip);
    setMenuDropdownOpen(false);
    setSuggestionDropdownOpen(true);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!composerRef.current) return;
      if (!composerRef.current.contains(event.target as Node)) {
        closeMentionMenus();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!collapsedSessionsRef.current) return;
      if (!collapsedSessionsRef.current.contains(event.target as Node)) {
        setIsCollapsedSessionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("aiSessionId", sessionId);
    window.history.replaceState(null, "", url.toString());
  }, [sessionId]);

  const hydrateSession = async (targetSessionId: string) => {
    setIsHydrating(true);
    try {
      const data = await fetchSessionHistory({
        sessionId: targetSessionId,
        sort: "asc",
        limit: 100,
      }).unwrap();

      const hydrated: ChatMessage[] = data.items.flatMap((item) => [
        {
          id: `${item.id}-user`,
          role: "user" as const,
          content: item.queryText,
        },
        {
          id: `${item.id}-assistant`,
          role: "assistant" as const,
          content: <AiReportResponseView response={item.response as AiFilterQueryResponse} />,
        },
      ]);

      setMessages(hydrated);
    } catch {
      // leave messages empty if a session fails to hydrate
    } finally {
      setIsHydrating(false);
    }
  };

  useEffect(() => {
    if (hasHydratedOnMount.current || typeof window === "undefined") return;
    hasHydratedOnMount.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get("aiSessionId");
    if (urlSessionId) {
      void hydrateSession(urlSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectSession = (targetSessionId: string) => {
    setIsCollapsedSessionsOpen(false);
    if (targetSessionId === sessionId || isAiLoading) return;
    setSessionId(targetSessionId);
    setMessages([]);
    void hydrateSession(targetSessionId);
  };

  const handleNewChat = () => {
    if (isAiLoading) return;
    setSessionId(createSessionId());
    setMessages([]);
    setQueryDisplay("");
    setQueryInternal("");
  };

  const handleSend = async () => {
    const trimmedDisplay = queryDisplay.trim();
    const trimmedInternal = queryInternal.trim() || trimmedDisplay;
    if (!trimmedDisplay) return;

    const timestamp = Date.now().toString();
    const userMessage: ChatMessage = {
      id: `${timestamp}-user`,
      role: "user",
      content: trimmedDisplay,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQueryDisplay("");
    setQueryInternal("");
    setSelectedMenuChip(null);
    setActiveMenu(null);
    setTriggerIndex(null);
    setTypedFragment("");
    closeMentionMenus();
    setIsAiLoading(true);

    try {
      const queryData = (await runAiQuery({
        query: trimmedInternal,
        queryDisplay: trimmedDisplay,
        sessionId,
      }).unwrap()) as AiFilterQueryResponse;

      if (queryData.sessionId && queryData.sessionId !== sessionId) {
        setSessionId(queryData.sessionId);
      }

      const assistantMessage: ChatMessage = {
        id: `${timestamp}-assistant`,
        role: "assistant",
        content: <AiReportResponseView response={queryData} />,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (runtimeError) {
      const message =
        runtimeError instanceof Error ? runtimeError.message : "Failed to process AI report query";
      const assistantMessage: ChatMessage = {
        id: `${timestamp}-assistant`,
        role: "assistant",
        content: <span className="text-red-600 dark:text-red-400">{message}</span>,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleMenuSelect = (menu: MentionMenuType) => {
    setActiveMenu(menu);
    setSelectedMenuChip(menu);
    setMenuDropdownOpen(false);
    setSuggestionDropdownOpen(true);
  };

  const handleSuggestionSelect = (item: SuggestionItem) => {
    if (triggerIndex === null || !textareaRef.current) return;
    const insertionEndIndex = caretIndex;
    const tokenDisplay = `@${item.menu}:${item.value}`;
    const tokenInternal = `@${item.menu}:${item.id}`;
    const nextDisplay = `${queryDisplay.slice(0, triggerIndex)}${tokenDisplay}${queryDisplay.slice(insertionEndIndex)}`;
    const nextInternal = `${queryInternal.slice(0, triggerIndex)}${tokenInternal}${queryInternal.slice(insertionEndIndex)}`;
    const nextCaretPos = triggerIndex + tokenDisplay.length;

    setQueryDisplay(nextDisplay);
    setQueryInternal(nextInternal);
    setTypedFragment("");
    setSuggestionDropdownOpen(false);
    setMenuDropdownOpen(false);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaretPos, nextCaretPos);
      setCaretIndex(nextCaretPos);
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      closeMentionMenus();
      return;
    }

    if (event.key === "Backspace" && typedFragment.length === 0 && suggestionDropdownOpen) {
      setSuggestionDropdownOpen(false);
      setTriggerIndex(null);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    const nextCaret = event.target.selectionStart ?? nextValue.length;
    setQueryDisplay(nextValue);
    setQueryInternal(nextValue);
    setCaretIndex(nextCaret);
    parseMentionState(nextValue, nextCaret);
  };

  const handleCaretUpdate = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    const nextCaret = target.selectionStart ?? 0;
    setCaretIndex(nextCaret);
    parseMentionState(target.value, nextCaret);
  };

  const isSuggestionsLoading =
    (activeMenu === "users" && isUsersLoading) || (activeMenu === "stages" && isStagesLoading);
  const isComposerDisabled = !queryDisplay.trim() || isAiLoading;

  if (!canAccessAiReport) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        You don&apos;t have access to this page.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)]">
      <aside
        className={`flex shrink-0 flex-col border-r border-gray-200 bg-white text-sm text-gray-700 transition-[width] duration-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 ${
          isSidebarOpen ? "w-72 p-3" : "w-14 items-center p-2"
        }`}
      >
        <div className={`mb-3 flex w-full items-center ${isSidebarOpen ? "justify-between" : "justify-center"}`}>
          {isSidebarOpen && (
            <span className="text-xs font-semibold uppercase text-gray-500">Chats</span>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarOpen((open) => !open)}
            aria-label={isSidebarOpen ? "Collapse conversations panel" : "Expand conversations panel"}
            title={isSidebarOpen ? "Collapse" : "Expand"}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg
              className={`h-4 w-4 transition-transform ${isSidebarOpen ? "" : "rotate-180"}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        </div>

        {isSidebarOpen ? (
          <>
            <button
              type="button"
              onClick={handleNewChat}
              disabled={isAiLoading}
              className="mb-3 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              + New chat
            </button>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
              <span>Conversations</span>
              {isSessionsFetching && <VeryShortSpinnerPrimary />}
            </div>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 18rem)" }}>
              {!isSessionsFetching && sessions.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500 dark:border-gray-700">
                  No conversations yet.
                </div>
              )}
              {sessions.map((session) => (
                <button
                  key={session.sessionId}
                  type="button"
                  disabled={isAiLoading}
                  onClick={() => handleSelectSession(session.sessionId)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                    session.sessionId === sessionId
                      ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="line-clamp-2 font-medium text-gray-800 dark:text-gray-100">
                    {session.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-400">
                    {formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true })}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleNewChat}
              disabled={isAiLoading}
              aria-label="New chat"
              title="New chat"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>

            <div className="relative" ref={collapsedSessionsRef}>
              <button
                type="button"
                onClick={() => setIsCollapsedSessionsOpen((open) => !open)}
                aria-label="Recent conversations"
                title="Recent conversations"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
                </svg>
                {isSessionsFetching && (
                  <span className="absolute -right-0.5 -top-0.5">
                    <VeryShortSpinnerPrimary />
                  </span>
                )}
              </button>

              {isCollapsedSessionsOpen && (
                <div className="absolute left-full top-0 z-50 ml-2 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase text-gray-500">
                    Recent conversations
                  </div>
                  {recentSessions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      No conversations yet.
                    </div>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto">
                      {recentSessions.map((session) => (
                        <li key={session.sessionId}>
                          <button
                            type="button"
                            disabled={isAiLoading}
                            onClick={() => handleSelectSession(session.sessionId)}
                            className={`w-full px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                              session.sessionId === sessionId
                                ? "bg-brand-50 dark:bg-brand-500/10"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                          >
                            <div className="line-clamp-2 font-medium text-gray-800 dark:text-gray-100">
                              {session.title}
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-400">
                              {formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true })}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex items-start justify-center border-b border-gray-200 pb-3 dark:border-gray-800">
          <div className="text-center">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">AI Report</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Contacts assistant</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pb-28">
          {isHydrating && (
            <div className="mr-auto max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              Loading conversation...
            </div>
          )}
          {!isHydrating &&
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-3xl rounded-2xl px-4 py-3 text-sm wrap-break-word hyphens-auto whitespace-pre-wrap ${
                  message.role === "user"
                    ? "ml-auto bg-brand-500 text-white"
                    : "mr-auto border border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                }`}
              >
                {message.content}
              </div>
            ))}
          {isAiLoading && (
            <div className="mr-auto max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              Preparing report...
            </div>
          )}
        </div>

        <div
          ref={composerRef}
          className="sticky bottom-0 mt-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <div className="flex items-end gap-2 ">
            <textarea
              ref={textareaRef}
              id="ai-report-query"
              value={queryDisplay}
              onChange={handleInputChange}
              onClick={handleCaretUpdate}
              onKeyUp={handleCaretUpdate}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Ask about contacts, leads, totals, or date ranges..."
              className="
                w-full resize-none rounded-lg px-3 py-2 text-sm
                border-none
                focus:border-none
                focus:outline-none
                focus:ring-0
                bg-transparent
                dark:bg-transparent
              "
            />
            <button
              className="rounded-full inline-flex items-center justify-center font-medium gap-1 transition p-2 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:text-white"
              disabled={isComposerDisabled}
              onClick={handleSend}
            >
              <UpArrowIcon />
            </button>
          </div>
          {selectedMenuChip && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                {MENTION_MENUS.find((menu) => menu.key === selectedMenuChip)?.label}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMenuChip(null);
                    setActiveMenu(null);
                    closeMentionMenus();
                  }}
                  className="rounded-full p-0.5 hover:bg-brand-200 dark:hover:bg-brand-500/30"
                  aria-label="Remove selected mention menu"
                >
                  x
                </button>
              </span>
            </div>
          )}

          {menuDropdownOpen && (
            <div
              className="absolute z-50 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
              style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
            >
              <ul className="py-1 text-sm">
                {MENTION_MENUS.map((menu) => (
                  <li key={menu.key}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                      onClick={() => handleMenuSelect(menu.key)}
                    >
                      {menu.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestionDropdownOpen && (
            <div
              className="absolute z-50 mt-1 max-h-60 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
              style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
            >
              <ul className="py-1 text-sm">
                {isSuggestionsLoading && (
                  <li className="px-3 py-2 text-gray-500 dark:text-gray-400">Loading...</li>
                )}
                {!isSuggestionsLoading && suggestionItems.length === 0 && (
                  <li className="px-3 py-2 text-gray-500 dark:text-gray-400">No results</li>
                )}
                {!isSuggestionsLoading &&
                  suggestionItems.map((item) => (
                    <li key={`${item.menu}-${item.id}`}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                        onClick={() => handleSuggestionSelect(item)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

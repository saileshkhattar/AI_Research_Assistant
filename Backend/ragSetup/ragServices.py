from ragSetup.retrieverFactory import build_retriever
from ragSetup.ragArchitecture import model

from models.agents import Agent
from models.chat import Chat
from models.message import Message
from models.savedPages import SavedPage


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def get_chat_history(db, chat_id: str, limit: int = 8) -> str:
    """Return the last `limit` messages as a formatted conversation string."""
    messages = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )
    messages.reverse()

    lines = []
    for m in messages:
        if m.role == "user":
            lines.append(f"User: {m.content}")
        elif m.role == "assistant":
            lines.append(f"Assistant: {m.content}")
    return "\n".join(lines)


def rewrite_query(model, history: str, question: str) -> str:
    """
    Rewrite the user question into a self-contained search query so
    follow-up questions ("what about that?") resolve correctly in Chroma.
    """
    prompt = (
        "You are a search query rewriter. "
        "Rewrite the user's question into a self-contained research query "
        "that can be understood without the conversation history. "
        "Return only the rewritten query — no explanation, no preamble, no quotes.\n\n"
        f"Conversation history:\n{history}\n\n"
        f"User question: {question}\n\n"
        "Standalone query:"
    )
    response = model.invoke(prompt)
    return response.content.strip()


def generate_chat_title(agent_type: str, first_message: str) -> str:
    """Generate a short title (3-6 words) from the first user message."""
    try:
        prompt = (
            "Generate a short chat title of 3 to 6 words based on this message. "
            "Return only the title — no quotes, no punctuation at the end.\n\n"
            f"Message: {first_message}\n\nTitle:"
        )
        response = model.invoke(prompt)
        title = response.content.strip().strip('"').strip("'")
        return title if title else first_message[:60]
    except Exception:
        return first_message[:60] or "New Chat"


def get_page_for_chat(db, chat_id: str):
    """Return the SavedPage linked to a chat, or None."""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat or not chat.page_id:
        return None
    return db.query(SavedPage).filter(SavedPage.id == chat.page_id).first()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN RESPONSE GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

def stream_generate_response(
    db,
    user_id: str,
    agent_id: str,
    chat_id: str,
    question: str,
    page_id: str | None = None,
):
    """
    Route the request to the correct pipeline based on agent type:

      general      → Plain LLM. No RAG. Short, direct answers.
      system_inbox → RAG scoped strictly to one page (the page linked to this chat).
                     No cross-page retrieval. No out-of-context answers.
      knowledge /
      custom       → RAG scoped to the agent's entire knowledge base.
                     Strictly context-bound — refuses to answer outside context.
    """
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == user_id,
    ).first()

    if not agent:
        raise Exception("Agent not found")

    history = get_chat_history(db, chat_id)
    history_block = f"\n\nConversation so far:\n{history}" if history else ""

    # ─────────────────────────────────────────────────────────────────────────
    # GENERAL AGENT
    # Plain conversational LLM. No pages, no RAG. Keep answers concise to
    # save tokens — this agent is for quick Q&A, not deep research.
    # ─────────────────────────────────────────────────────────────────────────
    if agent.type == "general":
        prompt = (
            "You are a concise, helpful assistant. "
            "Answer the user's question directly and briefly. "
            "Keep your reply to 2-4 sentences unless the question genuinely requires more. "
            "Do not add filler, preamble, or unnecessary caveats."
            f"{history_block}\n\n"
            f"User: {question}\n"
            "Assistant:"
        )
        for chunk in model.stream(prompt):
            yield chunk.content
        return

    # ─────────────────────────────────────────────────────────────────────────
    # INBOX AGENT (system_inbox)
    # One chat = one saved page. Retrieval is STRICTLY scoped to that single
    # page. The agent must not pull from other pages or use general knowledge.
    # If the answer is not in the page, say so explicitly.
    # ─────────────────────────────────────────────────────────────────────────
    if agent.type == "system_inbox":
        # Determine which page this chat is about
        page = get_page_for_chat(db, chat_id)

        if not page:
            # Chat not yet linked to a page — this shouldn't happen in normal
            # flow (inbox chats are created with a page_id), but handle it.
            yield (
                "This Inbox chat is not linked to a saved page. "
                "Please save a page first and start the chat from that page."
            )
            return

        # Build a retriever scoped ONLY to this one page
        retriever = build_retriever(user_id, agent_id, page_id=page.id)
        rewritten = rewrite_query(model, history, question)
        print(f"[inbox] Rewritten query: {rewritten}")

        docs = retriever.invoke(rewritten)

        if not docs:
            yield (
                f"I could not find relevant information on this page "
                f"({page.title or page.url}) to answer your question. "
                "Please rephrase or ask something directly about the page content."
            )
            return

        context = "\n\n---\n\n".join(d.page_content for d in docs)

        prompt = (
            f"You are a focused assistant for a single web page.\n"
            f"Page: {page.title or page.url}\n\n"
            "STRICT RULES:\n"
            "1. Answer ONLY using the page content provided below.\n"
            "2. Do NOT use any knowledge from outside this page.\n"
            "3. If the answer is not in the page content, say exactly: "
            "\"I cannot find that information on this page.\"\n"
            "4. Do not speculate, infer, or fill gaps with general knowledge.\n"
            "5. Quote or reference specific parts of the page when possible.\n\n"
            f"Page content:\n{context}"
            f"{history_block}\n\n"
            f"User: {question}\n"
            "Assistant:"
        )

        for chunk in model.stream(prompt):
            yield chunk.content
        return

    # ─────────────────────────────────────────────────────────────────────────
    # KNOWLEDGE / CUSTOM AGENT
    # RAG over the agent's full saved knowledge base. Strictly context-bound —
    # the agent must NOT answer from general knowledge. If the context does not
    # contain enough information, it must say so and stop.
    # ─────────────────────────────────────────────────────────────────────────
    rewritten = rewrite_query(model, history, question)
    print(f"[{agent.type}] Rewritten query: {rewritten}")

    retriever = build_retriever(user_id, agent_id, page_id)
    docs = retriever.invoke(rewritten)

    if not docs:
        yield (
            "I could not find any relevant information in your saved knowledge base "
            "to answer this question. "
            "Try saving more pages related to this topic, or switch to the General agent "
            "for questions not covered by your research."
        )
        return

    context = "\n\n---\n\n".join(d.page_content for d in docs)
    # Include source URLs for transparency
    sources = list({d.metadata.get("url", "") for d in docs if d.metadata.get("url")})
    sources_block = "\n".join(f"- {s}" for s in sources) if sources else ""

    prompt = (
        "You are a research assistant with access to a curated knowledge base.\n\n"
        "STRICT RULES:\n"
        "1. Answer ONLY using the knowledge base excerpts provided below.\n"
        "2. Do NOT use any knowledge from outside the provided excerpts.\n"
        "3. If the excerpts do not contain enough information to answer fully, "
        "say exactly: \"My knowledge base does not contain enough information about this. "
        "Consider saving more relevant pages.\"\n"
        "4. Do not speculate or fill gaps with general knowledge.\n"
        "5. When appropriate, reference which source the information comes from.\n\n"
        f"Knowledge base excerpts:\n{context}\n\n"
        + (f"Sources:\n{sources_block}\n\n" if sources_block else "")
        + f"{history_block}\n\n"
        f"User: {question}\n"
        "Assistant:"
    )

    for chunk in model.stream(prompt):
        yield chunk.content
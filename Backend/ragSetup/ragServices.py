from ragSetup.retrieverFactory import build_retriever
from ragSetup.ragArchitecture import model
 
from models.agents import Agent
from models.message import Message
 
 
def get_chat_history(db, chat_id: str, limit: int = 10) -> str:
    """Return the last `limit` messages as a formatted conversation string."""
    messages = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )
    messages.reverse()
 
    history = []
    for m in messages:
        if m.role == "user":
            history.append(f"User: {m.content}")
        elif m.role == "assistant":
            history.append(f"Assistant: {m.content}")
 
    return "\n".join(history)
 
 
def rewrite_query(model, history: str, question: str) -> str:
    """
    Rewrite the user question into a self-contained search query so
    follow-up questions ("what about that?") resolve correctly in Chroma.
    """
    prompt = f"""You are a search query rewriter.
Rewrite the user's question into a self-contained research query that can be understood without the conversation history.
Return only the rewritten query — no explanation, no preamble.
 
Conversation history:
{history}
 
User question: {question}
 
Standalone query:"""
 
    response = model.invoke(prompt)
    return response.content.strip()
 
 
def generate_chat_title(agent_type: str, first_message: str) -> str:
    """
    Generate a short descriptive title (3-6 words) from the first user message.
    Falls back to a truncated version of the message if the LLM call fails.
    """
    try:
        prompt = f"""Generate a short, descriptive chat title (3-6 words) based on this first message.
Return only the title — no quotes, no punctuation at the end.
 
Message: {first_message}
 
Title:"""
        response = model.invoke(prompt)
        title = response.content.strip().strip('"').strip("'")
        return title if title else first_message[:60]
    except Exception:
        return first_message[:60] or "New Chat"
 
 
def stream_generate_response(
    db,
    user_id: str,
    agent_id: str,
    chat_id: str,
    question: str,
    page_id: str | None = None,
):
    """
    Generator that yields response tokens.
    Routes to plain LLM chat (general agent) or RAG pipeline (knowledge agents).
    """
    # FIX: check agent exists BEFORE accessing agent.type —
    # original code accessed agent.type then checked `if not agent`,
    # which crashed with AttributeError when agent was None.
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == user_id,
    ).first()
 
    if not agent:
        raise Exception("Agent not found")
 
    history = get_chat_history(db, chat_id)
 
    # -------------------------------------------------------
    # General agent — plain conversational LLM, no RAG
    # -------------------------------------------------------
    if agent.type == "general":
        history_block = f"\nConversation history:\n{history}\n" if history else ""
        prompt = f"""You are a helpful assistant.{history_block}
User: {question}
Assistant:"""
 
        for chunk in model.stream(prompt):
            yield chunk.content
 
        return
 
    # -------------------------------------------------------
    # Knowledge / custom agent — RAG pipeline
    # -------------------------------------------------------
    rewritten = rewrite_query(model, history, question)
 
    # FIX: was `print(rewrite_query)` — printed the function object, not the result
    print(f"Rewritten query: {rewritten}")
 
    retriever = build_retriever(user_id, agent_id, page_id)
    docs = retriever.invoke(rewritten)
 
    if docs:
        context = "\n\n---\n\n".join(d.page_content for d in docs)
        context_block = f"Relevant context from your knowledge base:\n\n{context}"
    else:
        context_block = (
            "No relevant context was found in the knowledge base for this query. "
            "Answer using general knowledge and note that no saved pages matched."
        )
 
    history_block = f"\nConversation history:\n{history}\n" if history else ""
 
    prompt = f"""You are a knowledgeable research assistant. Answer the user's question using the provided context.
If the context is insufficient, say so and answer from general knowledge.
 
{context_block}
{history_block}
User: {question}
Assistant:"""
 
    for chunk in model.stream(prompt):
        yield chunk.content
from ragSetup.retrieverFactory import build_retriever
from ragSetup.ragArchitecture import model

from models.agents import Agent
from models.message import Message


def get_chat_history(db, chat_id, limit=10):

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


def rewrite_query(model, history, question):

    prompt = f"""
    Rewrite the user's question into a standalone research query.

    Conversation history:
    {history}

    Question:
    {question}

    Standalone query:
    """

    response = model.invoke(prompt)

    return response.content.strip()


def stream_generate_response(
    db,
    user_id,
    agent_id,
    chat_id,
    question,
    page_id=None
):

    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == user_id
    ).first()

    if not agent:
        raise Exception("Agent not found")


    history = get_chat_history(db, chat_id)


    if agent.type == "general":

        prompt = f"""
        Conversation history:
        {history}

        Question:
        {question}
        """

        for chunk in model.stream(prompt):
            yield chunk.content

        return


    rewritten_query = rewrite_query(
        model,
        history,
        question
    )


    retriever = build_retriever(
        user_id,
        agent_id,
        page_id
    )

    docs = retriever.invoke(rewritten_query)

    context = "\n\n".join(d.page_content for d in docs)


    prompt = f"""
    Conversation history:
    {history}

    Research context:
    {context}

    Question:
    {question}
    """


    for chunk in model.stream(prompt):
        yield chunk.content
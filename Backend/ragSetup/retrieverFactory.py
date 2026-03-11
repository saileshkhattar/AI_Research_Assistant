from langchain_community.vectorstores import Chroma
from ragSetup.ragArchitecture import embeddings, PERSIST_DIR


def get_vectorstore():

    return Chroma(
        collection_name="web_pages",
        embedding_function=embeddings,
        persist_directory=PERSIST_DIR
    )


def build_retriever(user_id, agent_id, page_id=None):

    vectorstore = get_vectorstore()

    # Chroma requires multiple conditions wrapped in $and
    # and each value must use an explicit operator like $eq
    conditions = [
        {"user_id": {"$eq": user_id}},
        {"agent_id": {"$eq": agent_id}},
    ]

    if page_id:
        conditions.append({"page_id": {"$eq": page_id}})

    # If only one condition, no need for $and wrapper
    chroma_filter = {"$and": conditions} if len(conditions) > 1 else conditions[0]

    retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 5,
            "filter": chroma_filter
        }
    )

    return retriever
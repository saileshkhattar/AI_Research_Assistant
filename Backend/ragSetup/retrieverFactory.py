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

    filter_dict = {
        "user_id": user_id,
        "agent_id": agent_id
    }

    if page_id:
        filter_dict["page_id"] = page_id

    retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 5,
            "filter": filter_dict
        }
    )

    return retriever
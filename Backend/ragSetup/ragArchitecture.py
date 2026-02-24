from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_classic.retrievers import MultiQueryRetriever
from langchain_core.runnables import RunnableLambda
from langchain_core.prompts import ChatPromptTemplate

from dotenv import load_dotenv
import os


load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")



model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    api_key=GOOGLE_API_KEY
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    version="v1",
    google_api_key=GOOGLE_API_KEY
)

PERSIST_DIR = "chroma_db"

vectorstore = Chroma(
    collection_name="web_pages",
    embedding_function=embeddings,
    persist_directory=PERSIST_DIR
)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)

base_retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 4}
)

multiquery = MultiQueryRetriever.from_llm(
    retriever=base_retriever,
    llm=model
)

combine_docs = RunnableLambda(
    lambda docs: "\n\n".join(d.page_content for d in docs) if docs else "No context found"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer using only stored research memory."),
    ("system", "Context:\n{context}"),
    ("user", "{question}")
])

rag_chain = (
    {
        "context": multiquery | combine_docs,
        "question": lambda x: x["question"]
    }
    | prompt
    | model
)
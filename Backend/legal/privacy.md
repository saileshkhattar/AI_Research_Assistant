# TabChat Privacy Policy

**Version:** 1.1
**Effective date:** [FILL IN AT DEPLOYMENT]

TabChat is a Chrome extension and companion web app that lets you save pages you're browsing and ask questions about them, grounded in an AI model. This policy explains what data TabChat collects, why, and what you can do about it.

TabChat is developed and operated by an individual developer, not a company. You can reach the developer at: **[YOUR CONTACT EMAIL]**.

---

## 1. What we collect

**Account information**
When you sign in with Google, we receive your Google account identifier and verified email address. We use these only to create and recognize your account — we don't request or receive anything else from your Google profile.

**Content you submit**
- **Saved pages**: when you click "Save Page," we store the page's URL and title, and the page's text content is split into chunks and stored so it can be retrieved and used to answer your questions later.
- **Chat messages**: your questions and the AI's responses are stored so your chat history is available when you return.

Nothing is sent anywhere unless you take an explicit action — opening the extension does not, by itself, transmit any page content.

**Your AI provider key**
TabChat asks you to provide your own Groq API key to power chat responses. This key is encrypted (via AWS KMS) before being stored, and is only decrypted in server memory, briefly, to make a request on your behalf. It is never sent back to your browser or displayed after entry. A short-lived cache (a few minutes) is used to avoid re-decrypting it on every request; this cache is purged immediately if you delete your account.

**Technical and security data**
- A session token is issued after login and stored only in your browser's temporary extension storage; it expires after 7 days.
- Your IP address is recorded at the time you accept these terms (for our consent record) and is used transiently for rate-limiting abusive traffic. It is not used to track your activity otherwise.

## 2. How we use your data

- To operate the core feature: retrieving relevant saved content and generating answers to your questions.
- To maintain your account, session, and saved history across visits.
- To enforce rate limits and prevent abuse of the service.
- To maintain a record that you accepted these terms, in case it's ever needed.

We do not use your data for advertising, and we do not sell your data.

## 3. Who else sees your data

Running TabChat requires sending parts of your data to a small number of service providers. We don't control their systems directly, but we've chosen providers based on what's needed to run the feature, not to extract more data than necessary.

| Provider | What they receive | Why |
|---|---|---|
| Google | Your OAuth token, for verification only | Sign-in |
| Groq | The text of your questions and retrieved page content, using **your own** API key | Generating chat responses |
| Hugging Face | The text of pages you save (and your questions, for matching) | Computing embeddings used to find relevant content |
| AWS (KMS) | Your encrypted API key material | Encryption/decryption of your stored key |
| Chroma Cloud (AWS us-east-1) | Text chunks from pages you save and associated retrieval metadata | Persistent vector search for your saved research |
| Our hosting provider (Render/Railway) and their Redis add-on | All of the above, since this is where our servers and databases run | Hosting the application |

We do not otherwise share, rent, or sell your data to third parties. Each of these providers has its own privacy practices governing how they handle data sent to them, which are outside our control — we encourage you to review Groq's and Hugging Face's own policies if you want detail on their handling of API requests.

## 4. Where your data is processed

Our infrastructure runs on commercial cloud hosting (Render/Railway) and third-party APIs (Google, Groq, Hugging Face, AWS, and Chroma Cloud). Chroma Cloud stores the vectorized index of saved-page text in AWS's **us-east-1 (United States)** region. These providers may otherwise process data in the United States or other countries depending on their own infrastructure. By using TabChat, you understand your data may be processed outside your own country.

## 5. How long we keep your data

We retain your account, saved pages, and chat history for as long as your account exists — that is, indefinitely, until you delete it. There is no automatic expiration.

You can permanently delete your account and all associated data (saved pages, chat history, stored key, and consent record) at any time from within the app. Deletion is immediate and cannot be undone.

## 6. Your responsibilities — please don't save sensitive data

TabChat is a general-purpose research tool, not a system designed or certified to handle sensitive categories of information — including health/medical records, financial account details, government identification numbers, or similarly sensitive personal data. Please do not use "Save Page" or the chat on pages or content containing this kind of information, whether your own or someone else's. You are responsible for the content you choose to submit.

## 7. Your rights

Depending on where you live, you may have rights to access, correct, or delete your personal data, or to object to or restrict its processing. In practice, for this service:
- **Access/export**: contact us at the email above.
- **Deletion**: use the in-app "Delete Account" feature for immediate, complete deletion, or contact us if you have trouble.
- **Withdrawing consent**: since your use of TabChat is based on your consent to this policy, withdrawing consent means deleting your account, as we can't otherwise operate the service without processing this data.

## 8. Children

TabChat is not directed at, and is not intended for use by, children under 13 (or the minimum age required by your local law). We do not knowingly collect data from children.

## 9. Security

We use encryption for stored API keys (AWS KMS), HTTPS for data in transit, and access controls that derive your identity only from a verified session — never from data your browser claims about itself. No system is perfectly secure, and we can't guarantee absolute security, but we've designed the system to minimize what's exposed if something goes wrong.

## 10. Changes to this policy

If we make material changes to this policy, we'll update the version number above and require you to review and re-accept it before continuing to use TabChat.

## 11. Contact

Questions about this policy or your data: **[YOUR CONTACT EMAIL]**

import { handleGeminiChat } from '../server/geminiChat.ts';

export default { fetch: (request: Request) => handleGeminiChat(request) };

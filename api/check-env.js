export default function handler(request, response) {
  return response.status(200).json({
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    keyStartsCorrectly: process.env.OPENAI_API_KEY
      ? process.env.OPENAI_API_KEY.startsWith("sk-")
      : false,
  });
}
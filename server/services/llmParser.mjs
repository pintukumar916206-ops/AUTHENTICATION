import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const EXTRACT_PROMPT = `
You are a highly advanced web scraping fallback system.
Your task is to extract product details from the raw HTML/text of an e-commerce page.
Return the data strictly as a valid JSON object matching this schema. If a value is missing, use empty string or 0.
DO NOT include markdown wrappers like \`\`\`json. Return RAW JSON.

{
  "title": "Full product name",
  "price": 1099,
  "originalPrice": 1500,
  "discount": 20,
  "rating": 4.5,
  "reviewCount": 1500,
  "sellerName": "Merchant Name",
  "sellerRating": 4.0,
  "availability": "In Stock or Out of Stock",
  "description": "Short description or feature list"
}

Extract the data from the following raw web text/HTML:
`;

export async function extractProductDataLLM(htmlContent) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[LLM-PARSER] Skipping fallback: GEMINI_API_KEY not configured.");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    

    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    let contentToParse = bodyMatch ? bodyMatch[1] : htmlContent;
    

    contentToParse = contentToParse.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    contentToParse = contentToParse.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    contentToParse = contentToParse.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');


    contentToParse = contentToParse.substring(0, 60000);

    console.log("[LLM-PARSER] Initiating Gemini vision/text fallback parser...");
    const result = await model.generateContent(`${EXTRACT_PROMPT}\n\nCONTENT:\n${contentToParse}`);
    const responseText = result.response.text();
    

    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(cleanedText);
    

    return {
      title: parsedData.title || "",
      price: Number(parsedData.price) || 0,
      originalPrice: Number(parsedData.originalPrice) || 0,
      discount: Number(parsedData.discount) || 0,
      rating: Number(parsedData.rating) || 0,
      reviewCount: Number(parsedData.reviewCount) || 0,
      sellerName: parsedData.sellerName || "",
      sellerRating: Number(parsedData.sellerRating) || 0,
      availability: parsedData.availability || "",
      description: parsedData.description || ""
    };
  } catch (error) {
    console.error("[LLM-PARSER] Fallback failed:", error.message);
    return null;
  }
}

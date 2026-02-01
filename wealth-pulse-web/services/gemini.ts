
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AINewsItem, AIHotspot, ChartInterpretation, PortfolioAnalysis, Holding, DetectedRecord } from "../types";
import { Language } from "../i18n";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
      const isServerError = error?.status >= 500;
      if ((isRateLimit || isServerError) && retries < maxRetries) {
        retries++;
        const delay = initialDelay * Math.pow(2, retries - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

export const analyzeBrokerScreenshot = async (base64Image: string, lang: Language = 'zh'): Promise<DetectedRecord[]> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: `You are a professional financial data auditor. Extract trade records from this screenshot. 
            Respond in ${lang === 'zh' ? 'Chinese' : 'English'}.
            Must extract: symbol, type (BUY/SELL), price, quantity, date, confidence.
            Return a JSON array.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["BUY", "SELL"] },
              price: { type: Type.NUMBER },
              quantity: { type: Type.NUMBER },
              date: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            }
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

export const getPortfolioAnalysis = async (holdings: Holding[], cash: number, lang: Language = 'zh'): Promise<PortfolioAnalysis> => {
  return withRetry(async () => {
    const holdingsStr = holdings.map(h => `${h.symbol}: Qty ${h.quantity}, AvgCost ${h.avgPrice}`).join('; ');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a top private banker. Analyze this portfolio:
        Holdings: ${holdingsStr}
        Cash: ¥${cash}
        Language for analysis: ${lang === 'zh' ? 'Chinese' : 'English'}.
        Provide risk, diversity, efficiency scores and summaries.
        Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER },
            diversityScore: { type: Type.NUMBER },
            efficiencyScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["riskScore", "diversityScore", "efficiencyScore", "summary", "warnings", "suggestions"]
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

export const getTradeScore = async (transaction: Transaction, context: string, lang: Language = 'zh'): Promise<{ score: number, rationale: string }> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a senior trader. Score this trade (0-100) and give rationale in ${lang === 'zh' ? 'Chinese' : 'English'}:
        Symbol: ${transaction.symbol}; Type: ${transaction.type}; Price: ${transaction.price}; Context: ${context}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            rationale: { type: Type.STRING }
          },
          required: ["score", "rationale"]
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

export const getMarketOutlook = async (symbols: string[], lang: Language = 'zh'): Promise<string> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `As a market analyst, based on these symbols: ${symbols.join(', ')}, give a brief outlook (50 words max) in ${lang === 'zh' ? 'Chinese' : 'English'}.`,
    });
    return response.text || "AI Engine busy.";
  });
};

export const interpretKLineImage = async (base64Image: string, lang: Language = 'zh'): Promise<ChartInterpretation> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: `Analyze this K-Line chart in ${lang === 'zh' ? 'Chinese' : 'English'}. Include: patterns, support, resistance, take profit, stop loss, and strategic advice. Return JSON.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            support: { type: Type.NUMBER },
            resistance: { type: Type.NUMBER },
            takeProfit: { type: Type.NUMBER },
            stopLoss: { type: Type.NUMBER },
            advice: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

export const interpretChart = async (symbol: string, history: {time: string, price: number}[], lang: Language = 'zh'): Promise<ChartInterpretation> => {
  return withRetry(async () => {
    const dataStr = history.map(h => `${h.time}: ${h.price}`).join(', ');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze chart for ${symbol}: ${dataStr}. Provide insights in ${lang === 'zh' ? 'Chinese' : 'English'}. Return JSON with patterns, support, resistance, take profit, stop loss, advice.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            support: { type: Type.NUMBER },
            resistance: { type: Type.NUMBER },
            takeProfit: { type: Type.NUMBER },
            stopLoss: { type: Type.NUMBER },
            advice: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

export const getAINews = async (lang: Language = 'zh'): Promise<AINewsItem[]> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide 3 global financial news items in ${lang === 'zh' ? 'Chinese' : 'English'}. Include title, summary, impact, and time. Return JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              impact: { type: Type.STRING },
              time: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

export const getAIHotspots = async (lang: Language = 'zh'): Promise<AIHotspot[]> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide 3 hot market topics/sectors in ${lang === 'zh' ? 'Chinese' : 'English'}. Include topic, relevance (0-1), and description. Return JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              relevance: { type: Type.NUMBER },
              description: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

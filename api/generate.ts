import { GoogleGenAI, Type } from '@google/genai';

// This is required for Vercel to correctly handle the serverless function.
export const config = {
  runtime: 'edge',
};

// Define a type for the request body to ensure type safety.
type ApiRequestBody = {
  type: 'suggestions' | 'bulk-edit' | 'question';
  context: any;
};

// Vercel will expose environment variables to this serverless function.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Safely extracts a JSON object from a string.
 * It first tries to find a JSON code block, then falls back to parsing the entire string.
 * @param text The string to extract JSON from.
 * @returns The parsed JSON object, or null if parsing fails.
 */
const extractJson = (text: string): any | null => {
  const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(codeBlockRegex);
  const jsonString = match ? match[1] : text;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    // This can happen if the model responds with a refusal or non-JSON text.
    console.error('Failed to parse JSON:', error);
    console.log('Original text from AI:', text);
    return null;
  }
};


export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { type, context } = (await req.json()) as ApiRequestBody;

    let response;

    switch (type) {
      case 'suggestions': {
        const { currentValue } = context;
        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Você é um assistente criativo para um editor de dados de jogos. O usuário está editando um nome. Dado o nome atual "${currentValue}", forneça 5 sugestões criativas e alternativas. As sugestões devem ser concisas.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestions: {
                  type: Type.ARRAY,
                  description: 'Uma lista de 5 nomes alternativos.',
                  items: { type: Type.STRING },
                },
              },
              required: ['suggestions'],
            },
          },
        });
        
        const parsedResponse = extractJson(result.text);
        if (parsedResponse && parsedResponse.suggestions) {
          response = parsedResponse;
        } else {
          // If parsing fails or the expected key is missing, return an empty array.
          // This prevents the frontend from crashing.
          response = { suggestions: [] };
        }
        break;
      }
      
      case 'bulk-edit': {
        const { currentFilterName, targetColumn, keyColumn, dataForPrompt, prompt } = context;
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Você é um assistente de IA encarregado de editar em massa uma coluna em um arquivo CSV.
            O usuário está visualizando um conjunto de dados filtrado por: "${currentFilterName}". As edições devem ser aplicadas a este subconjunto de dados.
            A coluna que o usuário deseja editar é: "${targetColumn}".
            A coluna de chave primária é "${keyColumn}".
            Aqui estão até 20 linhas dos dados para contexto (apenas a chave e a coluna de destino):
            ${JSON.stringify(dataForPrompt)}
    
            Instrução do usuário: "${prompt}"
    
            Com base na instrução do usuário, gere novos valores para a coluna "${targetColumn}" para todas as linhas relevantes nos dados fornecidos. Se necessário, use seu conhecimento e pesquise na internet por informações precisas (por exemplo, nomes de jogadores de um ano específico, capitais corretas, etc.).
    
            Sua saída DEVE ser um objeto JSON com uma única chave "edits". O valor dessa chave deve ser um array de objetos. Cada objeto deve conter a 'key' (da coluna "${keyColumn}") e o 'newValue' para a coluna "${targetColumn}".
            Exemplo de formato: { "edits": [{ "key": "algum_id_1", "newValue": "novo valor" }, { "key": "algum_id_2", "newValue": "outro novo valor" }] }
            
            Inclua apenas as linhas que precisam ser alteradas. Se nenhuma alteração for necessária, retorne um objeto com um array "edits" vazio: { "edits": [] }`,
            config: {
              tools: [{googleSearch: {}}],
            },
        });
        const parsedResponse = extractJson(result.text);
        if (parsedResponse && parsedResponse.edits) {
          response = parsedResponse;
        } else {
          // Fallback if the AI response is not the expected JSON format.
          response = { edits: [] };
        }
        break;
      }
      
      case 'question': {
        const { fileName, headers, currentFilterName, dataForPrompt, prompt } = context;
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Você é um assistente de análise de dados. Com base no contexto do arquivo CSV e nos dados, responda à pergunta do usuário.
            Nome do arquivo: "${fileName}"
            Cabeçalhos: ${headers.join(', ')}
            Filtro ativo: "${currentFilterName}"
            Primeiras 20 linhas de dados (formato JSON):
            ${dataForPrompt.join('\n')}
    
            Pergunta do usuário: "${prompt}"
    
            Forneça uma resposta concisa e direta.`,
        });
        response = { text: result.text };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid request type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An internal server error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

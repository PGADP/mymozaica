/**
 * MISTRAL AI SERVICE
 * Service singleton pour gérer les appels aux modèles Mistral AI
 *
 * Modèles utilisés :
 * - Mistral Large : Conversations, planification, rédaction créative
 * - Mistral Small : Extraction de données, analyses rapides
 */

type MistralModel = 'mistral-large-latest' | 'mistral-small-latest';

interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class MistralService {
  private static instance: MistralService;
  private apiKey: string;
  private baseUrl: string = 'https://api.mistral.ai/v1/chat/completions';

  private constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ MISTRAL_API_KEY non configurée');
    }
  }

  /**
   * Obtenir l'instance singleton du service
   */
  public static getInstance(): MistralService {
    if (!MistralService.instance) {
      MistralService.instance = new MistralService();
    }
    return MistralService.instance;
  }

  /**
   * Appel générique à l'API Mistral
   */
  private async callMistral(
    messages: MistralMessage[],
    model: MistralModel,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.statusText}`);
      }

      const data: MistralResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Erreur lors de l\'appel Mistral:', error);
      throw error;
    }
  }

  /**
   * INTERVIEWER : Conversation avec Mistral Large
   * Utilisé pour générer des questions conversationnelles riches
   */
  public async askInterviewer(
    userMessage: string,
    conversationHistory: MistralMessage[] = []
  ): Promise<string> {
    const systemPrompt: MistralMessage = {
      role: 'system',
      content: `Tu es un interviewer bienveillant qui aide les gens à raconter leur histoire de vie.
Pose des questions ouvertes et empathiques pour encourager le partage de souvenirs.
Adapte-toi au contexte et rebondis sur ce qui vient d'être dit.`,
    };

    const messages: MistralMessage[] = [
      systemPrompt,
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    return this.callMistral(messages, 'mistral-large-latest', 0.7, 500);
  }

  /**
   * ANALYST : Extraction avec Mistral Small
   * Utilisé pour extraire des données structurées depuis les conversations
   */
  public async extractData(conversationText: string): Promise<string> {
    const systemPrompt: MistralMessage = {
      role: 'system',
      content: `Tu es un analyste de données. Extrais les informations suivantes du texte :
- Dates (année, mois, jour si disponible)
- Lieux (villes, pays, adresses)
- Personnes (noms, relations)
- Événements clés
- Émotions exprimées

Retourne un JSON structuré.`,
    };

    const messages: MistralMessage[] = [
      systemPrompt,
      { role: 'user', content: conversationText },
    ];

    return this.callMistral(messages, 'mistral-small-latest', 0.3, 1500);
  }

  /**
   * ARCHITECT : Planification avec Mistral Large
   * Crée la structure du livre biographique
   */
  public async createBookPlan(extractedData: string): Promise<string> {
    const systemPrompt: MistralMessage = {
      role: 'system',
      content: `Tu es un architecte de récits biographiques.
À partir des données extraites, crée un plan de livre cohérent avec :
- Des chapitres thématiques ou chronologiques
- Des arcs narratifs
- Des transitions fluides

Retourne un JSON structuré du plan.`,
    };

    const messages: MistralMessage[] = [
      systemPrompt,
      { role: 'user', content: extractedData },
    ];

    return this.callMistral(messages, 'mistral-large-latest', 0.7, 2000);
  }

  /**
   * WRITER : Rédaction avec Mistral Large
   * Rédige les chapitres du livre
   */
  public async writeChapter(
    chapterPlan: string,
    style: string = 'littéraire'
  ): Promise<string> {
    const systemPrompt: MistralMessage = {
      role: 'system',
      content: `Tu es un écrivain biographique talentueux.
Rédige un chapitre captivant basé sur le plan fourni.
Style : ${style}
Ton : authentique, émotionnel, respectueux.`,
    };

    const messages: MistralMessage[] = [
      systemPrompt,
      { role: 'user', content: chapterPlan },
    ];

    return this.callMistral(messages, 'mistral-large-latest', 0.8, 3000);
  }

  /**
   * REVIEWER : Relecture avec Mistral Large
   * Corrige et améliore les chapitres
   */
  public async reviewChapter(chapterText: string): Promise<string> {
    const systemPrompt: MistralMessage = {
      role: 'system',
      content: `Tu es un relecteur professionnel.
Analyse le chapitre et :
1. Corrige les fautes d'orthographe et grammaire
2. Améliore la fluidité et le style
3. Vérifie la cohérence narrative
4. Suggère des améliorations

Retourne le texte corrigé et un rapport de modifications.`,
    };

    const messages: MistralMessage[] = [
      systemPrompt,
      { role: 'user', content: chapterText },
    ];

    return this.callMistral(messages, 'mistral-large-latest', 0.5, 3500);
  }
}

export default MistralService;

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OralQuizQuestion } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface ExtractedQuizData {
  title: string;
  description: string;
  questions: OralQuizQuestion[];
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Use OpenAI to analyze the text and extract quiz data
    const systemPrompt = `You are an AI assistant specialized in creating oral interview quiz questions from text content. 
    Extract relevant questions and evaluation criteria from the provided text.
    
    Return a JSON object with this exact structure:
    {
      "title": "A concise, descriptive title for the quiz (in French)",
      "description": "A brief description of what this quiz covers (in French)",
      "questions": [
        {
          "question": "The question to ask (in French)",
          "criteria": ["Evaluation criterion 1", "Evaluation criterion 2", ...] (in French)
        }
      ]
    }
    
    Guidelines:
    - Extract actual questions if they exist in the text, or create relevant questions based on the content
    - For each question, identify 2-5 specific evaluation criteria that would help assess the answer
    - Questions should be open-ended and suitable for oral interviews
    - Evaluation criteria should be specific, measurable points that an interviewer can check
    - All output should be in French
    - If the text seems to be about a technical topic, create technical interview questions
    - If it's about soft skills, create behavioral questions
    - The title should be descriptive but concise (e.g., "Entretien React.js", "Questions Comportementales")`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract quiz questions and evaluation criteria from this text:\n\n${text}` }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const extractedData = JSON.parse(completion.choices[0].message.content!) as ExtractedQuizData;
    
    // Validate the extracted data
    if (!extractedData.title || !extractedData.questions || extractedData.questions.length === 0) {
      throw new Error('Invalid data extracted from text');
    }

    // Ensure each question has at least one criterion
    extractedData.questions = extractedData.questions.map(q => ({
      ...q,
      criteria: q.criteria && q.criteria.length > 0 ? q.criteria : ['Réponse complète et structurée']
    }));

    return NextResponse.json(extractedData);

  } catch (error) {
    console.error('Error in intelligent import:', error);
    return NextResponse.json(
      { error: 'Failed to analyze text' },
      { status: 500 }
    );
  }
}

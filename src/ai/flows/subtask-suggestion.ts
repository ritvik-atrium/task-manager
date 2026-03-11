'use server';
/**
 * @fileOverview An AI agent that suggests subtasks for a given primary task.
 *
 * - suggestSubtasks - A function that handles the subtask suggestion process.
 * - SubtaskSuggestionInput - The input type for the suggestSubtasks function.
 * - SubtaskSuggestionOutput - The return type for the suggestSubtasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SubtaskSuggestionInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The description of the primary task for which subtasks are needed.'),
});
export type SubtaskSuggestionInput = z.infer<typeof SubtaskSuggestionInputSchema>;

const SubtaskSuggestionOutputSchema = z.object({
  subtasks: z.array(z.string()).describe('A list of suggested subtasks.'),
});
export type SubtaskSuggestionOutput = z.infer<typeof SubtaskSuggestionOutputSchema>;

export async function suggestSubtasks(input: SubtaskSuggestionInput): Promise<SubtaskSuggestionOutput> {
  return subtaskSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'subtaskSuggestionPrompt',
  input: {schema: SubtaskSuggestionInputSchema},
  output: {schema: SubtaskSuggestionOutputSchema},
  prompt: `You are an expert project manager and assistant who helps users break down complex tasks into manageable subtasks.

Given the primary task description, generate a list of actionable and concise subtasks that would be necessary to complete the primary task. Each subtask should be a distinct, achievable step.

Primary Task: {{{taskDescription}}}`,
});

const subtaskSuggestionFlow = ai.defineFlow(
  {
    name: 'subtaskSuggestionFlow',
    inputSchema: SubtaskSuggestionInputSchema,
    outputSchema: SubtaskSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
